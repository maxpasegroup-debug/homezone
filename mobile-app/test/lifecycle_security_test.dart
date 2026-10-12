import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/auth_request_options.dart';
import 'package:homezone_mobile/core/api/auth_response_parser.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/in_memory_cookie_store.dart';

void main() {
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );
  final now = DateTime.utc(2026, 10, 12);
  final uri = config.endpoint('/api/auth/session', null);
  const csrf = '__Host-authjs.csrf-token';
  const session = '__Secure-authjs.session-token';
  String cookie(String name, String value) =>
      '$name=$value; Path=/; Secure; HttpOnly';
  String deletion(String name) => '$name=; Path=/; Max-Age=0';
  late InMemoryCookieStore store;
  late CookieRequestCoordinator coordinator;
  void apply(List<String> fields) => store.applyHeaders(
    fields,
    environment: config.environment,
    responseUri: uri,
  );
  Map<String, String> values() => store.snapshot(uri).requestOptions().cookies;
  setUp(() {
    store = InMemoryCookieStore(configuration: config, clock: () => now);
    coordinator = CookieRequestCoordinator(
      configuration: config,
      clock: () => now,
      operationTimeout: const Duration(milliseconds: 20),
    );
  });
  for (final outcome in ['success', 'failure', 'timeout']) {
    test('snapshot expires after $outcome', () async {
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        coordinator.acceptMetadata(
          ticket,
          ApiResponseMetadata(200, {
            'set-cookie': [
              cookie(
                session,
                'FAKE-JWE.eyJhbGciOiJkaXIifQ.synthetic-ciphertext.synthetic-tag',
              ),
            ],
          }, requestUri: uri),
        );
      });
      late CookieRequestSnapshot snapshot;
      final blocked = Completer<void>();
      final operation = coordinator.coordinate('/api/auth/session', (
        ticket,
      ) async {
        snapshot = ticket.snapshot;
        expect(
          snapshot.requestOptions().cookies[session],
          startsWith('FAKE-JWE.'),
        );
        if (outcome == 'failure') throw StateError('synthetic');
        if (outcome == 'timeout') await blocked.future;
      });
      if (outcome == 'success') {
        await operation;
      } else {
        await expectLater(operation, throwsA(isA<ApiException>()));
      }
      expect(snapshot.requestOptions, throwsA(isA<ApiException>()));
      if (!blocked.isCompleted) blocked.complete();
    });
  }
  for (final boundary in ['logout', 'account', 'environment']) {
    test('$boundary invalidates active snapshot', () async {
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        coordinator.acceptMetadata(
          ticket,
          ApiResponseMetadata(200, {
            'set-cookie': [
              cookie(session, 'FAKE-JWE.synthetic.populated.session'),
            ],
          }, requestUri: uri),
        );
      });
      await expectLater(
        coordinator.coordinate('/api/auth/session', (ticket) async {
          expect(
            ticket.snapshot.requestOptions().cookies[session],
            startsWith('FAKE-JWE.'),
          );
          if (boundary == 'logout') coordinator.invalidateForLogout();
          if (boundary == 'account') coordinator.beginAccountSwitch();
          if (boundary == 'environment') coordinator.changeEnvironment(config);
          expect(ticket.snapshot.requestOptions, throwsA(isA<ApiException>()));
          expect(
            coordinator.acceptMetadata(
              ticket,
              ApiResponseMetadata(200, {}, requestUri: uri),
            ),
            isFalse,
          );
        }),
        throwsA(isA<CookieLifecycleInvalidated>()),
      );
    });
  }
  test('stale sequential workflow cannot schedule for newer account', () async {
    final workflow = coordinator.generation;
    await coordinator.coordinate(
      '/api/auth/csrf',
      (_) async {},
      expectedGeneration: workflow,
    );
    coordinator.beginAccountSwitch();
    await expectLater(
      coordinator.coordinate(
        '/api/auth/callback/password',
        (_) async => fail('Stale step executed'),
        expectedGeneration: workflow,
      ),
      throwsA(isA<CookieLifecycleInvalidated>()),
    );
    await coordinator.coordinate(
      '/api/auth/session',
      (_) async {},
      expectedGeneration: coordinator.generation,
    );
  });
  test('late callback context cannot schedule for newer generation', () async {
    final resume = Completer<void>();
    final lateCheck = Completer<void>();
    await coordinator.coordinate('/api/auth/session', (_) async {
      unawaited(() async {
        await resume.future;
        await expectLater(
          coordinator.coordinate(
            '/api/auth/session',
            (_) async => fail('Stale work ran'),
          ),
          throwsA(isA<CookieLifecycleInvalidated>()),
        );
        lateCheck.complete();
      }());
    });
    coordinator.beginAccountSwitch();
    resume.complete();
    await lateCheck.future;
  });
  test(
    'separate sequential CSRF callback session steps remain usable',
    () async {
      final workflow = coordinator.generation;
      for (final path in [
        '/api/auth/csrf',
        '/api/auth/callback/password',
        '/api/auth/session',
      ]) {
        await coordinator.coordinate(path, (ticket) async {
          expect(ticket.snapshot.requestOptions().cookies, isEmpty);
          await Future<void>.value();
          expect(ticket.snapshot.requestOptions().cookies, isEmpty);
        }, expectedGeneration: workflow);
      }
    },
  );
  for (final duplicate in ['same', 'different']) {
    test('duplicate $duplicate CSRF positives fail closed', () {
      apply([cookie(session, 'session'), cookie(csrf, 'same')]);
      expect(
        () => apply([cookie(csrf, 'same'), cookie(csrf, duplicate)]),
        throwsA(isA<ApiException>()),
      );
      expect(values(), isEmpty);
    });
  }
  test('CSRF ordered deletion and replacement preserve session cohort', () {
    apply([cookie(session, 'session'), cookie(csrf, 'old')]);
    apply([deletion(csrf), cookie(csrf, 'new')]);
    expect(values(), {session: 'session', csrf: 'new'});
    apply([cookie(csrf, 'last'), deletion(csrf)]);
    expect(values(), {session: 'session'});
  });
  test(
    'malformed duplicate clears both under documented fail-closed policy',
    () {
      apply([cookie(session, 'session'), cookie(csrf, 'old')]);
      expect(
        () => apply([cookie(csrf, 'new'), '$csrf=bad; Path=/; Path=/other']),
        throwsA(isA<ApiException>()),
      );
      expect(values(), isEmpty);
    },
  );
  final body = jsonEncode({
    'user': {'id': 'fixture', 'role': 'USER', 'whatsappVerified': false},
    'expires': '2030-01-01T00:00:00Z',
    'requestUri': uri.toString(),
  });
  test('trusted session endpoint establishes authenticated snapshot', () async {
    final api = ApiClient(
      configuration: config,
      transport: SecurityResponseTransport(ApiResponse(200, body)),
    );
    final response = await api.exchange('GET', '/api/auth/session');
    expect(
      AuthResponseParser.session(
        response,
        configuration: config,
        now: now,
      ).authenticatedSnapshot,
      isTrue,
    );
    api.close();
  });
  for (final wrong in [
    null,
    Uri.parse('https://other.example/api/auth/session'),
    config.endpoint('/api/profile', null),
    config.endpoint('/api/auth/session', {'x': '1'}),
    Uri.parse('${uri.toString()}#fragment'),
  ]) {
    test(
      'session provenance rejects ${wrong?.path ?? 'missing'} ${wrong?.query ?? ''} ${wrong?.fragment ?? ''}',
      () {
        expect(
          () => AuthResponseParser.session(
            ApiResponse(200, body, requestUri: wrong),
            configuration: config,
            now: now,
          ),
          throwsA(isA<ApiException>()),
        );
      },
    );
  }
  test('Location ambiguity and redirects cannot establish session', () {
    for (final status in [200, 302]) {
      expect(
        () => AuthResponseParser.session(
          ApiResponse(
            status,
            body,
            requestUri: uri,
            headers: {
              'Location': ['/api/auth/session'],
            },
          ),
          configuration: config,
          now: now,
        ),
        throwsA(isA<ApiException>()),
      );
    }
  });
  test('generic JSON diagnostics redact protocol values and headers', () {
    final options = AuthRequestOptions(
      cookies: {session: 'synthetic-cookie-secret'},
    );
    final metadata = ApiResponseMetadata(401, {
      'set-cookie': [cookie(session, 'synthetic-cookie-secret')],
      'authorization': ['synthetic-auth-secret'],
    }, requestUri: uri);
    final error = ApiException(
      ApiFailure.unauthorized,
      responseMetadata: metadata,
    );
    for (final object in [options, metadata, error]) {
      final encoded = jsonEncode(object);
      expect(encoded, isNot(contains('synthetic-cookie-secret')));
      expect(encoded, isNot(contains('synthetic-auth-secret')));
      expect('$object', isNot(contains('secret')));
    }
    expect(metadata.toResponse().headerValues('set-cookie'), isNotEmpty);
  });
}

class SecurityResponseTransport implements ApiTransport {
  SecurityResponseTransport(this.response);
  final ApiResponse response;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async => response;
  @override
  void close() {}
}
