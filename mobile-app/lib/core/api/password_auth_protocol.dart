import 'dart:convert';
import 'api_client.dart';
import 'api_transport.dart';
import 'auth_request_options.dart';
import 'auth_response_parser.dart';
import 'cookie_request_coordinator.dart';

/// Explicit protocol operation only. Never instantiated by preview screens.
final class PasswordSignInAttempt {
  PasswordSignInAttempt._(this.generation, this.result);
  final int generation;
  final Future<AuthSessionResult> result;
}

final class PasswordAuthProtocol {
  PasswordAuthProtocol({required this.client, required this.coordinator}) {
    _ownsClient = _clientOwners[client] == null;
    if (_ownsClient) _clientOwners[client] = this;
  }
  static final Expando<PasswordAuthProtocol> _clientOwners = Expando();
  late final bool _ownsClient;
  Object? _controllerOwner;
  bool _disposed = false;
  final ApiClient client;
  final CookieRequestCoordinator coordinator;
  bool _busy = false;

  /// A resource owner is never transferred, including after disposal.
  bool claimController(Object owner) {
    if (!_ownsClient || _disposed || _busy || _controllerOwner != null) {
      return false;
    }
    _controllerOwner = owner;
    return true;
  }

  void disposeOwned(Object owner) {
    if (!_ownsClient || !identical(owner, _controllerOwner) || _disposed) {
      return;
    }
    _disposed = true;
    client.close();
  }

  /// Only the controller owner may reopen an invalidated anonymous workflow.
  /// This grants no identity and preserves coordinated cookie requests.
  int prepareRegistrationOwned(Object owner) {
    if (!_ownsClient || _disposed || _busy ||
        !identical(owner, _controllerOwner)) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    final generation = coordinator.boundary == CookieLifecycleBoundary.ready
        ? coordinator.generation
        : coordinator.beginAccountSwitch();
    if (_disposed || coordinator.generation != generation ||
        coordinator.boundary != CookieLifecycleBoundary.ready) {
      throw const CookieLifecycleInvalidated();
    }
    return generation;
  }

  PasswordSignInAttempt admitSignIn({
    required String email,
    required String password,
    Object? owner,
  }) {
    if (!_ownsClient ||
        _disposed ||
        _busy ||
        (_controllerOwner != null && !identical(owner, _controllerOwner))) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    _busy = true;
    // Admission and its generation are established synchronously, before I/O.
    try {
      final workflow = coordinator.beginAccountSwitch();
      if (_disposed ||
          coordinator.generation != workflow ||
          coordinator.boundary != CookieLifecycleBoundary.ready) {
        throw const CookieLifecycleInvalidated();
      }
      return PasswordSignInAttempt._(
        workflow,
        _runSignIn(email, password, workflow),
      );
    } catch (_) {
      // No admitted operation: do not clear a generation minted by a listener.
      _busy = false;
      rethrow;
    }
  }

