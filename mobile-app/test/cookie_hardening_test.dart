import 'dart:async';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/auth_cookie_policy.dart';
import 'package:homezone_mobile/core/api/auth_response_parser.dart';
import 'package:homezone_mobile/core/api/cookie_instruction.dart';

class ObservedTransport implements ApiTransport {
  ObservedTransport(this.operation);
  final Future<ApiResponse> Function(
    ApiRequest,
    void Function(ApiResponseMetadata)?,
  )
  operation;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) => operation(request, onHeaders);
  @override
  void close() {}
}

final config = ApiConfiguration(
  'https://approved.example.com',
  environment: ApiEnvironment.staging,
);
final now = DateTime.utc(2026, 10, 12);
final responseUri = config.baseUri.resolve('/api/auth/session');
const header = '__Secure-authjs.session-token=; Path=/; Max-Age=0';
const repeated = {
  'Set-Cookie': [
    header,
    '__Secure-authjs.session-token.0=; Path=/; Max-Age=-1',
  ],
};

void main() {
  test('valid names and credential values remain byte-for-byte unchanged', () {
    for (final value in [
      'opaque%7Chash==',
      'a!#\$%&\'()*+-./:<=>?@[]^_`{|}~',
      '"opaque=="',
      '',
    ]) {
      final cookie = CookieInstruction.parse('Exact.Name=$value; Path=/');
      expect(cookie.name, 'Exact.Name');
      expect(cookie.value, value);
    }
  });
  test(
    'invalid names, values and combined cookie text are rejected rather than normalized',
    () {
      for (final text in [
        ' bad=value',
        'bad =value',
        '=value',
        'bad,name=value',
        'name= value',
        'name=value ',
        'name=a,b',
        'name="a,b"',
        'name=bad\\value',
        'name="unclosed',
        'name=nonasciié',
        'name=bad\r\nvalue',
        'a=one,b=two',
      ]) {
        expect(
          () => CookieInstruction.parse(text),
          throwsA(isA<ApiException>()),
        );
      }
    },
  );
  test('duplicate and conflicting attributes fail even when case differs', () {
    for (final attributes in [
      'Path=/; pAtH=/other',
      'Secure; SECURE',
      'HttpOnly; httponly',
      'Domain=a.example; DOMAIN=b.example',
      'Max-Age=0; max-age=1',
      'Expires=Wed, 09 Jun 2021 10:18:14 GMT; expires=Wed, 09 Jun 2021 10:18:14 GMT',
      'SameSite=Lax; samesite=Strict',
      'Secure=false',
    ]) {
      expect(
        () => CookieInstruction.parse('name=value; $attributes'),
        throwsA(isA<ApiException>()),
      );
    }
  });
  test('attribute names are case-insensitive and Expires commas are intact', () {
    final cookie = CookieInstruction.parse(
      'name=opaque; pAtH=/; sEcUrE; hTtPoNlY; eXpIrEs=Wed, 09 Jun 2021 10:18:14 GMT',
    );
    expect(cookie.path, '/');
    expect(cookie.secure && cookie.httpOnly, true);
    expect(cookie.attributes['expires'], 'Wed, 09 Jun 2021 10:18:14 GMT');
    expect(cookie.deletesAt(now), true);
  });
  test('Max-Age is a strict integer and overrides past Expires', () {
    for (final value in ['+1', '0x10', '1.0', '1e3', ' 1', '1 ', '', '1 2']) {
      expect(
        () => CookieInstruction.parse('name=opaque; Max-Age=$value'),
        throwsA(isA<ApiException>()),
      );
    }
    expect(
      CookieInstruction.parse(
        'name=opaque; Max-Age=10; Expires=Wed, 09 Jun 2021 10:18:14 GMT',
      ).deletesAt(now),
      false,
    );
    expect(
      CookieInstruction.parse('name=opaque; Max-Age=0').deletesAt(now),
      true,
    );
    expect(
      CookieInstruction.parse('name=opaque; Max-Age=-10').deletesAt(now),
      true,
    );
  });
  test('policy recognizes HTTPS session, numeric chunks and CSRF families', () {
    for (final name in [
      '__Secure-authjs.session-token',
      '__Secure-authjs.session-token.0',
      '__Secure-authjs.session-token.12',
      '__Host-authjs.csrf-token',
    ]) {
      final result = AuthCookiePolicy(config).validate(
        CookieInstruction.parse('$name=opaque; Path=/; Secure; HttpOnly'),
        responseUri,
        now: now,
      );
      expect(result.eligibleForStorage, true);
      expect(result.hostOnly, true);
      expect(result.origin, config.baseUri.origin);
    }
  });
  test(
    'policy rejects incorrect scheme, family, prefix, flags, path and Domain',
    () {
      for (final text in [
        'authjs.session-token=opaque; Path=/; HttpOnly',
        '__Secure-authjs.session-token.00=opaque; Path=/; Secure; HttpOnly',
        '__Secure-authjs.session-token.x=opaque; Path=/; Secure; HttpOnly',
        '__Host-authjs.csrf-token=opaque; Path=/; HttpOnly',
        '__Secure-authjs.session-token=opaque; Path=/; Secure',
        '__Secure-authjs.session-token=opaque; Path=/private; Secure; HttpOnly',
        '__Secure-authjs.session-token=opaque; Secure; HttpOnly',
        '__Host-authjs.csrf-token=opaque; Path=/; Secure; HttpOnly; Domain=approved.example.com',
        '__Secure-authjs.callback-url=opaque; Path=/; Secure; HttpOnly',
      ]) {
        expect(
          () => AuthCookiePolicy(
            config,
          ).validate(CookieInstruction.parse(text), responseUri, now: now),
          throwsA(isA<ApiException>()),
        );
      }
      final cookie = CookieInstruction.parse(
        '__Secure-authjs.session-token=opaque; Path=/; Secure; HttpOnly',
      );
      for (final uri in [
        Uri.parse('https://evil.example.com/api/auth/session'),
        Uri.parse('http://approved.example.com/api/auth/session'),
      ]) {
        expect(
          () => AuthCookiePolicy(config).validate(cookie, uri, now: now),
          throwsA(isA<ApiException>()),
        );
      }
    },
  );
  test('HTTP development names stay separate from HTTPS names', () {
    final dev = ApiConfiguration(
      'http://localhost:3000',
      environment: ApiEnvironment.development,
    );
    for (final name in [
      'authjs.session-token',
      'authjs.session-token.0',
      'authjs.csrf-token',
    ]) {
      expect(
        AuthCookiePolicy(dev)
            .validate(
              CookieInstruction.parse('$name=opaque; Path=/; HttpOnly'),
              dev.baseUri.resolve('/api/auth/session'),
              now: now,
            )
            .eligibleForStorage,
        true,
      );
    }
    expect(
      () => AuthCookiePolicy(dev).validate(
        CookieInstruction.parse(
          '__Secure-authjs.session-token=opaque; Path=/; Secure; HttpOnly',
        ),
        dev.baseUri,
        now: now,
      ),
      throwsA(isA<ApiException>()),
    );
  });
  test(
    'deletions can omit flags but require an unambiguous matching scope',
    () {
      final deletion = CookieInstruction.parse(
        '__Host-authjs.csrf-token=different; Path=/; Max-Age=0',
      );
      final result = AuthCookiePolicy(
        config,
      ).validate(deletion, responseUri, now: now);
      expect(result.deletion, true);
      expect(result.eligibleForStorage, false);
      expect(
        () => AuthCookiePolicy(config).validate(
          CookieInstruction.parse('__Host-authjs.csrf-token=; Max-Age=0'),
          responseUri,
          now: now,
        ),
        throwsA(isA<ApiException>()),
      );
      expect(
        AuthCookiePolicy(config)
            .validate(
              CookieInstruction.parse('__Host-authjs.csrf-token=; Max-Age=0'),
              config.baseUri.resolve('/'),
              now: now,
            )
            .deletion,
        true,
      );
      expect(
        () => AuthCookiePolicy(config).validate(
          CookieInstruction.parse('$header; Domain=approved.example.com'),
          responseUri,
          now: now,
        ),
        throwsA(isA<ApiException>()),
      );
    },
  );
  test(
    'repeated response fields are independent and metadata is immutable',
    () {
      final metadata = ApiResponseMetadata(
        401,
        repeated,
        requestUri: responseUri,
      );
      expect(CookieInstruction.fromResponse(metadata.toResponse()).length, 2);
      expect(
        () => metadata.headers['Set-Cookie']!.add('other=x'),
        throwsUnsupportedError,
      );
    },
  );
  for (final entry in {
    ApiBodyFailure.invalidEncoding: () => Stream<List<int>>.value([0xc3, 0x28]),
    ApiBodyFailure.tooLarge: () =>
        Stream<List<int>>.value(List.filled(1024 * 1024 + 1, 65)),
    ApiBodyFailure.network: () => Stream<List<int>>.error(
      const SocketException('synthetic-sensitive-error'),
    ),
  }.entries) {
    test(
      'native body helper retains received cookies on ${entry.key.name}',
      () async {
        final metadata = ApiResponseMetadata(
          200,
          repeated,
          requestUri: responseUri,
        );
        final result = await IoApiTransport.readBody(
          metadata,
          entry.value(),
          const Duration(seconds: 1),
        );
        expect(result.bodyFailure, entry.key);
        expect(result.body, '');
        expect(CookieInstruction.fromResponse(result).length, 2);
        expect(
          () => parseSession(result),
          throwsA(
            isA<ApiException>().having(
              (e) => e.responseMetadata!.status,
              'status',
              200,
            ),
          ),
        );
      },
    );
  }
  test(
    'body-stream timeout retains headers received before the deadline',
    () async {
      final stream = StreamController<List<int>>();
      final metadata = ApiResponseMetadata(
        200,
        repeated,
        requestUri: responseUri,
      );
      final result = await IoApiTransport.readBody(
        metadata,
        stream.stream,
        const Duration(milliseconds: 5),
      );
      expect(result.bodyFailure, ApiBodyFailure.timeout);
      expect(CookieInstruction.fromResponse(result).length, 2);
      await stream.close();
    },
  );
  test(
    'outer client deadline retains onHeaders metadata without accepting late headers',
    () async {
      final transport = ObservedTransport((request, onHeaders) {
        onHeaders!(ApiResponseMetadata(200, repeated, requestUri: request.uri));
        return Completer<ApiResponse>().future;
      });
      final api = ApiClient(
        configuration: config,
        transport: transport,
        requestTimeout: const Duration(milliseconds: 5),
      );
      await expectLater(
        api.exchange('GET', '/api/auth/session'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.failure, 'failure', ApiFailure.timeout)
              .having(
                (e) => CookieInstruction.fromResponse(
                  e.responseMetadata!.toResponse(),
                ).length,
                'cookies',
                2,
              ),
        ),
      );
    },
  );
  test(
    'HTTP and malformed schema errors retain separately inspectable metadata',
    () {
      for (final response in [
        const ApiResponse(401, '{}', headers: repeated),
        const ApiResponse(503, '', headers: repeated),
        const ApiResponse(200, 'malformed', headers: repeated),
        const ApiResponse(200, '{}', headers: repeated),
      ]) {
        expect(
          () => parseSession(response),
          throwsA(
            isA<ApiException>().having(
              (e) => CookieInstruction.fromResponse(
                e.responseMetadata!.toResponse(),
              ).length,
              'cookies',
              2,
            ),
          ),
        );
      }
    },
  );
  test('client size rejection preserves received deletion metadata', () async {
    final transport = ObservedTransport(
      (request, onHeaders) async =>
          ApiResponse(200, 'x' * (1024 * 1024 + 1), headers: repeated),
    );
    await expectLater(
      ApiClient(
        configuration: config,
        transport: transport,
      ).exchange('GET', '/api/auth/session'),
      throwsA(
        isA<ApiException>()
            .having(
              (e) => e.responseMetadata!.bodyFailure,
              'body failure',
              ApiBodyFailure.tooLarge,
            )
            .having((e) => e.toString().contains('authjs'), 'redacted', false),
      ),
    );
  });
  test(
    'errors and metadata stringification do not log cookie contents',
    () async {
      final printed = <String>[];
      await runZoned(
        () async {
          final result = await IoApiTransport.readBody(
            ApiResponseMetadata(200, repeated, requestUri: responseUri),
            Stream<List<int>>.value([0xff]),
            const Duration(seconds: 1),
          );
          try {
            await parseSession(result);
          } on ApiException catch (error) {
            expect(error.toString().contains('authjs'), false);
            expect(error.responseMetadata.toString().contains('authjs'), false);
          }
        },
        zoneSpecification: ZoneSpecification(
          print: (_, _, _, line) => printed.add(line),
        ),
      );
      expect(printed, isEmpty);
    },
  );
}

Future<AuthSessionResult> parseSession(
  ApiResponse response, {
  DateTime? now,
}) async {
  final api = ApiClient(
    configuration: config,
    transport: ObservedTransport((request, onHeaders) async => response),
  );
  try {
    final bound = await api.exchange('GET', '/api/auth/session');
    return AuthResponseParser.session(bound, configuration: config, now: now);
  } finally {
    api.close();
  }
}
