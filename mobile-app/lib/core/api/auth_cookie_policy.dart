import 'api_client.dart';
import 'api_configuration.dart';
import 'cookie_instruction.dart';

class ValidatedCookieInstruction {
  const ValidatedCookieInstruction._(
    this.instruction,
    this.origin,
    this.path,
    this.deletion,
  );
  final CookieInstruction instruction;
  final String origin;
  final String path;
  final bool deletion;
  bool get eligibleForStorage => !deletion;
  bool get hostOnly => true;
}

/// An eligibility check, not a jar, deletion executor or transmission decision.
class AuthCookiePolicy {
  const AuthCookiePolicy(this.configuration);
  final ApiConfiguration configuration;

  ValidatedCookieInstruction validate(
    CookieInstruction cookie,
    Uri responseUri, {
    required DateTime now,
  }) {
    if (responseUri.scheme != configuration.baseUri.scheme ||
        !responseUri.hasAuthority ||
        responseUri.userInfo.isNotEmpty ||
        responseUri.origin != configuration.baseUri.origin) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    final https = responseUri.scheme == 'https';
    final sessionName = '${https ? '__Secure-' : ''}authjs.session-token';
    final csrfName = '${https ? '__Host-' : ''}authjs.csrf-token';
    final chunk = cookie.name.startsWith('$sessionName.')
        ? cookie.name.substring(sessionName.length + 1)
        : null;
    final recognized =
        cookie.name == sessionName ||
        cookie.name == csrfName ||
        (chunk != null && RegExp(r'^(0|[1-9][0-9]*)$').hasMatch(chunk));
    if (!recognized || cookie.attributes.containsKey('domain')) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    final deletion = cookie.deletesAt(now);
    final requestPath = responseUri.path;
    final lastSlash = requestPath.lastIndexOf('/');
    final defaultPath = lastSlash <= 0
        ? '/'
        : requestPath.substring(0, lastSlash);
    final path = cookie.path ?? defaultPath;
    if (path != '/' ||
        (!deletion &&
            (cookie.path != '/' ||
                !cookie.httpOnly ||
                (https && !cookie.secure) ||
                (!https && cookie.secure)))) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    // Deletions never authorize storage/transmission. Missing flags are allowed
    // only when name + exact origin + resolved host-only Path=/ identify a target.
    return ValidatedCookieInstruction._(
      cookie,
      responseUri.origin,
      path,
      deletion,
    );
  }
}
