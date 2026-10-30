import 'api_client.dart';
import 'api_configuration.dart';

enum ApiBodyEncoding { json, form }

class AuthRequestOptions {
  AuthRequestOptions({
    Map<String, String> cookies = const {},
    this.returnRedirect = false,
  }) : cookies = Map.unmodifiable(cookies);
  final Map<String, String> cookies;
  final bool returnRedirect;
  Map<String, Object?> toJson() => {
    'returnRedirect': returnRedirect,
    'cookies': '[REDACTED]',
  };
  @override
  String toString() => 'Auth request options (credentials redacted)';

  Map<String, String> headers(
    ApiConfiguration configuration,
    Uri destination,
    ApiBodyEncoding encoding,
  ) {
    if (destination.origin != configuration.baseUri.origin ||
        ((cookies.isNotEmpty || returnRedirect) &&
            !destination.path.startsWith('/api/')) ||
        (returnRedirect &&
            ![
              '/api/auth/callback/password',
              '/api/auth/callback/mobile-pin',
              '/api/auth/signout',
              '/api/auth/session',
            ].contains(destination.path))) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    for (final entry in cookies.entries) {
      if (!RegExp(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$").hasMatch(entry.key) ||
          RegExp(r'[\x00-\x20\x7f;]').hasMatch(entry.value)) {
        throw const ApiException(ApiFailure.invalidRequest);
      }
    }
    return {
      'accept': 'application/json',
      'content-type': encoding == ApiBodyEncoding.form
          ? 'application/x-www-form-urlencoded'
          : 'application/json',
      if (cookies.isNotEmpty)
        'cookie': cookies.entries.map((e) => '${e.key}=${e.value}').join('; '),
      if (returnRedirect) 'x-auth-return-redirect': '1',
    };
  }
}
