import 'dart:async';
import 'api_client.dart';
import 'api_configuration.dart';
import 'api_transport.dart';
import 'in_memory_cookie_store.dart';

enum CookieLifecycleBoundary { ready, locallyInvalidated }

class CookieLifecycleInvalidated implements Exception {
  const CookieLifecycleInvalidated();
  @override
  String toString() => 'Cookie lifecycle request invalidated';
}

class CoordinatedCookieRequest {
  const CoordinatedCookieRequest._(
    this.generation,
    this.sequence,
    this.snapshot,
  );
  final int generation;
  final int sequence;
  final CookieRequestSnapshot snapshot;
  @override
  String toString() => 'Coordinated cookie request';
}

/// A single-flight scheduler with synchronous state commits, not a network lock.
class CookieRequestCoordinator {
  CookieRequestCoordinator({
    required ApiConfiguration configuration,
    required CookieClock clock,
    this.operationTimeout = const Duration(seconds: 30),
  }) : _clock = clock,
       _store = InMemoryCookieStore(
         configuration: configuration,
         clock: clock,
       ) {
    if (operationTimeout <= Duration.zero) {
      throw const ApiConfigurationException();
    }
  }
  final CookieClock _clock;
  final Duration operationTimeout;
  final Object _zoneKey = Object();
  final Object _generationZoneKey = Object();
  InMemoryCookieStore _store;
  Future<void> _tail = Future.value();
  CoordinatedCookieRequest? _active;
  int _generation = 0;
  int _sequence = 0;
  CookieLifecycleBoundary _boundary = CookieLifecycleBoundary.ready;
  bool _metadataCommitted = false;
  int get generation => _generation;
  CookieLifecycleBoundary get boundary => _boundary;

  Future<T> coordinate<T>(
    String path,
    Future<T> Function(CoordinatedCookieRequest) operation, {
    Map<String, String>? query,
    int? expectedGeneration,
  }) async {
    final workflowGeneration =
        expectedGeneration ?? Zone.current[_generationZoneKey] as int?;
    if (workflowGeneration != null && workflowGeneration != _generation) {
      throw const CookieLifecycleInvalidated();
    }
    if (Zone.current[_zoneKey] == this) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    final admittedGeneration = _generation;
    final previous = _tail;
    final release = Completer<void>();
    _tail = release.future;
    try {
      await previous;
      if (admittedGeneration != _generation ||
          _boundary != CookieLifecycleBoundary.ready) {
        throw const CookieLifecycleInvalidated();
      }
      final target = _store.configuration.endpoint(path, query);
      late final CoordinatedCookieRequest request;
      request = CoordinatedCookieRequest._(
        _generation,
        ++_sequence,
        _store.snapshot(target, isActive: () => _eligible(request)),
      );
      _active = request;
      _metadataCommitted = false;
      final result = await runZoned(
        () => operation(request),
        zoneValues: {_zoneKey: this, _generationZoneKey: admittedGeneration},
      ).timeout(operationTimeout);
      if (!_eligible(request)) throw const CookieLifecycleInvalidated();
      return result;
    } on CookieLifecycleInvalidated {
      rethrow;
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw const ApiException(ApiFailure.timeout);
    } catch (_) {
      throw const ApiException(ApiFailure.invalidResponse);
    } finally {
      // A queued obsolete request must not clear another request's active ticket.
      if (_active?.generation == admittedGeneration) _active = null;
      release.complete();
    }
  }

  bool _eligible(CoordinatedCookieRequest request) =>
      identical(_active, request) &&
      request.generation == _generation &&
      _boundary == CookieLifecycleBoundary.ready;

  bool acceptMetadata(
    CoordinatedCookieRequest request,
    ApiResponseMetadata metadata,
  ) {
    if (!_eligible(request) || _metadataCommitted) return false;
    if (metadata.requestUri != request.snapshot.destination) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    _metadataCommitted = true;
    _store.applyHeaders(
      metadata.toResponse().headerValues('set-cookie'),
      environment: request.snapshot.environment,
      responseUri: request.snapshot.destination,
    );
    return true;
  }

  void invalidateForLogout() {
    _generation++;
    _boundary = CookieLifecycleBoundary.locallyInvalidated;
    _active = null;
    _store.clear();
  }

  void beginAccountSwitch() {
    invalidateForLogout();
    _boundary = CookieLifecycleBoundary.ready; // Empty, not authenticated.
  }

  void changeEnvironment(ApiConfiguration configuration) {
    invalidateForLogout();
    _store = InMemoryCookieStore(configuration: configuration, clock: _clock);
    _boundary = CookieLifecycleBoundary.ready; // Empty, not authenticated.
  }

  @override
  String toString() => 'HOMEZONE cookie request coordinator';
}
