import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';

class ProtocolTransport implements ApiTransport {
  ProtocolTransport(this.respond);
  final Future<ApiResponse> Function(ApiRequest) respond;
  final requests = <ApiRequest>[];
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) {
    requests.add(request);
    return respond(request);
  }

  @override
  void close() {}
}

void main() {
  hardeningTests();
  lateFailureTests();
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );
  const fakeCookie = 'FAKE-JWE.synthetic.iv.ciphertext.tag';
  const sessionHeaders = {
    'set-cookie': [
      '__Secure-authjs.session-token=$fakeCookie; Path=/; Secure; HttpOnly',
    ],
  };
  const csrfResponse = ApiResponse(
    200,
    '{"csrfToken":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
    headers: {
      'set-cookie': [
        '__Host-authjs.csrf-token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa%7Cbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb; Path=/; Secure; HttpOnly',
      ],
    },
  );
  final sessionBody = jsonEncode({
    'user': {'id': 'fixture', 'role': 'USER', 'whatsappVerified': false},
    'expires': DateTime.now()
        .toUtc()
        .add(const Duration(days: 1))
        .toIso8601String(),
  });
  late CookieRequestCoordinator coordinator;
  late ProtocolTransport transport;
  PasswordAuthProtocol protocol(
    Future<ApiResponse> Function(ApiRequest) respond,
  ) {
    coordinator = CookieRequestCoordinator(
      configuration: config,
      clock: DateTime.now,
    );
    transport = ProtocolTransport(respond);
    return PasswordAuthProtocol(
      client: ApiClient(
        configuration: config,
        transport: transport,
        requestTimeout: const Duration(milliseconds: 50),
      ),
      coordinator: coordinator,
    );
  }

  Future<ApiResponse> standard(ApiRequest request) async =>
      switch (request.uri.path) {
        '/api/auth/csrf' => csrfResponse,
        '/api/auth/callback/password' => const ApiResponse(
          200,
          '{"url":"/dashboard"}',
          headers: sessionHeaders,
        ),
        _ => ApiResponse(200, sessionBody),
      };
  test(
    'actual sequence carries CSRF form and cookies and confirms session independently',
    () async {
      final harness = protocol(standard);
      final result = await harness.signIn(
        email: ' USER@fixture.invalid ',
        password: 'synthetic&password',
      );
      expect(result.authenticatedSnapshot, isTrue);
      expect(transport.requests.map((r) => r.uri.path), [
        '/api/auth/csrf',
        '/api/auth/callback/password',
        '/api/auth/session',
      ]);
      final callback = transport.requests[1];
      expect(
        Uri.splitQueryString(callback.body!)['csrfToken'],
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      expect(
        Uri.splitQueryString(callback.body!)['email'],
        'user@fixture.invalid',
      );
      expect(callback.headers['cookie'], contains('__Host-authjs.csrf-token='));
      expect(callback.headers['x-auth-return-redirect'], '1');
      expect(transport.requests.last.headers['cookie'], contains(fakeCookie));
    },
  );
  test('PIN callback reuses CSRF cookies and independent session verification', () async {
    final harness = protocol((request) => request.uri.path == '/api/auth/callback/mobile-pin'
        ? Future.value(ApiResponse(200, '{"url":"/dashboard"}', headers: sessionHeaders))
        : standard(request));
    final result = await harness.admitSignIn(email: '+919000000001', password: '001234', mobilePin: true).result;
    expect(result.authenticatedSnapshot, isTrue);
    expect(transport.requests.map((r) => r.uri.path), [
      '/api/auth/csrf', '/api/auth/callback/mobile-pin', '/api/auth/session',
    ]);
    final fields = Uri.splitQueryString(transport.requests[1].body!);
    expect(fields['phone'], '+919000000001');
    expect(fields['pin'], '001234');
    expect(fields.containsKey('email'), isFalse);
    expect(fields.containsKey('password'), isFalse);
    expect(transport.requests[1].headers['cookie'], contains('__Host-authjs.csrf-token='));
  });
  for (final body in ['null', '{}', 'not-json']) {
    test('callback acceptance plus invalid session $body fails', () async {
      final harness = protocol(
        (r) => r.uri.path == '/api/auth/session'
            ? Future.value(ApiResponse(200, body))
            : standard(r),
      );
      await expectLater(
        harness.signIn(email: 'user', password: 'synthetic'),
        throwsA(isA<ApiException>()),
      );
      expect(coordinator.boundary, CookieLifecycleBoundary.locallyInvalidated);
    });
  }
  for (final response in [
    const ApiResponse(
      200,
      '{"url":"/auth?error=CredentialsSignin"}',
      headers: sessionHeaders,
    ),
    const ApiResponse(
      403,
      '{}',
      headers: {
        'set-cookie': ['__Host-authjs.csrf-token=; Path=/; Max-Age=0'],
      },
    ),
    const ApiResponse(200, 'not-json'),
  ]) {
    test(
      'failed callback ${response.status} ${response.body} cannot authenticate',
      () async {
        final harness = protocol(
          (r) => r.uri.path == '/api/auth/callback/password'
              ? Future.value(response)
              : standard(r),
        );
        await expectLater(
          harness.signIn(email: 'user', password: 'synthetic'),
          throwsA(isA<ApiException>()),
        );
        expect(transport.requests.length, 2);
        expect(
          coordinator.boundary,
          CookieLifecycleBoundary.locallyInvalidated,
        );
      },
    );
  }
  test('malformed bootstrap aborts before callback', () async {
    final harness = protocol((_) async => const ApiResponse(200, '{}'));
    await expectLater(
      harness.signIn(email: 'user', password: 'synthetic'),
      throwsA(isA<ApiException>()),
    );
    expect(transport.requests.length, 1);
  });
  test('timeout is sanitized without retry', () async {
    final harness = protocol((_) => Completer<ApiResponse>().future);
    await expectLater(
      harness.signIn(email: 'user', password: 'secret'),
      throwsA(
        isA<ApiException>()
            .having((e) => e.failure, 'kind', ApiFailure.timeout)
            .having((e) => '$e', 'safe', isNot(contains('secret'))),
      ),
    );
    expect(transport.requests.length, 1);
  });
  test(
    'no result before session confirmation; stale session completion is discarded',
    () async {
      final entered = Completer<void>();
      final finish = Completer<ApiResponse>();
      final harness = protocol((r) {
        if (r.uri.path == '/api/auth/session') {
          entered.complete();
          return finish.future;
        }
        return standard(r);
      });
      var published = false;
      final pending = harness.signIn(email: 'user', password: 'synthetic').then(
        (result) {
          published = true;
          return result;
        },
      );
      await entered.future;
      expect(published, isFalse);
      final check = expectLater(
        pending,
        throwsA(isA<CookieLifecycleInvalidated>()),
      );
      coordinator.beginAccountSwitch();
      finish.complete(ApiResponse(200, sessionBody, headers: sessionHeaders));
      await check;
      expect(published, isFalse);
      expect(coordinator.boundary, CookieLifecycleBoundary.ready);
    },
  );
}

