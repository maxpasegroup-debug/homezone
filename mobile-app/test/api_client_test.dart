import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';

class FakeTransport implements ApiTransport {
  FakeTransport(this.respond);
  final Future<ApiResponse> Function(ApiRequest) respond;
  ApiRequest? lastRequest;
  bool closed = false;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) {
    lastRequest = request;
    return respond(request);
  }

  @override
  void close() => closed = true;
}

ApiClient client(
  FakeTransport transport, {
  Duration timeout = const Duration(seconds: 1),
}) => ApiClient(
  configuration: ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  ),
  transport: transport,
  requestTimeout: timeout,
);

void main() {
  test(
    'configuration requires explicit valid origin and build environment',
    () {
      expect(
        ApiConfiguration.fromBuild,
        throwsA(isA<ApiConfigurationException>()),
      );
      for (final value in [
        '',
        'not a url',
        '//example.com',
        'http://example.com',
        'http://localhost:3000',
        'https://user:secret@example.com',
        'https://example.com/api',
        'https://example.com?token=secret',
        'https://example.com#fragment',
        ' https://example.com',
        r'https://example.com\evil',
      ]) {
        expect(
          () => ApiConfiguration(value, environment: ApiEnvironment.staging),
          throwsA(isA<ApiConfigurationException>()),
        );
      }
    },
  );

  test('HTTP development is restricted to explicit local addresses', () {
    for (final host in ['localhost', '127.0.0.1', '[::1]', '10.0.2.2']) {
      expect(
        ApiConfiguration(
          'http://$host:3000',
          environment: ApiEnvironment.development,
        ).baseUri.scheme,
        'http',
      );
    }
    expect(
      () => ApiConfiguration(
        'http://192.168.1.2',
        environment: ApiEnvironment.development,
      ),
      throwsA(isA<ApiConfigurationException>()),
    );
  });

  test(
    'request constructs same-origin URL and preserves JSON envelope',
    () async {
      final transport = FakeTransport(
        (_) async => const ApiResponse(200, '{"profile":{"id":"fixture"}}'),
      );
      final api = client(transport);
      expect(
        await api.request(
          'POST',
          '/api/profile',
          query: {'q': 'a b'},
          body: {'name': 'Fixture'},
        ),
        {
          'profile': {'id': 'fixture'},
        },
      );
      expect(transport.lastRequest!.uri.origin, 'https://approved.example.com');
      expect(transport.lastRequest!.uri.queryParameters['q'], 'a b');
      expect(jsonDecode(transport.lastRequest!.body!), {'name': 'Fixture'});
      api.close();
      expect(transport.closed, true);
      await expectLater(
        api.request('GET', '/api/profile'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.failure,
            'failure',
            ApiFailure.closed,
          ),
        ),
      );
    },
  );

  test('external and ambiguous destinations never reach transport', () async {
    final transport = FakeTransport((_) async => const ApiResponse(200, '{}'));
    final api = client(transport);
    for (final path in [
      'https://evil.example.com/api',
      '//evil.example.com',
      '/api/../private',
      '/api/%2f%2fevil.example.com',
      r'/api\evil',
      '/api/profile?token=secret',
      '/api/profile#fragment',
    ]) {
      await expectLater(
        api.request('GET', path),
        throwsA(isA<ApiConfigurationException>()),
      );
    }
    expect(transport.lastRequest, null);
  });

  for (final entry in {
    400: ApiFailure.validation,
    422: ApiFailure.validation,
    401: ApiFailure.unauthorized,
    403: ApiFailure.forbidden,
    404: ApiFailure.notFound,
    429: ApiFailure.rateLimited,
    302: ApiFailure.redirect,
    503: ApiFailure.server,
    409: ApiFailure.http,
  }.entries) {
    test(
      'maps HTTP ${entry.key} without exposing sensitive error body',
      () async {
        final api = client(
          FakeTransport(
            (_) async => ApiResponse(
              entry.key,
              'secret-password cookie reset-token',
              retryAfter: '12',
            ),
          ),
        );
        await expectLater(
          api.request('GET', '/api/profile'),
          throwsA(
            isA<ApiException>()
                .having((e) => e.failure, 'failure', entry.value)
                .having((e) => e.status, 'status', entry.key)
                .having(
                  (e) => e.toString().contains('secret-password'),
                  'redacted',
                  false,
                ),
          ),
        );
      },
    );
  }

  test('rate limit exposes safe delta seconds', () async {
    await expectLater(
      client(
        FakeTransport(
          (_) async => const ApiResponse(429, '{}', retryAfter: '3'),
        ),
      ).request('GET', '/api/profile'),
      throwsA(
        isA<ApiException>().having((e) => e.retryAfterSeconds, 'retry', 3),
      ),
    );
  });

  test('invalid JSON is a safe protocol error; 204 is empty', () async {
    await expectLater(
      client(
        FakeTransport(
          (_) async => const ApiResponse(200, '<html>secret</html>'),
        ),
      ).request('GET', '/api/profile'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.failure,
          'failure',
          ApiFailure.invalidResponse,
        ),
      ),
    );
    expect(
      await client(
        FakeTransport((_) async => const ApiResponse(204, '')),
      ).request('DELETE', '/api/profile'),
      null,
    );
  });

  test(
    'timeout and connection failures are sanitized and not printed',
    () async {
      final printed = <String>[];
      await runZoned(
        () async {
          for (final error in [
            TimeoutException('password-secret'),
            const SocketException('cookie-secret'),
            const HttpException('token-secret'),
            const HandshakeException('credential-secret'),
          ]) {
            final api = client(FakeTransport((_) async => throw error));
            await expectLater(
              api.request(
                'POST',
                '/api/profile',
                body: {'password': 'password-secret'},
              ),
              throwsA(
                isA<ApiException>()
                    .having(
                      (e) => e.failure,
                      'failure',
                      error is TimeoutException
                          ? ApiFailure.timeout
                          : ApiFailure.network,
                    )
                    .having(
                      (e) => e.toString().contains('secret'),
                      'redacted',
                      false,
                    ),
              ),
            );
          }
        },
        zoneSpecification: ZoneSpecification(
          print: (_, _, _, line) => printed.add(line),
        ),
      );
      expect(printed, isEmpty);
    },
  );

  test(
    'request deadline also bounds an unresponsive injected transport',
    () async {
      await expectLater(
        client(
          FakeTransport((_) => Completer<ApiResponse>().future),
          timeout: const Duration(milliseconds: 10),
        ).request('GET', '/api/profile'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.failure,
            'failure',
            ApiFailure.timeout,
          ),
        ),
      );
    },
  );

  test(
    'invalid method, GET body and unserializable JSON are rejected',
    () async {
      final transport = FakeTransport(
        (_) async => const ApiResponse(200, '{}'),
      );
      final api = client(transport);
      for (final action in [
        () => api.request('TRACE', '/api/profile'),
        () => api.request('GET', '/api/profile', body: {}),
        () => api.request('POST', '/api/profile', body: Object()),
      ]) {
        await expectLater(
          action(),
          throwsA(
            isA<ApiException>().having(
              (e) => e.failure,
              'failure',
              ApiFailure.invalidRequest,
            ),
          ),
        );
      }
      expect(transport.lastRequest, null);
    },
  );
}
