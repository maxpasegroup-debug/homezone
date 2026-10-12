import 'api_client.dart';
import 'api_configuration.dart';
import 'auth_cookie_policy.dart';
import 'auth_request_options.dart';
import 'cookie_instruction.dart';

typedef CookieClock = DateTime Function();

class CookieRequestSnapshot {
  CookieRequestSnapshot._(
    this.environment,
    this.origin,
    this.destination,
    Map<String, String> cookies,
    this._clock,
    this._current,
    this._csrfName,
    this._sessionExpires,
    this._csrfExpires,
  ) : _cookies = Map.unmodifiable(cookies);
  final ApiEnvironment environment;
  final String origin;
  final Uri destination;
  final Map<String, String> _cookies;
  final CookieClock _clock;
  final bool Function() _current;
  final String _csrfName;
  final DateTime? _sessionExpires;
  final DateTime? _csrfExpires;

  /// Protocol adapter only; do not pass this object/options into UI or diagnostics.
  AuthRequestOptions requestOptions({bool returnRedirect = false}) {
    if (!_current()) throw const ApiException(ApiFailure.unauthorized);
    final now = _clock().toUtc();
    return AuthRequestOptions(
      cookies: {
        for (final entry in _cookies.entries)
          if (entry.key == _csrfName
              ? (_csrfExpires == null || _csrfExpires.isAfter(now))
              : (_sessionExpires == null || _sessionExpires.isAfter(now)))
            entry.key: entry.value,
      },
      returnRedirect: returnRedirect,
    );
  }

  @override
  String toString() => 'Cookie request snapshot';
}

class _StoredCookie {
  _StoredCookie(this.instruction, DateTime receivedAt)
    : expires = instruction.maxAge != null
          ? receivedAt.add(Duration(seconds: instruction.maxAge!))
          : instruction.expires;
  final CookieInstruction instruction;
  final DateTime? expires;
  bool expired(DateTime now) => expires != null && !expires!.isAfter(now);
}

/// HOMEZONE-only volatile credentials. No authentication status or persistence.
class InMemoryCookieStore {
  InMemoryCookieStore({required this.configuration, required this.clock});
  final ApiConfiguration configuration;
  final CookieClock clock;
  Map<String, _StoredCookie> _session = {};
  _StoredCookie? _csrf;
  Object _lifecycle = Object();

  String get _sessionName =>
      '${configuration.baseUri.scheme == 'https' ? '__Secure-' : ''}authjs.session-token';
  String get _csrfName =>
      '${configuration.baseUri.scheme == 'https' ? '__Host-' : ''}authjs.csrf-token';

  bool _candidate(String name) =>
      name == 'authjs.csrf-token' ||
      name == '__Host-authjs.csrf-token' ||
      name == 'authjs.session-token' ||
      name.startsWith('authjs.session-token.') ||
      name == '__Secure-authjs.session-token' ||
      name.startsWith('__Secure-authjs.session-token.');

  void _prune(DateTime now) {
    if (_session.values.any((cookie) => cookie.expired(now))) {
      _session = {};
      _lifecycle = Object();
    }
    if (_csrf?.expired(now) ?? false) {
      _csrf = null;
      _lifecycle = Object();
    }
  }

  CookieRequestSnapshot snapshot(Uri destination) {
    if (destination.scheme != configuration.baseUri.scheme ||
        !destination.hasAuthority ||
        destination.userInfo.isNotEmpty ||
        destination.origin != configuration.baseUri.origin ||
        !destination.path.startsWith('/api/')) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    _prune(clock().toUtc());
    final entries = _session.entries.toList()
      ..sort(
        (a, b) => a.key == _sessionName
            ? 0
            : int.parse(
                a.key.substring(_sessionName.length + 1),
              ).compareTo(int.parse(b.key.substring(_sessionName.length + 1))),
      );
    final deadlines =
        entries
            .map((entry) => entry.value.expires)
            .whereType<DateTime>()
            .toList()
          ..sort();
    final lifecycle = _lifecycle;
    return CookieRequestSnapshot._(
      configuration.environment,
      configuration.baseUri.origin,
      destination,
      {
        for (final entry in entries) entry.key: entry.value.instruction.value,
        if (_csrf != null) _csrfName: _csrf!.instruction.value,
      },
      clock,
      () => identical(lifecycle, _lifecycle),
      _csrfName,
      deadlines.isEmpty ? null : deadlines.first,
      _csrf?.expires,
    );
  }

  void apply(
    List<CookieInstruction> instructions, {
    required ApiEnvironment environment,
    required Uri responseUri,
  }) {
    if (environment != configuration.environment ||
        responseUri.scheme != configuration.baseUri.scheme ||
        !responseUri.hasAuthority ||
        responseUri.userInfo.isNotEmpty ||
        responseUri.origin != configuration.baseUri.origin) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    final now = clock().toUtc();
    _prune(now);
    final replacement = <String, _StoredCookie>{};
    final assigned = <String>{};
    var csrf = _csrf;
    var sessionTouched = false;
    var removedNewAssignment = false;
    try {
      for (final cookie in instructions) {
        if (!_candidate(cookie.name)) continue;
        final approved = AuthCookiePolicy(
          configuration,
        ).validate(cookie, responseUri, now: now);
        if (cookie.name == _csrfName) {
          csrf = approved.deletion ? null : _StoredCookie(cookie, now);
          continue;
        }
        sessionTouched = true;
        if (approved.deletion) {
          removedNewAssignment |= assigned.contains(cookie.name);
          replacement.remove(cookie.name);
        } else {
          if (!assigned.add(cookie.name)) {
            throw const ApiException(ApiFailure.invalidResponse);
          }
          replacement[cookie.name] = _StoredCookie(cookie, now);
        }
      }
      if (removedNewAssignment ||
          (sessionTouched &&
              replacement.isNotEmpty &&
              !_complete(replacement))) {
        throw const ApiException(ApiFailure.invalidResponse);
      }
    } catch (_) {
      // A malformed credential batch never leaves an older cohort eligible.
      clear();
      throw const ApiException(ApiFailure.invalidResponse);
    }
    if (sessionTouched || !identical(csrf, _csrf)) _lifecycle = Object();
    if (sessionTouched) _session = replacement;
    _csrf = csrf;
  }

  void applyHeaders(
    List<String> fields, {
    required ApiEnvironment environment,
    required Uri responseUri,
  }) {
    if (environment != configuration.environment ||
        responseUri.scheme != configuration.baseUri.scheme ||
        !responseUri.hasAuthority ||
        responseUri.userInfo.isNotEmpty ||
        responseUri.origin != configuration.baseUri.origin) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    try {
      apply(
        [for (final field in fields) CookieInstruction.parse(field)],
        environment: environment,
        responseUri: responseUri,
      );
    } catch (_) {
      clear();
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }

  bool _complete(Map<String, _StoredCookie> cookies) {
    if (cookies.values.any((cookie) => cookie.instruction.value.isEmpty)) {
      return false;
    }
    if (cookies.containsKey(_sessionName)) return cookies.length == 1;
    for (var index = 0; index < cookies.length; index++) {
      if (!cookies.containsKey('$_sessionName.$index')) return false;
    }
    return true;
  }

  void clear() {
    _session = {};
    _csrf = null;
    _lifecycle = Object();
  }

  @override
  String toString() => 'In-memory HOMEZONE cookie store';
}