class ObservingCoordinator extends CookieRequestCoordinator {
  ObservingCoordinator(
    ApiConfiguration configuration,
    DateTime Function() clock,
  ) : super(configuration: configuration, clock: clock);
  final observations = <List<bool>>[];
  @override
  bool acceptMetadata(
    CoordinatedCookieRequest ticket,
    ApiResponseMetadata metadata,
  ) {
    final accepted = super.acceptMetadata(ticket, metadata);
    if (accepted) {
      observations.add([
        hasProtocolCookie('__Host-authjs.csrf-token'),
        hasProtocolCookie('__Secure-authjs.session-token'),
      ]);
    }
    return accepted;
  }
}

void hardeningTests() {
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );
  final token = List.filled(64, 'a').join();
  final hash = List.filled(64, 'b').join();
  final bootstrap = ApiResponse(
    200,
    jsonEncode({'csrfToken': token}),
    headers: {
      'set-cookie': [
        '__Host-authjs.csrf-token=$token%7C$hash; Path=/; Secure; HttpOnly',
      ],
    },
  );
  const sessionCookie =
      '__Secure-authjs.session-token=FAKE-JWE.newer.session; Path=/; Secure; HttpOnly';
  final sessionBody = jsonEncode({
    'user': {'id': 'fixture', 'role': 'USER', 'whatsappVerified': false},
    'expires': DateTime.now()
        .toUtc()
        .add(const Duration(days: 1))
        .toIso8601String(),
  });
  Future<ApiResponse> good(ApiRequest r) async => r.uri.path == '/api/auth/csrf'
      ? bootstrap
      : r.uri.path == '/api/auth/callback/password'
      ? const ApiResponse(
          200,
          '{"url":"/"}',
          headers: {
            'set-cookie': [sessionCookie],
          },
        )
      : ApiResponse(200, sessionBody);
  PasswordAuthProtocol harness(
    CookieRequestCoordinator c,
    ProtocolTransport t,
  ) => PasswordAuthProtocol(
    client: ApiClient(configuration: config, transport: t),
    coordinator: c,
  );
  for (final bad in [
    ApiResponse(200, jsonEncode({'csrfToken': token})),
    ApiResponse(200, jsonEncode({'csrfToken': ''})),
    ApiResponse(200, jsonEncode({'csrfToken': 'malformed'})),
    ApiResponse(
      200,
      jsonEncode({'csrfToken': token}),
      headers: {
        'set-cookie': ['__Host-authjs.csrf-token=; Path=/; Max-Age=0'],
      },
    ),
    ApiResponse(
      200,
      jsonEncode({'csrfToken': token}),
      headers: {
        'set-cookie': [
          '__Host-authjs.csrf-token=$hash%7C$hash; Path=/; Secure; HttpOnly',
        ],
      },
    ),
    ApiResponse(
      200,
      jsonEncode({'csrfToken': token}),
      headers: {
        'set-cookie': [
          '__Host-authjs.csrf-token=$token%7Cbad; Path=/; Secure; HttpOnly',
        ],
      },
    ),
  ]) {
    test(
      'incomplete bootstrap rejects before credentials ${bad.hashCode}',
      () async {
        final c = CookieRequestCoordinator(
          configuration: config,
          clock: DateTime.now,
        );
        final t = ProtocolTransport((_) async => bad);
        await expectLater(
          harness(c, t).signIn(email: 'fixture', password: 'synthetic'),
          throwsA(isA<ApiException>()),
        );
        expect(t.requests.length, 1);
      },
    );
  }
  test(
    'simultaneous calls on same harness preserve active operation',
    () async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final entered = Completer<void>();
      final release = Completer<ApiResponse>();
      final t = ProtocolTransport((r) {
        if (r.uri.path == '/api/auth/csrf') {
          entered.complete();
          return release.future;
        }
        return good(r);
      });
      final h = harness(c, t);
      final pending = h.signIn(email: 'fixture', password: 'synthetic');
      await entered.future;
      final gen = c.generation;
      await expectLater(
        h.signIn(email: 'other', password: 'synthetic'),
        throwsA(isA<ApiException>()),
      );
      expect(c.generation, gen);
      release.complete(bootstrap);
      expect((await pending).authenticatedSnapshot, true);
    },
  );
  for (final blockedPath in ['/api/auth/csrf', '/api/auth/callback/password']) {
    test(
      'older $blockedPath failure cannot corrupt shared newer session',
      () async {
        final c = CookieRequestCoordinator(
          configuration: config,
          clock: DateTime.now,
        );
        final entered = Completer<void>();
        final release = Completer<ApiResponse>();
        final old = harness(
          c,
          ProtocolTransport((r) {
            if (r.uri.path == blockedPath) {
              entered.complete();
              return release.future;
            }
            return good(r);
          }),
        );
        final newer = harness(c, ProtocolTransport(good));
        final pending = old.signIn(email: 'old', password: 'synthetic');
        await entered.future;
        final check = expectLater(
          pending,
          throwsA(isA<CookieLifecycleInvalidated>()),
        );
        final current = newer.signIn(email: 'new', password: 'synthetic');
        release.complete(
          const ApiResponse(
            503,
            '{}',
            headers: {
              'set-cookie': [
                '__Secure-authjs.session-token=; Path=/; Max-Age=0',
              ],
            },
          ),
        );
        await check;
        expect((await current).authenticatedSnapshot, true);
        expect(c.hasProtocolCookie('__Secure-authjs.session-token'), true);
        expect(c.boundary, CookieLifecycleBoundary.ready);
        // The old operation has completed; repeating its failure cannot run cleanup again.
      },
    );
  }
  test('error cookies apply before outer failure cleanup', () async {
    final c = ObservingCoordinator(config, DateTime.now);
    final t = ProtocolTransport(
      (r) => r.uri.path == '/api/auth/csrf'
          ? Future.value(bootstrap)
          : Future.value(
              const ApiResponse(
                403,
                '{}',
                headers: {
                  'set-cookie': [
                    '__Host-authjs.csrf-token=; Path=/; Max-Age=0',
                    sessionCookie,
                  ],
                },
              ),
            ),
    );
    try {
      await harness(c, t).signIn(email: 'fixture', password: 'synthetic');
      fail('Expected rejection');
    } on ApiException catch (e) {
      expect(e.responseMetadata, isNull);
    }
    expect(c.observations, [
      [true, false],
      [false, true],
    ]);
    expect(c.hasProtocolCookie('__Secure-authjs.session-token'), false);
  });
  test(
    'body failure metadata applies deletions before sanitized failure',
    () async {
      final c = ObservingCoordinator(config, DateTime.now);
      final t = ProtocolTransport(
        (r) => r.uri.path == '/api/auth/csrf'
            ? Future.value(bootstrap)
            : Future.value(
                const ApiResponse(
                  200,
                  '',
                  bodyFailure: ApiBodyFailure.invalidEncoding,
                  headers: {
                    'set-cookie': [
                      '__Host-authjs.csrf-token=; Path=/; Max-Age=0',
                    ],
                  },
                ),
              ),
      );
      await expectLater(
        harness(c, t).signIn(email: 'fixture', password: 'synthetic'),
        throwsA(isA<ApiException>()),
      );
      expect(c.observations, [
        [true, false],
        [false, false],
      ]);
    },
  );
  test(
    'published session has no protocol cookies and safe JSON diagnostics',
    () async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final result = await harness(
        c,
        ProtocolTransport(good),
      ).signIn(email: 'fixture', password: 'synthetic');
      expect(result.cookies, isEmpty);
      expect(jsonEncode(result), '{"authenticatedSnapshot":true}');
    },
  );
}

