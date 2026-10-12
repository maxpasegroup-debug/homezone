import 'dart:convert';
import 'api_client.dart';
import 'api_configuration.dart';
import 'api_transport.dart';
import 'cookie_instruction.dart';

enum AuthDestinationError {
  credentials,
  csrf,
  accessDenied,
  configuration,
  other,
}

class AuthCallbackResult {
  const AuthCallbackResult(this.destination, this.error, this.cookies);
  final Uri destination;
  final AuthDestinationError? error;
  final List<CookieInstruction> cookies;
  // A callback result never establishes authenticated state.
  bool get requiresSessionConfirmation => error == null;
}

final class AuthSessionResult {
  const AuthSessionResult._(this.user, this.expires, this.cookies);
  final Map<String, Object?>? user;
  final DateTime? expires;
  final List<CookieInstruction> cookies;
  bool get authenticatedSnapshot => user != null;
}

abstract final class AuthResponseParser {
  static Object? _json(ApiResponse response) {
    ApiClient.checkBody(response);
    try {
      if (utf8.encode(response.body).length > 1024 * 1024) {
        throw const FormatException();
      }
      return jsonDecode(response.body);
    } catch (_) {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: response.metadata(),
      );
    }
  }

  static AuthCallbackResult callback(
    ApiResponse response,
    ApiConfiguration configuration,
  ) {
    String? destination;
    if (response.status == 302 ||
        response.status == 303 ||
        response.status == 307 ||
        response.status == 308) {
      final locations = response.headerValues('location');
      if (locations.length != 1) {
        throw ApiException(
          ApiFailure.invalidResponse,
          responseMetadata: response.metadata(),
        );
      }
      destination = locations.single;
    } else {
      ApiClient.checkStatus(response);
      if (response.status != 200) {
        throw ApiException(
          ApiFailure.invalidResponse,
          responseMetadata: response.metadata(),
        );
      }
      final json = _json(response);
      if (json is! Map<String, dynamic> ||
          json.length != 1 ||
          json['url'] is! String) {
        throw ApiException(
          ApiFailure.invalidResponse,
          responseMetadata: response.metadata(),
        );
      }
      destination = json['url'] as String;
    }
    Uri uri;
    try {
      uri = ApiClient.trustedRedirect(configuration, destination);
    } on ApiException catch (error) {
      throw ApiException(error.failure, responseMetadata: response.metadata());
    }
    final errors = uri.queryParametersAll['error'];
    if (errors != null && errors.length != 1) {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: response.metadata(),
      );
    }
    final error = errors == null
        ? null
        : switch (errors.single) {
            'CredentialsSignin' => AuthDestinationError.credentials,
            'MissingCSRF' => AuthDestinationError.csrf,
            'AccessDenied' => AuthDestinationError.accessDenied,
            'Configuration' => AuthDestinationError.configuration,
            _ => AuthDestinationError.other,
          };
    return AuthCallbackResult(
      uri,
      error,
      CookieInstruction.fromResponse(response),
    );
  }

  static AuthSessionResult session(
    ApiResponse response, {
    required ApiConfiguration configuration,
    DateTime? now,
  }) {
    if (!ApiClient.hasSessionProvenance(response, configuration) ||
        response.requestUri !=
            configuration.endpoint('/api/auth/session', null) ||
        response.headerValues('location').isNotEmpty) {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: response.metadata(),
      );
    }
    ApiClient.checkStatus(response);
    if (response.status != 200) {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: response.metadata(),
      );
    }
    final json = _json(response);
    final cookies = CookieInstruction.fromResponse(response);
    if (json == null) {
      return AuthSessionResult._(null, null, cookies);
    }
    if (json is! Map<String, dynamic> ||
        json['user'] is! Map<String, dynamic> ||
        json['expires'] is! String) {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: response.metadata(),
      );
    }
    final user = json['user'] as Map<String, dynamic>;
    final expires = DateTime.tryParse(json['expires'] as String);
    if (user['id'] is! String ||
        (user['id'] as String).isEmpty ||
        user['role'] is! String ||
        (user['role'] as String).isEmpty ||
        user['whatsappVerified'] is! bool ||
        expires == null) {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: response.metadata(),
      );
    }
    if (!expires.isAfter((now ?? DateTime.now()).toUtc())) {
      return AuthSessionResult._(null, expires, cookies);
    }
    return AuthSessionResult._(Map.unmodifiable(user), expires, cookies);
  }
}
