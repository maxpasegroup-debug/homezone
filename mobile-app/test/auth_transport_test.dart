import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/auth_request_options.dart';
import 'package:homezone_mobile/core/api/auth_response_parser.dart';
import 'package:homezone_mobile/core/api/cookie_instruction.dart';

class StubTransport implements ApiTransport {
  StubTransport(this.response);
  final ApiResponse response;
  ApiRequest? request;
  @override
  Future<ApiResponse> send(
    ApiRequest value,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    request = value;
    return response;
  }

  @override
  void close() {}
}

final configuration = ApiConfiguration(
  'https://approved.example.com',
  environment: ApiEnvironment.staging,
);
ApiClient client(StubTransport transport) =>
    ApiClient(configuration: configuration, transport: transport);
const cookies = {
  'Set-Cookie': [
    '__Secure-authjs.session-token.0=synthetic%2Cpart; Path=/; Secure; HttpOnly; SameSite=Lax; Expires=Wed, 09 Jun 2021 10:18:14 GMT',
    '__Secure-authjs.session-token.1=second; Path=/; Secure',
  ],
};
void main() {
  test('repeated headers preserve chunks, commas and attributes', () {
    const response = ApiResponse(200, '{}', headers: cookies);
    expect(response.headerValues('set-cookie').length, 2);
    final instructions = CookieInstruction.fromResponse(response);
    expect(instructions.first.value, 'synthetic%2Cpart');
    expect(instructions.first.expires, DateTime.utc(2021, 6, 9, 10, 18, 14));
    expect(instructions.first.path, '/');
    expect(instructions.first.secure && instructions.first.httpOnly, true);
    expect(instructions.first.sameSite, 'Lax');
  });
  test('replacement order, deletion and Max-Age precedence are preserved', () {
    final values = CookieInstruction.fromResponse(
      const ApiResponse(
        200,
        'null',
        headers: {
          'set-cookie': [
            'fixture=old; Path=/; Domain=approved.example.com',
            'fixture=new; Path=/; Max-Age=60; Expires=Wed, 09 Jun 2021 10:18:14 GMT',
            'fixture=; Path=/; Max-Age=0',
            'fixture.1=; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT',
          ],
        },
      ),
    );
    expect(values.map((c) => c.value), ['old', 'new', '', '']);
    expect(values.first.domain, 'approved.example.com');
    expect(values[1].deletesAt(DateTime.utc(2026)), false);
    expect(values[2].deletesAt(DateTime.utc(2026)), true);
    expect(values[3].deletesAt(DateTime.utc(2026)), true);
  });
  test('form encoding, CSRF and controlled headers are constructed', () async {
    final stub = StubTransport(const ApiResponse(200, '{"url":"/dashboard"}'));
    final response = await client(stub).exchange(
      'POST',
      '/api/auth/callback/password',
      encoding: ApiBodyEncoding.form,
      auth: AuthRequestOptions(
        cookies: {'__Host-authjs.csrf-token': 'synthetic%7Chash'},
        returnRedirect: true,
      ),
      body: <String, String>{
        'email': 'fixture@example.com',
        'password': 'synthetic&+=value',
        'csrfToken': 'synthetic',
        'callbackUrl': '/onboarding',
      },
    );
    expect(
      Uri.splitQueryString(stub.request!.body!)['password'],
      'synthetic&+=value',
    );
    expect(Uri.splitQueryString(stub.request!.body!)['csrfToken'], 'synthetic');
    expect(stub.request!.headers, {
      'accept': 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'cookie': '__Host-authjs.csrf-token=synthetic%7Chash',
      'x-auth-return-redirect': '1',
    });
    expect(
      AuthResponseParser.callback(
        response,
        configuration,
      ).requiresSessionConfirmation,
      true,
    );
  });
  test('JSON Auth.js requests remain supported', () async {
    final stub = StubTransport(const ApiResponse(200, '{}'));
    await client(stub).exchange(
      'POST',
      '/api/auth/signout',
      body: {'csrfToken': 'synthetic'},
      auth: AuthRequestOptions(returnRedirect: true),
    );
    expect(jsonDecode(stub.request!.body!), {'csrfToken': 'synthetic'});
    expect(stub.request!.headers['content-type'], 'application/json');
  });
  test(
    'sensitive headers are limited to trusted origin and Auth.js routes',
    () {
      final options = AuthRequestOptions(
        cookies: {'fixture': 'synthetic'},
        returnRedirect: true,
      );
      for (final url in [
        'https://evil.example.com/api/auth/signout',
        'http://approved.example.com/api/auth/signout',
        'https://approved.example.com/other',
      ]) {
        expect(
          () => options.headers(
            configuration,
            Uri.parse(url),
            ApiBodyEncoding.json,
          ),
          throwsA(isA<ApiException>()),
        );
      }
      for (final headers in [
        {'host': 'evil.example.com'},
        {'authorization': 'synthetic'},
        {'cookie': 'a=b\r\nHost: evil'},
      ]) {
        expect(
          () => IoApiTransport.validateRequest(
            ApiRequest(
              'GET',
              configuration.baseUri.resolve('/api/profile'),
              null,
              headers: headers,
            ),
            configuration,
          ),
          throwsA(isA<ApiTransportSecurityException>()),
        );
      }
      expect(
        () => IoApiTransport.validateRequest(
          ApiRequest(
            'GET',
            Uri.parse('https://evil.example.com/api/profile'),
            null,
          ),
          configuration,
        ),
        throwsA(isA<ApiTransportSecurityException>()),
      );
      expect(
        () => AuthRequestOptions(cookies: {'fixture': 'a;b'}).headers(
          configuration,
          configuration.baseUri.resolve('/api/profile'),
          ApiBodyEncoding.json,
        ),
        throwsA(isA<ApiException>()),
      );
    },
  );
  test('callback acceptance never establishes authenticated state', () {
    final result = AuthResponseParser.callback(
      const ApiResponse(
        200,
        '{"url":"https://approved.example.com/dashboard"}',
      ),
      configuration,
    );
    expect(result.error, null);
    expect(result.destination.path, '/dashboard');
    expect(result.requiresSessionConfirmation, true);
  });
  test('credential, CSRF and other authentication errors are classified', () {
    for (final entry in {
      'CredentialsSignin': AuthDestinationError.credentials,
      'MissingCSRF': AuthDestinationError.csrf,
      'AccessDenied': AuthDestinationError.accessDenied,
      'Configuration': AuthDestinationError.configuration,
      'other': AuthDestinationError.other,
    }.entries) {
      final result = AuthResponseParser.callback(
        ApiResponse(200, jsonEncode({'url': '/auth?error=${entry.key}'})),
        configuration,
      );
      expect(result.error, entry.value);
      expect(result.requiresSessionConfirmation, false);
    }
  });
  test(
    'redirect metadata is retained but unsafe destinations are rejected',
    () async {
      const response = ApiResponse(
        302,
        '',
        headers: {
          'location': ['/auth?error=CredentialsSignin'],
          'set-cookie': ['fixture=; Max-Age=0'],
        },
      );
      final raw = await client(
        StubTransport(response),
      ).exchange('POST', '/api/auth/signout');
      expect(
        AuthResponseParser.callback(raw, configuration).cookies.single.maxAge,
        0,
      );
      for (final url in [
        'https://evil.example.com/auth?error=CredentialsSignin',
        '//evil.example.com',
        'javascript:alert(1)',
        'https://approved.example.com.evil.com',
        'https://user@approved.example.com',
        r'/\evil.example.com',
      ]) {
        expect(
          () => AuthResponseParser.callback(
            ApiResponse(200, jsonEncode({'url': url})),
            configuration,
          ),
          throwsA(isA<ApiException>()),
        );
      }
      await expectLater(
        client(
          StubTransport(
            const ApiResponse(
              302,
              '',
              headers: {
                'location': ['https://evil.example.com'],
              },
            ),
          ),
        ).exchange('POST', '/api/auth/signout'),
        throwsA(isA<ApiException>()),
      );
    },
  );
  test('null session preserves deletion instructions', () async {
    final result = await parseSession(
      const ApiResponse(
        200,
        'null',
        headers: {
          'set-cookie': ['fixture=; Max-Age=0'],
        },
      ),
    );
    expect(result.authenticatedSnapshot, false);
    expect(result.cookies.single.maxAge, 0);
  });
  test('valid session structure and absolute expiry are validated', () async {
    final body = jsonEncode({
      'user': {'id': 'fixture', 'role': 'USER', 'whatsappVerified': false},
      'expires': '2030-01-01T00:00:00.000Z',
    });
    expect(
      (await parseSession(
        ApiResponse(200, body),
        now: DateTime.utc(2026),
      )).authenticatedSnapshot,
      true,
    );
    expect(
      (await parseSession(
        ApiResponse(200, body),
        now: DateTime.utc(2031),
      )).authenticatedSnapshot,
      false,
    );
  });
  test('malformed and unexpected structures fail with sanitized errors', () {
    for (final body in [
      '<html>synthetic</html>',
      '{}',
      '[]',
      'true',
      '{"url":42}',
      '{"url":"/dashboard","extra":true}',
    ]) {
      expect(
        () =>
            AuthResponseParser.callback(ApiResponse(200, body), configuration),
        throwsA(isA<ApiException>()),
      );
    }
    for (final body in ['', '{}', '[]', '{"user":{},"expires":"invalid"}']) {
      expect(
        () => parseSession(ApiResponse(200, body)),
        throwsA(isA<ApiException>()),
      );
    }
    expect(
      () => CookieInstruction.fromResponse(
        const ApiResponse(
          200,
          '',
          headers: {
            'set-cookie': ['synthetic-secret-without-name'],
          },
        ),
      ),
      throwsA(isA<ApiException>()),
    );
  });
  for (final entry in {
    401: ApiFailure.unauthorized,
    403: ApiFailure.forbidden,
    429: ApiFailure.rateLimited,
    503: ApiFailure.server,
  }.entries) {
    test(
      'auth parsing maps HTTP ${entry.key} without disclosing response contents',
      () {
        final response = ApiResponse(
          entry.key,
          'synthetic-sensitive-body',
          retryAfter: '5',
        );
        expect(
          () => AuthResponseParser.callback(response, configuration),
          throwsA(
            isA<ApiException>()
                .having((e) => e.failure, 'failure', entry.value)
                .having(
                  (e) => e.toString().contains('sensitive'),
                  'redacted',
                  false,
                ),
          ),
        );
        expect(() => parseSession(response), throwsA(isA<ApiException>()));
      },
    );
  }
  test('raw exchange retains cookie deletion on HTTP errors', () async {
    final raw = await client(
      StubTransport(
        const ApiResponse(
          401,
          '{}',
          headers: {
            'set-cookie': ['fixture=; Max-Age=0'],
          },
        ),
      ),
    ).exchange('GET', '/api/profile');
    expect(CookieInstruction.fromResponse(raw).single.maxAge, 0);
    expect(() => ApiClient.checkStatus(raw), throwsA(isA<ApiException>()));
  });
  test(
    'response size cap also applies to mocked transports and parsers',
    () async {
      final body = 'x' * (1024 * 1024 + 1);
      await expectLater(
        client(
          StubTransport(ApiResponse(200, body)),
        ).exchange('GET', '/api/profile'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.failure,
            'failure',
            ApiFailure.invalidResponse,
          ),
        ),
      );
      expect(
        () => parseSession(ApiResponse(200, body)),
        throwsA(isA<ApiException>()),
      );
    },
  );
  test('cookie and CSRF processing does not emit application logs', () async {
    final printed = <String>[];
    await runZoned(
      () async {
        final response =
            await client(
              StubTransport(
                const ApiResponse(
                  200,
                  '{"url":"/dashboard"}',
                  headers: {
                    'set-cookie': ['fixture=synthetic; Path=/'],
                  },
                ),
              ),
            ).exchange(
              'POST',
              '/api/auth/signout',
              body: {'csrfToken': 'synthetic'},
              auth: AuthRequestOptions(
                cookies: {'fixture': 'synthetic'},
                returnRedirect: true,
              ),
            );
        AuthResponseParser.callback(response, configuration);
      },
      zoneSpecification: ZoneSpecification(
        print: (_, _, _, line) => printed.add(line),
      ),
    );
    expect(printed, isEmpty);
  });
}

Future<AuthSessionResult> parseSession(
  ApiResponse response, {
  DateTime? now,
}) async {
  final api = client(StubTransport(response));
  try {
    final bound = await api.exchange('GET', '/api/auth/session');
    return AuthResponseParser.session(
      bound,
      configuration: configuration,
      now: now,
    );
  } finally {
    api.close();
  }
}
