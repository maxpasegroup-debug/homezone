import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/in_memory_cookie_store.dart';

const session = '__Secure-authjs.session-token';
const csrf = '__Host-authjs.csrf-token';
String setCookie(String name, String value, [String extra = '']) =>
    '$name=$value; Path=/; Secure; HttpOnly$extra';
String deleteCookie(String name) => '$name=; Path=/; Max-Age=0';

void main() {
  late ApiConfiguration config;
  late DateTime now;
  late InMemoryCookieStore store;
  late CookieRequestCoordinator coordinator;
  Uri target() => config.endpoint('/api/auth/session', null);
  void apply(List<String> headers) => store.applyHeaders(
    headers,
    environment: config.environment,
    responseUri: target(),
  );
  Map<String, String> cookies() =>
      store.snapshot(target()).requestOptions().cookies;
  ApiResponseMetadata metadata(
    CoordinatedCookieRequest ticket,
    List<String> fields, {
    int status = 200,
    ApiBodyFailure? failure,
  }) => ApiResponseMetadata(
    status,
    {'Set-Cookie': fields},
    requestUri: ticket.snapshot.destination,
    bodyFailure: failure,
  );
  setUp(() {
    config = ApiConfiguration(
      'https://approved.example.com',
      environment: ApiEnvironment.staging,
    );
    now = DateTime.utc(2026, 10, 12);
    store = InMemoryCookieStore(configuration: config, clock: () => now);
    coordinator = CookieRequestCoordinator(
      configuration: config,
      clock: () => now,
    );
  });

  test('origin and environment isolation preserve existing state', () {
    apply([setCookie(session, 'original')]);
    for (final foreign in [
      Uri.parse('https://other.example/api/auth/session'),
      target(),
    ]) {
      expect(
        () => store.applyHeaders(
          [setCookie(session, 'foreign')],
          environment: foreign == target()
              ? ApiEnvironment.development
              : config.environment,
          responseUri: foreign,
        ),
        throwsA(isA<ApiException>()),
      );
    }
    expect(cookies()[session], 'original');
    expect(
      () => store.snapshot(Uri.parse('https://other.example/api/auth/session')),
      throwsA(isA<ApiException>()),
    );
  });
  test('exact values, replacement and safe diagnostics', () {
    apply([setCookie(session, 'opaque%2Ccredential')]);
    final snapshot = store.snapshot(target());
    final captured = snapshot.requestOptions();
    apply([setCookie(session, 'replacement')]);
    expect(captured.cookies[session], 'opaque%2Ccredential');
    expect(() => captured.cookies[session] = 'changed', throwsUnsupportedError);
    expect(snapshot.requestOptions, throwsA(isA<ApiException>()));
    expect(cookies()[session], 'replacement');
    expect('$store $snapshot $coordinator', isNot(contains('credential')));
  });
  test('policy rejection clears credentials with sanitized error', () {
    apply([setCookie(session, 'old')]);
    try {
      apply([
        '$session=secret; Path=/; Secure; HttpOnly; Domain=approved.example.com',
      ]);
      fail('Expected policy rejection');
    } on ApiException catch (error) {
      expect('$error', isNot(contains('secret')));
    }
    expect(cookies(), isEmpty);
  });
  test(
    'malformed headers fail closed; unrelated valid cookies are ignored',
    () {
      apply(['authjs.callback-url=opaque; Path=/']);
      expect(cookies(), isEmpty);
      apply([setCookie(session, 'old')]);
      expect(
        () => apply(['invalid cookie=value']),
        throwsA(isA<ApiException>()),
      );
      expect(cookies(), isEmpty);
    },
  );
  test('Max-Age is measured from receipt and overrides Expires', () {
    apply([
      setCookie(
        session,
        'value',
        '; Max-Age=10; Expires=Wed, 09 Jun 2021 10:18:14 GMT',
      ),
    ]);
    final snapshot = store.snapshot(target());
    now = now.add(const Duration(seconds: 9));
    expect(cookies()[session], 'value');
    now = now.add(const Duration(seconds: 1));
    expect(snapshot.requestOptions().cookies, isEmpty);
    expect(cookies(), isEmpty);
  });
  test('expired instructions and deletion remove credentials', () {
    apply([setCookie(session, 'old')]);
    apply([
      setCookie(session, 'expired', '; Expires=Wed, 09 Jun 2021 10:18:14 GMT'),
    ]);
    expect(cookies(), isEmpty);
    apply([setCookie(session, 'new')]);
    apply([deleteCookie(session)]);
    expect(cookies(), isEmpty);
  });
  test('HTTP development uses only unprefixed cookie names', () {
    config = ApiConfiguration(
      'http://localhost:3000',
      environment: ApiEnvironment.development,
    );
    store = InMemoryCookieStore(configuration: config, clock: () => now);
    apply(['authjs.session-token=local; Path=/; HttpOnly']);
    expect(cookies()['authjs.session-token'], 'local');
    expect(
      () => apply([setCookie(session, 'invalid')]),
      throwsA(isA<ApiException>()),
    );
  });
  test('complete chunks replace old cohort without retaining fragments', () {
    apply([for (var i = 0; i < 3; i++) setCookie('$session.$i', 'old$i')]);
    apply([setCookie('$session.1', 'new1'), setCookie('$session.0', 'new0')]);
    expect(cookies(), {'$session.0': 'new0', '$session.1': 'new1'});
    expect(cookies().keys.toList(), ['$session.0', '$session.1']);
  });
  test(
    'cleanup followed by replacement supports chunk and root transitions',
    () {
      apply([setCookie(session, 'root')]);
      apply([
        deleteCookie(session),
        setCookie('$session.0', 'a'),
        setCookie('$session.1', 'b'),
      ]);
      apply([
        deleteCookie('$session.0'),
        deleteCookie('$session.1'),
        setCookie(session, 'newroot'),
      ]);
      expect(cookies(), {session: 'newroot'});
    },
  );
  test('missing chunks mixed forms and duplicate assignments fail closed', () {
    for (final batch in [
      [setCookie('$session.1', 'missing')],
      [setCookie('$session.0', 'a'), setCookie('$session.2', 'gap')],
      [setCookie(session, 'root'), setCookie('$session.0', 'mixed')],
      [setCookie(session, 'a'), setCookie(session, 'b')],
    ]) {
      apply([setCookie(session, 'old')]);
      expect(() => apply(batch), throwsA(isA<ApiException>()));
      expect(cookies(), isEmpty);
    }
  });
  test('partial deletion invalidates entire session cohort', () {
    apply([setCookie('$session.0', 'a'), setCookie('$session.1', 'b')]);
    apply([deleteCookie('$session.1')]);
    expect(cookies(), isEmpty);
  });
  test('deleting a newly assigned fragment is rejected atomically', () {
    expect(
      () => apply([setCookie('$session.0', 'a'), deleteCookie('$session.0')]),
      throwsA(isA<ApiException>()),
    );
    expect(cookies(), isEmpty);
  });
  test('expiry of one chunk invalidates the complete cohort', () {
    apply([
      setCookie('$session.0', 'a', '; Max-Age=1'),
      setCookie('$session.1', 'b'),
    ]);
    now = now.add(const Duration(seconds: 1));
    expect(cookies(), isEmpty);
  });
  test('CSRF is separate and never establishes authenticated status', () {
    apply([setCookie(csrf, 'csrf-only', '; Max-Age=1')]);
    expect(cookies(), {csrf: 'csrf-only'});
    apply([setCookie(session, 'session')]);
    now = now.add(const Duration(seconds: 1));
    expect(cookies(), {session: 'session'});
  });
  test('clear invalidates prior snapshots', () {
    apply([setCookie(session, 'old')]);
    final snapshot = store.snapshot(target());
    store.clear();
    expect(snapshot.requestOptions, throwsA(isA<ApiException>()));
    expect(cookies(), isEmpty);
  });
  test(
    'requests serialize and the next snapshot sees the committed cohort',
    () async {
      final entered = Completer<void>();
      final finish = Completer<void>();
      var secondStarted = false;
      final first = coordinator.coordinate('/api/auth/session', (ticket) async {
        entered.complete();
        await finish.future;
        expect(
          coordinator.acceptMetadata(
            ticket,
            metadata(ticket, [setCookie(session, 'new')]),
          ),
          isTrue,
        );
      });
      await entered.future;
      final second = coordinator.coordinate('/api/auth/session', (
        ticket,
      ) async {
        secondStarted = true;
        expect(ticket.snapshot.requestOptions().cookies[session], 'new');
      });
      await Future<void>.delayed(Duration.zero);
      expect(secondStarted, isFalse);
      finish.complete();
      await Future.wait([first, second]);
    },
  );
  test(
    'completed and duplicate response tickets cannot overwrite newer state',
    () async {
      late CoordinatedCookieRequest old;
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        old = ticket;
        expect(
          coordinator.acceptMetadata(
            ticket,
            metadata(ticket, [setCookie(session, 'first')]),
          ),
          isTrue,
        );
        expect(
          coordinator.acceptMetadata(
            ticket,
            metadata(ticket, [deleteCookie(session)]),
          ),
          isFalse,
        );
      });
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        expect(
          coordinator.acceptMetadata(
            old,
            metadata(old, [setCookie(session, 'stale')]),
          ),
          isFalse,
        );
        expect(ticket.snapshot.requestOptions().cookies[session], 'first');
      });
    },
  );
  test(
    'logout rejects in-flight response and queued old-generation work',
    () async {
      final entered = Completer<CoordinatedCookieRequest>();
      final finish = Completer<void>();
      final first = coordinator.coordinate('/api/auth/session', (ticket) async {
        entered.complete(ticket);
        await finish.future;
      });
      final ticket = await entered.future;
      final queued = coordinator.coordinate(
        '/api/auth/session',
        (_) async => fail('Obsolete queued request ran'),
      );
      final firstCheck = expectLater(
        first,
        throwsA(isA<CookieLifecycleInvalidated>()),
      );
      final queuedCheck = expectLater(
        queued,
        throwsA(isA<CookieLifecycleInvalidated>()),
      );
      coordinator.invalidateForLogout();
      expect(coordinator.generation, 1);
      expect(coordinator.boundary, CookieLifecycleBoundary.locallyInvalidated);
      expect(ticket.snapshot.requestOptions, throwsA(isA<ApiException>()));
      expect(
        coordinator.acceptMetadata(
          ticket,
          metadata(ticket, [setCookie(session, 'late')]),
        ),
        isFalse,
      );
      finish.complete();
      await Future.wait([firstCheck, queuedCheck]);
      await expectLater(
        coordinator.coordinate('/api/auth/session', (_) async {}),
        throwsA(isA<CookieLifecycleInvalidated>()),
      );
    },
  );
  test(
    'account switching and environment changes start empty generations',
    () async {
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        coordinator.acceptMetadata(
          ticket,
          metadata(ticket, [setCookie(session, 'old')]),
        );
      });
      coordinator.beginAccountSwitch();
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        expect(ticket.snapshot.requestOptions().cookies, isEmpty);
      });
      coordinator.changeEnvironment(
        ApiConfiguration(
          'http://localhost:3000',
          environment: ApiEnvironment.development,
        ),
      );
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        expect(ticket.generation, 2);
        expect(ticket.snapshot.origin, 'http://localhost:3000');
        expect(ticket.snapshot.requestOptions().cookies, isEmpty);
      });
    },
  );
  test(
    'error and failed-body metadata still applies cookie deletion',
    () async {
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        coordinator.acceptMetadata(
          ticket,
          metadata(ticket, [setCookie(session, 'old')]),
        );
      });
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        expect(
          coordinator.acceptMetadata(
            ticket,
            metadata(
              ticket,
              [deleteCookie(session)],
              status: 503,
              failure: ApiBodyFailure.tooLarge,
            ),
          ),
          isTrue,
        );
      });
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        expect(ticket.snapshot.requestOptions().cookies, isEmpty);
      });
    },
  );
  test('wrong response URL is rejected without committing it', () async {
    await coordinator.coordinate('/api/auth/session', (ticket) async {
      expect(
        () => coordinator.acceptMetadata(
          ticket,
          ApiResponseMetadata(
            200,
            {},
            requestUri: Uri.parse('https://other.example/api/auth/session'),
          ),
        ),
        throwsA(isA<ApiException>()),
      );
      expect(coordinator.acceptMetadata(ticket, metadata(ticket, [])), isTrue);
    });
  });
  test(
    'nested scheduling fails safely and does not deadlock the queue',
    () async {
      await expectLater(
        coordinator.coordinate('/api/auth/session', (_) async {
          await coordinator.coordinate('/api/auth/session', (_) async {});
        }),
        throwsA(isA<ApiException>()),
      );
      await coordinator.coordinate('/api/auth/session', (_) async {});
    },
  );
  test(
    'timeout releases queue and late metadata cannot restore credentials',
    () async {
      coordinator = CookieRequestCoordinator(
        configuration: config,
        clock: () => now,
        operationTimeout: const Duration(milliseconds: 10),
      );
      late CoordinatedCookieRequest old;
      final blocked = Completer<void>();
      await expectLater(
        coordinator.coordinate('/api/auth/session', (ticket) async {
          old = ticket;
          await blocked.future;
        }),
        throwsA(
          isA<ApiException>().having(
            (e) => e.failure,
            'failure',
            ApiFailure.timeout,
          ),
        ),
      );
      await coordinator.coordinate('/api/auth/session', (ticket) async {
        expect(
          coordinator.acceptMetadata(
            old,
            metadata(old, [setCookie(session, 'late')]),
          ),
          isFalse,
        );
        expect(ticket.snapshot.requestOptions().cookies, isEmpty);
      });
      blocked.complete();
    },
  );
  test('unexpected operation failures do not reveal credentials', () async {
    await expectLater(
      coordinator.coordinate('/api/auth/session', (_) async {
        throw StateError('synthetic-secret');
      }),
      throwsA(
        isA<ApiException>().having(
          (e) => '$e',
          'sanitized',
          isNot(contains('synthetic-secret')),
        ),
      ),
    );
  });
}
