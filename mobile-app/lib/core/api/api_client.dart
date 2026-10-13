import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'api_configuration.dart';
import 'api_transport.dart';
import 'auth_request_options.dart';

enum ApiFailure {
  validation,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  server,
  http,
  redirect,
  timeout,
  network,
  invalidResponse,
  invalidRequest,
  closed,
}

class ApiException implements Exception {
  const ApiException(
    this.failure, {
    this.status,
    this.retryAfterSeconds,
    this.responseMetadata,
  });
  final ApiFailure failure;
  final int? status;
  final int? retryAfterSeconds;
  final ApiResponseMetadata? responseMetadata;
  Map<String, Object?> toJson() => {
    'failure': failure.name,
    'status': status,
    'response': responseMetadata?.toJson(),
  };
  // Never include response bodies, URLs, credentials or raw transport exceptions.
  @override
  String toString() => 'API request failed: ${failure.name}';
}

class ApiClient {
  // Identity-bound provenance cannot be copied by constructing another response.
  static final _sessionResponses = Expando<(String, ApiEnvironment)>();
  static bool hasSessionProvenance(
    ApiResponse response,
    ApiConfiguration configuration,
  ) =>
      _sessionResponses[response] ==
      (configuration.baseUri.origin, configuration.environment);
  ApiClient({
    required this.configuration,
    required this.transport,
    this.requestTimeout = const Duration(seconds: 20),
  }) {
    if (requestTimeout <= Duration.zero) {
      throw const ApiConfigurationException();
    }
  }
  final ApiConfiguration configuration;
  final ApiTransport transport;
  final Duration requestTimeout;
  var _closed = false;

