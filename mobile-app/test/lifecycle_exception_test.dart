import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/lifecycle_diagnostics.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'protocol_ownership_test.dart' show OwnedTransport, callback, session;

class CountedTransport extends OwnedTransport {
  CountedTransport() : super(() async => callback, () async => session());
  int closes = 0;
  bool failClose = false;
  @override
  void close() {
    closes++;
    super.close();
    if (failClose) throw StateError('SYNTHETIC-PRIVATE-METADATA');
  }
}

class FailingInvalidation extends CookieRequestCoordinator {
  FailingInvalidation({required super.configuration, required super.clock});
  @override
  void invalidateForLogout() {
    super.invalidateForLogout();
    throw StateError('SYNTHETIC-PRIVATE-METADATA');
  }
}

void main() {
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );
  final reports = <FlutterErrorDetails>[];
  FlutterExceptionHandler? previous;
  setUp(() {
    previous = FlutterError.onError;
    FlutterError.onError = reports.add;
    reports.clear();
  });
  tearDown(() {
    try {
      for (final report in reports) {
        expect(
          report.toString(),
          isNot(contains('SYNTHETIC-PRIVATE-METADATA')),
        );
        expect(report.stack.toString(), isEmpty);
      }
    } finally {
      FlutterError.onError = previous;
    }
  });
  CookieRequestCoordinator coordinator() =>
      CookieRequestCoordinator(configuration: config, clock: DateTime.now);
  SignInController owner(CookieRequestCoordinator c, CountedTransport t) =>
      SignInController(
        PasswordAuthProtocol(
          client: ApiClient(configuration: config, transport: t),
          coordinator: c,
        ),
      );

  test('throwing first listener does not stop captured notifications', () {
    final c = coordinator();
    final calls = <int>[];
    c.addLifecycleListener(() {
      calls.add(1);
      throw StateError('SYNTHETIC-PRIVATE-METADATA');
    });
    c.addLifecycleListener(() {
      calls.add(2);
      expect(reports, isEmpty);
    });
    expect(c.beginAccountSwitch(), 1);
    expect(calls, [1, 2]);
    expect(c.boundary, CookieLifecycleBoundary.ready);
    expect(reports.single.exceptionAsString(), contains('listener failed'));
  });

  test(
    'listener failure during disposal still closes only owned client once',
    () async {
      final c = coordinator(), t = CountedTransport();
      final current = owner(c, t);
      expect(
        (await current
                .beginSignIn('fixture@example.com', 'Synthetic123')
                .result)
            .verified,
        isTrue,
      );
      var notified = false;
      c.addLifecycleListener(
        () => throw StateError('SYNTHETIC-PRIVATE-METADATA'),
      );
      c.addLifecycleListener(() {
        notified = true;
      });
      current.dispose();
      expect(notified, isTrue);
      expect(current.identity, isNull);
      expect(t.closes, 1);
      expect(t.closed, isTrue);
      expect(c.hasProtocolCookie('__Secure-authjs.session-token'), isFalse);
      expect(
        (await current
                .beginSignIn('fixture@example.com', 'Synthetic123')
                .result)
            .verified,
        isFalse,
      );
      current.dispose();
      expect(t.closes, 1);
      expect(reports, hasLength(1));
    },
  );

  test(
    'earlier cleanup and close failures do not prevent terminal disposal',
    () async {
      final c = FailingInvalidation(configuration: config, clock: DateTime.now);
      final t = CountedTransport()..failClose = true;
      final current = owner(c, t);
      expect(
        (await current
                .beginSignIn('fixture@example.com', 'Synthetic123')
                .result)
            .verified,
        isTrue,
      );
      current.dispose();
      expect(t.closed, isTrue);
      expect(t.closes, 1);
      expect(current.verified, isFalse);
      current.dispose();
      expect(t.closes, 1);
      expect(reports, hasLength(2));
    },
  );

  test(
    'nested environment transition survives listener failure and outer return',
    () async {
      final c = coordinator();
      final nested = ApiConfiguration(
        'http://localhost:8080',
        environment: ApiEnvironment.development,
      );
      var once = true;
      c.addLifecycleListener(() {
        if (!once) return;
        once = false;
        c.changeEnvironment(nested);
      });
      c.addLifecycleListener(
        () => throw StateError('SYNTHETIC-PRIVATE-METADATA'),
      );
      expect(c.beginAccountSwitch(), 1);
      expect(c.generation, 2);
      await c.coordinate('/api/auth/session', (ticket) async {
        expect(ticket.generation, 2);
        expect(ticket.snapshot.environment, ApiEnvironment.development);
        expect(ticket.snapshot.destination.origin, nested.baseUri.origin);
        expect(ticket.snapshot.requestOptions().cookies, isEmpty);
      });
      expect(reports, hasLength(2));
    },
  );

  test('listener additions and removals obey captured snapshot contract', () {
    final c = coordinator();
    final calls = <String>[];
    void removed() => calls.add('removed');
    void added() => calls.add('added');
    c.addLifecycleListener(() {
      calls.add('first');
      c.removeLifecycleListener(removed);
      c.addLifecycleListener(added);
      throw StateError('SYNTHETIC-PRIVATE-METADATA');
    });
    c.addLifecycleListener(removed);
    c.beginAccountSwitch();
    expect(calls, ['first', 'removed']);
    calls.clear();
    c.beginAccountSwitch();
    expect(calls, ['first', 'added']);
  });

  test('throwing listener cannot break nested admission ownership', () async {
    final c = coordinator(), at = CountedTransport(), bt = CountedTransport();
    c.addLifecycleListener(
      () => throw StateError('SYNTHETIC-PRIVATE-METADATA'),
    );
    final a = owner(c, at), b = owner(c, bt);
    SignInOperation? nested;
    var once = true;
    a.addListener(() {
      if (!once) return;
      once = false;
      nested = b.beginSignIn('nested@example.com', 'Synthetic123');
    });
    final outer = a.beginSignIn('outer@example.com', 'Synthetic123');
    expect((await outer.result).verified, isFalse);
    expect(at.calls, 0);
    expect((await nested!.result).verified, isTrue);
    final generation = c.generation, identity = b.identity;
    a.clearLocalSession();
    a.dispose();
    expect(c.generation, generation);
    expect(b.identity, same(identity));
    final value = await c.coordinate(
      '/api/auth/session',
      (ticket) async => ticket.snapshot
          .requestOptions()
          .cookies['__Secure-authjs.session-token'],
    );
    expect(value, 'FAKE-JWE.ownership.synthetic');
    expect(bt.closed, isFalse);
    b.dispose();
  });

  test('throwing diagnostic handler cannot interrupt transition', () {
    final c = coordinator();
    var reached = false;
    final before = LifecycleDiagnostics.reporterFailures;
    FlutterError.onError = (_) =>
        throw StateError('SYNTHETIC-PRIVATE-METADATA');
    c.addLifecycleListener(
      () => throw StateError('SYNTHETIC-PRIVATE-METADATA'),
    );
    c.addLifecycleListener(() {
      reached = true;
    });
    expect(c.beginAccountSwitch(), 1);
    expect(reached, isTrue);
    expect(
      LifecycleDiagnostics.reporterFailures,
      before < LifecycleDiagnostics.maximumCount ? before + 1 : before,
    );
  });

  test(
    'recursive reporter returns promptly and later reports remain enabled',
    () {
      var calls = 0;
      var nestedReturned = false;
      final before = LifecycleDiagnostics.suppressedReports;
      FlutterError.onError = (details) {
        calls++;
        reports.add(details);
        LifecycleDiagnostics.report(LifecycleFailure.disposal);
        nestedReturned = true;
      };
      LifecycleDiagnostics.report(LifecycleFailure.listener);
      expect(calls, 1);
      expect(nestedReturned, isTrue);
      expect(
        LifecycleDiagnostics.suppressedReports,
        before < LifecycleDiagnostics.maximumCount ? before + 1 : before,
      );
      FlutterError.onError = (details) {
        calls++;
        reports.add(details);
      };
      LifecycleDiagnostics.report(LifecycleFailure.disposal);
      expect(calls, 2);
      expect(reports, hasLength(2));
    },
  );

  test(
    'recursive throwing handler releases guard after each outer failure',
    () {
      var calls = 0;
      FlutterError.onError = (details) {
        calls++;
        reports.add(details);
        LifecycleDiagnostics.report(LifecycleFailure.listener);
        throw StateError('SYNTHETIC-PRIVATE-METADATA');
      };
      LifecycleDiagnostics.report(LifecycleFailure.listener);
      LifecycleDiagnostics.report(LifecycleFailure.disposal);
      expect(calls, 2);
      FlutterError.onError = reports.add;
      LifecycleDiagnostics.report(LifecycleFailure.listener);
      expect(reports, hasLength(3));
    },
  );

  test(
    'recursive diagnostic handler preserves committed coordinator state',
    () async {
      final c = coordinator();
      var notified = false;
      var calls = 0;
      FlutterError.onError = (details) {
        calls++;
        reports.add(details);
        LifecycleDiagnostics.report(LifecycleFailure.listener);
      };
      c.addLifecycleListener(
        () => throw StateError('SYNTHETIC-PRIVATE-METADATA'),
      );
      c.addLifecycleListener(() {
        notified = true;
      });
      expect(c.beginAccountSwitch(), 1);
      expect(notified, isTrue);
      expect(calls, 1);
      expect(c.generation, 1);
      expect(c.boundary, CookieLifecycleBoundary.ready);
      await c.coordinate('/api/auth/session', (ticket) async {
        expect(ticket.generation, 1);
        expect(ticket.snapshot.requestOptions().cookies, isEmpty);
      });
    },
  );

  test(
    'recursive diagnostics cannot skip remaining controller cleanup',
    () async {
      final c = FailingInvalidation(configuration: config, clock: DateTime.now);
      final t = CountedTransport()..failClose = true;
      final current = owner(c, t);
      expect(
        (await current
                .beginSignIn('fixture@example.com', 'Synthetic123')
                .result)
            .verified,
        isTrue,
      );
      final generation = c.generation;
      FlutterError.onError = (details) {
        reports.add(details);
        LifecycleDiagnostics.report(LifecycleFailure.disposal);
        throw StateError('SYNTHETIC-PRIVATE-METADATA');
      };
      current.dispose();
      expect(current.identity, isNull);
      expect(c.generation, generation + 1);
      expect(c.boundary, CookieLifecycleBoundary.locallyInvalidated);
      expect(c.hasProtocolCookie('__Secure-authjs.session-token'), isFalse);
      expect(t.closed, isTrue);
      expect(t.closes, 1);
      expect(reports, hasLength(2));
      current.dispose();
      expect(t.closes, 1);
      expect(
        (await current
                .beginSignIn('fixture@example.com', 'Synthetic123')
                .result)
            .verified,
        isFalse,
      );
    },
  );

  test('diagnostic counters saturate without recursive handler dispatch', () {
    var calls = 0;
    FlutterError.onError = (_) {
      calls++;
      LifecycleDiagnostics.report(LifecycleFailure.listener);
      throw StateError('SYNTHETIC-PRIVATE-METADATA');
    };
    for (var i = 0; i < LifecycleDiagnostics.maximumCount + 2; i++) {
      LifecycleDiagnostics.report(LifecycleFailure.listener);
    }
    expect(calls, LifecycleDiagnostics.maximumCount + 2);
    expect(
      LifecycleDiagnostics.reporterFailures,
      LifecycleDiagnostics.maximumCount,
    );
    expect(
      LifecycleDiagnostics.suppressedReports,
      LifecycleDiagnostics.maximumCount,
    );
    FlutterError.onError = reports.add;
    LifecycleDiagnostics.report(LifecycleFailure.disposal);
    expect(reports, hasLength(1));
  });
}
