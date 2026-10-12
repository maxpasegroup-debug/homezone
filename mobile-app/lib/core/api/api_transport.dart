import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'api_configuration.dart';

class ApiTransportSecurityException implements Exception {
  const ApiTransportSecurityException();
}

enum ApiBodyFailure { timeout, network, invalidEncoding, tooLarge }

class ApiResponseMetadata {
  ApiResponseMetadata(
    this.status,
    Map<String, List<String>> headers, {
    this.requestUri,
    this.retryAfter,
    this.bodyFailure,
  }) {
    if (status < 100 ||
        status > 599 ||
        headers.entries.any(
          (entry) =>
              !RegExp(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$").hasMatch(entry.key) ||
              entry.value.any(
                (value) => RegExp(r'[\x00-\x08\x0a-\x1f\x7f]').hasMatch(value),
              ),
        )) {
      throw const FormatException('Invalid response metadata');
    }
    this.headers = Map.unmodifiable({
      for (final entry in headers.entries)
        entry.key: List<String>.unmodifiable(entry.value),
    });
  }
  final int status;
  late final Map<String, List<String>> headers;
  final Uri? requestUri;
  final String? retryAfter;
  final ApiBodyFailure? bodyFailure;
  ApiResponse toResponse() => ApiResponse(
    status,
    '',
    headers: headers,
    retryAfter: retryAfter,
    bodyFailure: bodyFailure,
    requestUri: requestUri,
  );
  @override
  String toString() => 'HTTP response metadata: $status';
}

class ApiRequest {
  const ApiRequest(this.method, this.uri, this.body, {this.headers = const {}});
  final String method;
  final Uri uri;
  final String? body;
  final Map<String, String> headers;
}

class ApiResponse {
  const ApiResponse(
    this.status,
    this.body, {
    this.retryAfter,
    this.headers = const {},
    this.bodyFailure,
    this.requestUri,
  });
  final int status;
  final String body;
  final String? retryAfter;
  final Map<String, List<String>> headers;
  final ApiBodyFailure? bodyFailure;
  final Uri? requestUri;
  ApiResponseMetadata metadata() => ApiResponseMetadata(
    status,
    headers,
    requestUri: requestUri,
    retryAfter: retryAfter,
    bodyFailure: bodyFailure,
  );

  List<String> headerValues(String name) => [
    for (final entry in headers.entries)
      if (entry.key.toLowerCase() == name.toLowerCase()) ...entry.value,
  ];
}

abstract interface class ApiTransport {
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  });
  void close();
}

class IoApiTransport implements ApiTransport {
  IoApiTransport({
    required this.configuration,
    Duration connectionTimeout = const Duration(seconds: 10),
  }) {
    _client.connectionTimeout = connectionTimeout;
  }
  final HttpClient _client = HttpClient();
  final ApiConfiguration configuration;

  static void validateRequest(
    ApiRequest request,
    ApiConfiguration configuration,
  ) {
    if (request.uri.scheme != configuration.baseUri.scheme ||
        !request.uri.hasAuthority ||
        request.uri.userInfo.isNotEmpty ||
        request.uri.origin != configuration.baseUri.origin ||
        request.headers.keys.any(
          (name) => ![
            'accept',
            'content-type',
            'cookie',
            'x-auth-return-redirect',
          ].contains(name.toLowerCase()),
        ) ||
        request.headers.values.any(
          (value) => RegExp(r'[\r\n\x00]').hasMatch(value),
        )) {
      throw const ApiTransportSecurityException();
    }
  }

  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    validateRequest(request, configuration);
    final elapsed = Stopwatch()..start();
    HttpClientRequest? outgoing;
    var expired = false;
    final timer = Timer(timeout, () {
      expired = true;
      outgoing?.abort(TimeoutException('Request deadline exceeded'));
    });
    try {
      outgoing = await _client
          .openUrl(request.method, request.uri)
          .then((value) {
            if (expired) value.abort();
            return value;
          })
          .timeout(timeout);
      if (expired) {
        outgoing.abort();
        throw TimeoutException('Request deadline exceeded');
      }
      outgoing.followRedirects = false;
      outgoing.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.forEach(outgoing.headers.set);
      if (request.body != null) {
        if (!request.headers.containsKey(HttpHeaders.contentTypeHeader)) {
          outgoing.headers.contentType = ContentType.json;
        }
        outgoing.write(request.body);
      }
      final response = await outgoing.close().timeout(
        timeout - elapsed.elapsed,
      );
      final headers = <String, List<String>>{};
      response.headers.forEach((name, values) {
        headers[name.toLowerCase()] = List.unmodifiable(values);
      });
      final metadata = ApiResponseMetadata(
        response.statusCode,
        headers,
        requestUri: request.uri,
        retryAfter: response.headers.value(HttpHeaders.retryAfterHeader),
      );
      onHeaders?.call(metadata);
      final result = await readBody(
        metadata,
        response,
        timeout - elapsed.elapsed,
      );
      if (result.bodyFailure != null) outgoing.abort();
      return result;
    } finally {
      timer.cancel();
    }
  }

  /// Header receipt precedes body processing; injectable streams permit offline tests.
  static Future<ApiResponse> readBody(
    ApiResponseMetadata metadata,
    Stream<List<int>> stream,
    Duration timeout,
  ) async {
    final elapsed = Stopwatch()..start();
    final chunks = StreamIterator<List<int>>(stream);
    final bytes = <int>[];
    ApiBodyFailure? failure;
    String body = '';
    try {
      while (await chunks.moveNext().timeout(timeout - elapsed.elapsed)) {
        if (bytes.length + chunks.current.length > 1024 * 1024) {
          failure = ApiBodyFailure.tooLarge;
          break;
        }
        bytes.addAll(chunks.current);
      }
      if (failure == null) body = utf8.decode(bytes);
    } on TimeoutException {
      failure = ApiBodyFailure.timeout;
    } on FormatException {
      failure = ApiBodyFailure.invalidEncoding;
    } catch (_) {
      failure = ApiBodyFailure.network;
    } finally {
      try {
        await chunks.cancel();
      } catch (_) {
        failure ??= ApiBodyFailure.network;
      }
    }
    return ApiResponse(
      metadata.status,
      failure == null ? body : '',
      headers: metadata.headers,
      retryAfter: metadata.retryAfter,
      requestUri: metadata.requestUri,
      bodyFailure: failure,
    );
  }

  @override
  void close() => _client.close(force: true);
}