  Future<Object?> request(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
    AuthRequestOptions? auth,
    ApiBodyEncoding encoding = ApiBodyEncoding.json,
  }) async {
    final response = await exchange(
      method,
      path,
      query: query,
      body: body,
      auth: auth,
      encoding: encoding,
    );
    checkStatus(response);
    checkBody(response);
    if (response.status == 204 || response.body.isEmpty) return null;
    try {
      return jsonDecode(response.body);
    } on FormatException {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: response.metadata(),
      );
    }
  }

  Future<ApiResponse> exchange(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
    AuthRequestOptions? auth,
    ApiBodyEncoding encoding = ApiBodyEncoding.json,
  }) async {
    if (_closed) throw const ApiException(ApiFailure.closed);
    if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].contains(method) ||
        (method == 'GET' && body != null)) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    final uri = configuration.endpoint(path, query);
    String? encoded;
    try {
      if (encoding == ApiBodyEncoding.form &&
          body != null &&
          body is! Map<String, String>) {
        throw const ApiException(ApiFailure.invalidRequest);
      }
      encoded = body == null
          ? null
          : encoding == ApiBodyEncoding.json
          ? jsonEncode(body)
          : Uri(queryParameters: body as Map<String, String>).query;
    } catch (_) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    final headers = (auth ?? AuthRequestOptions()).headers(
      configuration,
      uri,
      encoding,
    );
    ApiResponseMetadata? received;
    var acceptingHeaders = true;
    try {
      final response = await transport
          .send(
            ApiRequest(method, uri, encoded, headers: headers),
            requestTimeout,
            onHeaders: (metadata) {
              if (!acceptingHeaders) {
                return;
              }
              if (metadata.requestUri != uri) {
                throw const ApiTransportSecurityException();
              }
              received = metadata;
            },
          )
          .timeout(requestTimeout);
      if (response.requestUri != null && response.requestUri != uri) {
        throw const ApiTransportSecurityException();
      }
      received = ApiResponseMetadata(
        response.status,
        response.headers,
        requestUri: uri,
        retryAfter: response.retryAfter,
        bodyFailure: response.bodyFailure,
      );
      checkBody(response);
      if (utf8.encode(response.body).length > 1024 * 1024) {
        received = ApiResponseMetadata(
          response.status,
          response.headers,
          requestUri: uri,
          retryAfter: response.retryAfter,
          bodyFailure: ApiBodyFailure.tooLarge,
        );
        throw ApiException(
          ApiFailure.invalidResponse,
          responseMetadata: received,
        );
      }
      final locations = response.headerValues('location');
      if (locations.length > 1) throw const ApiException(ApiFailure.redirect);
      if (response.status >= 300 &&
          response.status < 400 &&
          locations.isNotEmpty) {
        trustedRedirect(configuration, locations.single);
      }
      final boundResponse = ApiResponse(
        response.status,
        response.body,
        headers: response.headers,
        requestUri: uri,
        retryAfter: response.retryAfter,
        bodyFailure: response.bodyFailure,
      );
      if (method == 'GET' &&
          uri == configuration.endpoint('/api/auth/session', null)) {
        _sessionResponses[boundResponse] = (
          configuration.baseUri.origin,
          configuration.environment,
        );
      }
      return boundResponse;
    } on ApiTransportSecurityException {
      throw const ApiException(ApiFailure.invalidRequest);
    } on ApiException catch (error) {
      throw ApiException(
        error.failure,
        status: error.status,
        retryAfterSeconds: error.retryAfterSeconds,
        // Preserve the verified request URI on body errors from injected/native responses.
        responseMetadata: received ?? error.responseMetadata,
      );
    } on TimeoutException {
      throw ApiException(ApiFailure.timeout, responseMetadata: received);
    } on SocketException {
      throw ApiException(ApiFailure.network, responseMetadata: received);
    } on HandshakeException {
      throw ApiException(ApiFailure.network, responseMetadata: received);
    } on HttpException {
      throw ApiException(ApiFailure.network, responseMetadata: received);
    } on FormatException {
      throw ApiException(
        ApiFailure.invalidResponse,
        responseMetadata: received,
      );
    } catch (_) {
      throw ApiException(ApiFailure.network, responseMetadata: received);
    } finally {
      acceptingHeaders = false;
    }
  }

  static Uri trustedRedirect(
    ApiConfiguration configuration,
    String destination,
  ) {
    final uri = Uri.tryParse(destination);
    if (uri == null ||
        destination.isEmpty ||
        destination.startsWith('//') ||
        RegExp(r'[\\\s\x00-\x1f\x7f]').hasMatch(destination) ||
        uri.userInfo.isNotEmpty ||
        (!destination.startsWith('/') && !uri.hasScheme)) {
      throw const ApiException(ApiFailure.redirect);
    }
    final resolved = configuration.baseUri.resolveUri(uri);
    if (resolved.scheme != configuration.baseUri.scheme ||
        !resolved.hasAuthority ||
        resolved.origin != configuration.baseUri.origin) {
      throw const ApiException(ApiFailure.redirect);
    }
    return resolved;
  }

  static void checkStatus(ApiResponse response) {
    final status = response.status;
    if (status < 200 || status >= 300) {
      final failure = switch (status) {
        400 || 422 => ApiFailure.validation,
        401 => ApiFailure.unauthorized,
        403 => ApiFailure.forbidden,
        404 => ApiFailure.notFound,
        429 => ApiFailure.rateLimited,
        >= 300 && < 400 => ApiFailure.redirect,
        >= 500 => ApiFailure.server,
        _ => ApiFailure.http,
      };
      final retry = int.tryParse(response.retryAfter ?? '');
      throw ApiException(
        failure,
        status: status,
        retryAfterSeconds: retry != null && retry >= 0 ? retry : null,
        responseMetadata: response.metadata(),
      );
    }
  }

  static void checkBody(ApiResponse response) {
    if (response.bodyFailure != null) {
      final failure = switch (response.bodyFailure!) {
        ApiBodyFailure.timeout => ApiFailure.timeout,
        ApiBodyFailure.network => ApiFailure.network,
        ApiBodyFailure.invalidEncoding ||
        ApiBodyFailure.tooLarge => ApiFailure.invalidResponse,
      };
      throw ApiException(failure, responseMetadata: response.metadata());
    }
  }

  void close() {
    if (_closed) return;
    _closed = true;
    transport.close();
  }
}