  void _validateCsrf(String token, CoordinatedCookieRequest ticket) {
    final name = client.configuration.baseUri.scheme == 'https'
        ? '__Host-authjs.csrf-token'
        : 'authjs.csrf-token';
    final value = ticket.snapshot.requestOptions().cookies[name];
    String decoded;
    try {
      decoded = Uri.decodeComponent(value ?? '');
    } catch (_) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    final parts = decoded.split('|');
    // Installed Auth.js generates 32 random bytes as hex and a SHA-256 hash.
    if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(token) ||
        parts.length != 2 ||
        parts[0] != token ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(parts[1])) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }

  Future<ApiResponse> _exchange(
    CoordinatedCookieRequest ticket,
    String method,
    String path, {
    Object? body,
    bool redirect = false,
  }) async {
    if (ticket.snapshot.destination !=
            client.configuration.endpoint(path, null) ||
        ticket.snapshot.environment != client.configuration.environment) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    late final ApiResponse response;
    try {
      response = await client.exchange(
        method,
        path,
        body: body,
        encoding: ApiBodyEncoding.form,
        auth: ticket.snapshot.requestOptions(returnRedirect: redirect),
      );
    } on ApiException catch (error) {
      if (error.responseMetadata != null &&
          !coordinator.acceptMetadata(ticket, error.responseMetadata!)) {
        throw const CookieLifecycleInvalidated();
      }
      rethrow;
    }
    if (!coordinator.acceptMetadata(ticket, response.metadata())) {
      throw const CookieLifecycleInvalidated();
    }
    return response;
  }

  Future<AuthSessionResult> signIn({
    required String email,
    required String password,
  }) async {
    return admitSignIn(email: email, password: password).result;
  }

  /// Uses the current generation; never begins an account switch during logout.
  /// The controller clears local authority even when remote revocation is uncertain.
  Future<bool> signOutOwned(Object owner) async {
    if (!_ownsClient ||
        _disposed ||
        _busy ||
        !identical(owner, _controllerOwner)) {
      return false;
    }
    _busy = true;
    final generation = coordinator.generation;
    try {
      final token = await coordinator.coordinate('/api/auth/csrf', (
        ticket,
      ) async {
        final response = await _exchange(ticket, 'GET', '/api/auth/csrf');
        ApiClient.checkStatus(response);
        if (response.status != 200 ||
            response.headerValues('location').isNotEmpty) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
        final json = jsonDecode(response.body);
        if (json is! Map<String, dynamic> || json['csrfToken'] is! String) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
        return json['csrfToken'] as String;
      }, expectedGeneration: generation);
      await coordinator.coordinate('/api/auth/signout', (ticket) async {
        _validateCsrf(token, ticket);
        final response = await _exchange(
          ticket,
          'POST',
          '/api/auth/signout',
          redirect: true,
          body: <String, String>{'csrfToken': token, 'callbackUrl': '/'},
        );
        final result = AuthResponseParser.callback(
          response,
          client.configuration,
        );
        if (result.error != null) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
      }, expectedGeneration: generation);
      // Revocation is acknowledged by this server's logout handler, not proven by local clearing.
      return coordinator.generation == generation;
    } catch (_) {
      return false;
    } finally {
      _busy = false;
    }
  }

  Future<AuthSessionResult> verifyOwned(Object owner) async {
    if (!_ownsClient ||
        _disposed ||
        _busy ||
        !identical(owner, _controllerOwner)) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    _busy = true;
    final generation = coordinator.generation;
    try {
      final result = await coordinator.coordinate('/api/auth/session', (
        ticket,
      ) async {
        final response = await _exchange(ticket, 'GET', '/api/auth/session');
        return AuthResponseParser.session(
          response,
          configuration: client.configuration,
        ).withoutProtocolCookies();
      }, expectedGeneration: generation);
      if (coordinator.generation != generation) {
        throw const CookieLifecycleInvalidated();
      }
      return result;
    } on ApiException catch (error) {
      throw ApiException(error.failure, status: error.status);
    } finally {
      _busy = false;
    }
  }

  Future<AuthSessionResult> _runSignIn(
    String email,
    String password,
    int workflow,
  ) async {
    try {
      final csrf = await coordinator.coordinate('/api/auth/csrf', (
        ticket,
      ) async {
        final response = await _exchange(ticket, 'GET', '/api/auth/csrf');
        ApiClient.checkStatus(response);
        Object? json;
        try {
          json = jsonDecode(response.body);
        } catch (_) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
        if (response.status != 200 ||
            json is! Map<String, dynamic> ||
            json['csrfToken'] is! String ||
            (json['csrfToken'] as String).isEmpty ||
            response.headerValues('location').isNotEmpty) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
        return json['csrfToken'] as String;
      }, expectedGeneration: workflow);
      await coordinator.coordinate('/api/auth/callback/password', (
        ticket,
      ) async {
        _validateCsrf(csrf, ticket);
        final response = await _exchange(
          ticket,
          'POST',
          '/api/auth/callback/password',
          redirect: true,
          body: <String, String>{
            'csrfToken': csrf,
            'email': email.trim().toLowerCase(),
            'password': password,
            'callbackUrl': '/',
          },
        );
        final result = AuthResponseParser.callback(
          response,
          client.configuration,
        );
        if (result.error != null) {
          throw const ApiException(ApiFailure.unauthorized);
        }
      }, expectedGeneration: workflow);
      final session = await coordinator.coordinate('/api/auth/session', (
        ticket,
      ) async {
        final response = await _exchange(ticket, 'GET', '/api/auth/session');
        final result = AuthResponseParser.session(
          response,
          configuration: client.configuration,
        );
        if (!result.authenticatedSnapshot) {
          throw const ApiException(ApiFailure.unauthorized);
        }
        return result;
      }, expectedGeneration: workflow);
      if (coordinator.generation != workflow) {
        throw const CookieLifecycleInvalidated();
      }
      // Return the same verified snapshot without leaking protocol cookies outward.
      return session.withoutProtocolCookies();
    } catch (error) {
      // Never clear a newer account generation when this workflow is obsolete.
      if (coordinator.generation == workflow) {
        coordinator.invalidateForLogout();
      }
      if (error is ApiException) {
        throw ApiException(
          error.failure,
          status: error.status,
          retryAfterSeconds: error.retryAfterSeconds,
        );
      }
      if (error is CookieLifecycleInvalidated) rethrow;
      throw const ApiException(ApiFailure.invalidResponse);
    } finally {
      _busy = false;
    }
  }
}
