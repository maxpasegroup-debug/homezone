import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/auth_request_options.dart';
import 'package:homezone_mobile/core/api/auth_response_parser.dart';

class ProvenanceTransport implements ApiTransport {
  ProvenanceTransport(this.response);
  final ApiResponse response;
  ApiRequest? request;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    this.request = request;
    return response;
  }

  @override
  void close() {}
}

void main() {
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );
  final now = DateTime.utc(2026, 10, 12);
  final sessionUri = config.endpoint('/api/auth/session', null);
  // Deliberately fake, opaque and populated; never a cryptographically valid JWT.
  const fake =
      'FAKE-JWE.eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0.synthetic-iv.synthetic-ciphertext.synthetic-tag';
  const headers = {
    'set-cookie': [
      '__Secure-authjs.session-token=$fake; Path=/; Secure; HttpOnly; SameSite=Lax',
    ],
  };
  final valid = jsonEncode({
    'user': {'id': 'synthetic-user', 'role': 'USER', 'whatsappVerified': false},
    'expires': '2030-01-01T00:00:00Z',
    'requestUri': sessionUri.toString(),
  });
  Future<ApiResponse> exchange(
    ApiResponse response,
    String path, {
    String method = 'GET',
    Map<String, String>? query,
  }) async {
    final transport = ProvenanceTransport(response);
    final api = ApiClient(configuration: config, transport: transport);
    try {
      return await api.exchange(
        method,
        path,
        query: query,
        auth: AuthRequestOptions(
          cookies: {'__Secure-authjs.session-token': fake},
        ),
      );
    } finally {
      api.close();
    }
  }

  AuthSessionResult parse(ApiResponse response) =>
      AuthResponseParser.session(response, configuration: config, now: now);
  test(
    'correct client request authenticates session schema, not cookie cryptography',
    () async {
      final response = await exchange(
        ApiResponse(200, valid, headers: headers),
        '/api/auth/session',
      );
      expect(parse(response).authenticatedSnapshot, isTrue);
      expect(parse(response).cookies.single.value, fake);
    },
  );
  for (final path in [
    '/api/profile',
    '/api/auth/callback/password',
    '/api/auth/csrf',
  ]) {
    test(
      'session shaped $path response cannot authenticate or be relabeled',
      () async {
        // Even the raw transport URI falsely claims the session endpoint.
        await expectLater(
          exchange(
            ApiResponse(200, valid, headers: headers, requestUri: sessionUri),
            path,
          ),
          throwsA(isA<ApiException>()),
        );
        final response = await exchange(
          ApiResponse(200, valid, headers: headers),
          path,
        );
        expect(() => parse(response), throwsA(isA<ApiException>()));
        final relabeled = ApiResponse(
          response.status,
          response.body,
          headers: response.headers,
          requestUri: sessionUri,
        );
        expect(() => parse(relabeled), throwsA(isA<ApiException>()));
      },
    );
  }
  test('raw or copied responses have no client-owned provenance', () async {
    expect(
      () => parse(
        ApiResponse(200, valid, headers: headers, requestUri: sessionUri),
      ),
      throwsA(isA<ApiException>()),
    );
    final trusted = await exchange(
      ApiResponse(200, valid, headers: headers),
      '/api/auth/session',
    );
    expect(
      () => parse(trusted.metadata().toResponse()),
      throwsA(isA<ApiException>()),
    );
    expect(
      () => parse(
        ApiResponse(
          200,
          trusted.body,
          headers: trusted.headers,
          requestUri: trusted.requestUri,
        ),
      ),
      throwsA(isA<ApiException>()),
    );
  });
  test('wrong origin transport metadata cannot acquire provenance', () async {
    await expectLater(
      exchange(
        ApiResponse(
          200,
          valid,
          headers: headers,
          requestUri: Uri.parse('https://other.example/api/auth/session'),
        ),
        '/api/auth/session',
      ),
      throwsA(isA<ApiException>()),
    );
    final trusted = await exchange(
      ApiResponse(200, valid, headers: headers),
      '/api/auth/session',
    );
    expect(
      () => AuthResponseParser.session(
        trusted,
        configuration: ApiConfiguration(
          'https://other.example',
          environment: ApiEnvironment.staging,
        ),
        now: now,
      ),
      throwsA(isA<ApiException>()),
    );
  });
  test(
    'query fragment and POST do not qualify as session provenance',
    () async {
      final queried = await exchange(
        ApiResponse(200, valid, headers: headers),
        '/api/auth/session',
        query: {'x': '1'},
      );
      expect(() => parse(queried), throwsA(isA<ApiException>()));
      final posted = await exchange(
        ApiResponse(200, valid, headers: headers),
        '/api/auth/session',
        method: 'POST',
      );
      expect(() => parse(posted), throwsA(isA<ApiException>()));
      await expectLater(
        exchange(
          ApiResponse(200, valid, headers: headers),
          '/api/auth/session#fragment',
        ),
        throwsA(isA<ApiConfigurationException>()),
      );
    },
  );
  for (final status in [200, 302]) {
    test('Location and redirect ambiguity fail for $status', () async {
      final response = await exchange(
        ApiResponse(
          status,
          valid,
          headers: {
            ...headers,
            'location': ['/api/auth/session'],
          },
        ),
        '/api/auth/session',
      );
      expect(() => parse(response), throwsA(isA<ApiException>()));
    });
  }
  for (final body in [
    '',
    '{}',
    'not-json',
    '{"user":{},"expires":"invalid"}',
    '{"url":"/dashboard"}',
  ]) {
    test('missing malformed or callback session schema fails: $body', () async {
      final response = await exchange(
        ApiResponse(200, body, headers: headers),
        '/api/auth/session',
      );
      expect(() => parse(response), throwsA(isA<ApiException>()));
    });
  }
  test(
    'expired or null session remains unauthenticated despite populated cookie',
    () async {
      for (final body in [
        'null',
        valid.replaceAll('2030-01-01', '2020-01-01'),
      ]) {
        final response = await exchange(
          ApiResponse(200, body, headers: headers),
          '/api/auth/session',
        );
        expect(parse(response).authenticatedSnapshot, isFalse);
      }
    },
  );
  test(
    'callback acceptance never substitutes for session validation',
    () async {
      final response = await exchange(
        const ApiResponse(200, '{"url":"/dashboard"}', headers: headers),
        '/api/auth/callback/password',
        method: 'POST',
      );
      expect(
        AuthResponseParser.callback(
          response,
          config,
        ).requiresSessionConfirmation,
        isTrue,
      );
      expect(() => parse(response), throwsA(isA<ApiException>()));
    },
  );
}