void lateFailureTests() {
  for (final stage in ['/api/auth/csrf', '/api/auth/callback/password']) {
    test(
      'late $stage failure after newer authenticated result preserves credentials',
      () async {
        final config = ApiConfiguration(
          'https://approved.example.com',
          environment: ApiEnvironment.staging,
        );
        final token = List.filled(64, 'a').join(),
            hash = List.filled(64, 'b').join();
        final bootstrap = ApiResponse(
          200,
          jsonEncode({'csrfToken': token}),
          headers: {
            'set-cookie': [
              '__Host-authjs.csrf-token=$token%7C$hash; Path=/; Secure; HttpOnly',
            ],
          },
        );
        final c = CookieRequestCoordinator(
          configuration: config,
          clock: DateTime.now,
          operationTimeout: const Duration(milliseconds: 30),
        );
        final entered = Completer<void>(),
            release = Completer<ApiResponse>(),
            lateFinished = Completer<void>();
        Future<ApiResponse> good(ApiRequest r) async =>
            r.uri.path == '/api/auth/csrf'
            ? bootstrap
            : r.uri.path == '/api/auth/callback/password'
            ? const ApiResponse(
                200,
                '{"url":"/"}',
                headers: {
                  'set-cookie': [
                    '__Secure-authjs.session-token=FAKE-JWE.newer; Path=/; Secure; HttpOnly',
                  ],
                },
              )
            : ApiResponse(
                200,
                jsonEncode({
                  'user': {
                    'id': 'newer',
                    'role': 'USER',
                    'whatsappVerified': false,
                  },
                  'expires': DateTime.now()
                      .toUtc()
                      .add(const Duration(days: 1))
                      .toIso8601String(),
                }),
              );
        PasswordAuthProtocol make(ProtocolTransport t) => PasswordAuthProtocol(
          client: ApiClient(configuration: config, transport: t),
          coordinator: c,
        );
        final old = make(
          ProtocolTransport((r) async {
            if (r.uri.path == stage) {
              entered.complete();
              final response = await release.future;
              lateFinished.complete();
              return response;
            }
            return good(r);
          }),
        );
        final pending = old.signIn(email: 'old', password: 'synthetic');
        final check = expectLater(
          pending,
          throwsA(
            isA<ApiException>().having(
              (e) => e.failure,
              'timeout',
              ApiFailure.timeout,
            ),
          ),
        );
        await entered.future;
        await check;
        final newer = make(ProtocolTransport(good));
        expect(
          (await newer.signIn(
            email: 'newer',
            password: 'synthetic',
          )).authenticatedSnapshot,
          true,
        );
        final generation = c.generation;
        release.complete(
          const ApiResponse(
            503,
            '{}',
            headers: {
              'set-cookie': [
                '__Secure-authjs.session-token=; Path=/; Max-Age=0',
              ],
            },
          ),
        );
        await lateFinished.future;
        await Future<void>.delayed(Duration.zero);
        expect(c.generation, generation);
        expect(c.hasProtocolCookie('__Secure-authjs.session-token'), true);
      },
    );
  }
}
