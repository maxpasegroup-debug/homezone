import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'sign_in_integration_test.dart' show UiTransport;

class OwnedTransport extends UiTransport {
  OwnedTransport(super.callback, super.session);
  bool closed = false;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) {
    if (closed) throw StateError('Transport closed');
    return super.send(request, timeout, onHeaders: onHeaders);
  }

  @override
  void close() => closed = true;
}

const callback = ApiResponse(
  200,
  '{"url":"/"}',
  headers: {
    'set-cookie': [
      '__Secure-authjs.session-token=FAKE-JWE.ownership.synthetic; Path=/; Secure; HttpOnly',
    ],
  },
);
ApiResponse session() => ApiResponse(
  200,
  jsonEncode({
    'user': {
      'id': 'synthetic-owner',
      'role': 'USER',
      'whatsappVerified': false,
    },
    'expires': DateTime.now()
        .toUtc()
        .add(const Duration(days: 1))
        .toIso8601String(),
  }),
);

void main() {
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );

  test(
    'reentrant admission rejects outer owner and preserves exact nested credential',
    () async {
      final coordinator = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final entered = Completer<void>();
      final finish = Completer<ApiResponse>();
      final aTransport = OwnedTransport(
        () async => callback,
        () async => session(),
      );
      final bTransport = OwnedTransport(() async => callback, () {
        entered.complete();
        return finish.future;
      });
      SignInController owner(OwnedTransport transport) => SignInController(
        PasswordAuthProtocol(
          client: ApiClient(configuration: config, transport: transport),
          coordinator: coordinator,
        ),
      );
      final a = owner(aTransport), b = owner(bTransport);
      SignInOperation? nested;
      var once = true;
      a.addListener(() {
        if (!once) return;
        once = false;
        nested = b.beginSignIn('nested@example.com', 'Synthetic123');
      });
      final outer = a.beginSignIn('outer@example.com', 'Synthetic123');
      expect(
        nested,
        isNotNull,
      ); // B was admitted synchronously before A returned.
      expect((await outer.result).verified, isFalse);
      expect(aTransport.calls, 0); // Superseded admission never dispatches.
      expect(coordinator.generation, 2);
      await entered.future;
      final generation = coordinator.generation;
      a.clearLocalSession();
      expect(coordinator.generation, generation);
      finish.complete(session());
      expect((await nested!.result).verified, isTrue);
      final identity = b.identity;
      Future<String?> cookie() => coordinator.coordinate(
        '/api/auth/session',
        (ticket) async => ticket.snapshot
            .requestOptions()
            .cookies['__Secure-authjs.session-token'],
      );
      final original = await cookie();
      expect(original, 'FAKE-JWE.ownership.synthetic');
      a.clearLocalSession();
      a.dispose();
      expect(b.identity, same(identity));
      expect(coordinator.generation, generation);
      expect(await cookie(), original);
      expect(bTransport.closed, isFalse);
      b.clearLocalSession();
      expect(b.verified, isFalse);
      expect(
        coordinator.hasProtocolCookie('__Secure-authjs.session-token'),
        isFalse,
      );
      b.dispose();
    },
  );

  test(
    'account switch returns its minted generation despite nested switch',
    () {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      expect(c.beginAccountSwitch(), 1); // Ordinary admission.
      var once = true;
      int? nested;
      c.addLifecycleListener(() {
        if (!once) return;
        once = false;
        nested = c.beginAccountSwitch();
      });
      final outer = c.beginAccountSwitch();
      expect(outer, 2);
      expect(nested, 3);
      expect(c.generation, nested);
      expect(outer, isNot(nested));
    },
  );

  test('nested logout cannot be reopened by an outer account switch', () {
    final c = CookieRequestCoordinator(
      configuration: config,
      clock: DateTime.now,
    );
    var once = true;
    c.addLifecycleListener(() {
      if (!once) return;
      once = false;
      c.invalidateForLogout();
    });
    final outer = c.beginAccountSwitch();
    expect(outer, 1);
    expect(c.generation, 2);
    expect(c.boundary, CookieLifecycleBoundary.locallyInvalidated);
  });

  test(
    'rejected nested shared-protocol admission cannot disrupt outer owner',
    () async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final transport = OwnedTransport(
        () async => callback,
        () async => session(),
      );
      final protocol = PasswordAuthProtocol(
        client: ApiClient(configuration: config, transport: transport),
        coordinator: c,
      );
      final a = SignInController(protocol),
          rejected = SignInController(protocol);
      SignInOperation? nested;
      var once = true;
      a.addListener(() {
        if (!once) return;
        once = false;
        nested = rejected.beginSignIn('nested@example.com', 'Synthetic123');
        rejected.clearLocalSession();
        rejected.dispose();
      });
      final outer = a.beginSignIn('outer@example.com', 'Synthetic123');
      expect(nested, isNotNull);
      expect((await nested!.result).verified, isFalse);
      expect((await outer.result).verified, isTrue);
      expect(c.generation, 1);
      expect(transport.closed, isFalse);
      final value = await c.coordinate(
        '/api/auth/session',
        (ticket) async => ticket.snapshot
            .requestOptions()
            .cookies['__Secure-authjs.session-token'],
      );
      expect(value, 'FAKE-JWE.ownership.synthetic');
      a.dispose();
    },
  );

  for (final shareClient in [false, true]) {
    test(
      'rejected controller cannot clear or dispose active ${shareClient ? 'client' : 'protocol'}',
      () async {
        final entered = Completer<void>();
        final finish = Completer<ApiResponse>();
        final transport = OwnedTransport(() async => callback, () {
          entered.complete();
          return finish.future;
        });
        final client = ApiClient(configuration: config, transport: transport);
        final coordinator = CookieRequestCoordinator(
          configuration: config,
          clock: DateTime.now,
        );
        final protocol = PasswordAuthProtocol(
          client: client,
          coordinator: coordinator,
        );
        final a = SignInController(protocol);
        final operation = a.beginSignIn('fixture@example.com', 'Synthetic123');
        await entered.future;
        final generation = coordinator.generation;
        expect(
          coordinator.hasProtocolCookie('__Secure-authjs.session-token'),
          isTrue,
        );
        final b = SignInController(
          shareClient
              ? PasswordAuthProtocol(client: client, coordinator: coordinator)
              : protocol,
        );
        expect(
          (await b.beginSignIn('other@example.com', 'Synthetic123').result)
              .verified,
          isFalse,
        );
        b.clearLocalSession();
        expect(coordinator.generation, generation);
        expect(
          coordinator.hasProtocolCookie('__Secure-authjs.session-token'),
          isTrue,
        );
        b.dispose();
        expect(transport.closed, isFalse);
        expect(coordinator.generation, generation);
        finish.complete(session());
        expect((await operation.result).verified, isTrue);
        final identity = a.identity;
        expect(identity?.id, 'synthetic-owner');
        b.clearLocalSession();
        expect(a.identity, same(identity));
        expect(coordinator.generation, generation);
        await expectLater(
          protocol.signIn(
            email: 'fixture@example.com',
            password: 'Synthetic123',
          ),
          throwsA(isA<ApiException>()),
        );
        expect(coordinator.generation, generation);
        a.clearLocalSession();
        expect(a.verified, isFalse);
        expect(
          coordinator.hasProtocolCookie('__Secure-authjs.session-token'),
          isFalse,
        );
        a.dispose();
        expect(transport.closed, isTrue);
      },
    );
  }

  test('busy standalone protocol cannot be acquired by a controller', () async {
    final entered = Completer<void>();
    final finish = Completer<ApiResponse>();
    final transport = OwnedTransport(() async => callback, () {
      entered.complete();
      return finish.future;
    });
    final client = ApiClient(configuration: config, transport: transport);
    final coordinator = CookieRequestCoordinator(
      configuration: config,
      clock: DateTime.now,
    );
    final protocol = PasswordAuthProtocol(
      client: client,
      coordinator: coordinator,
    );
    final pending = protocol.signIn(
      email: 'fixture@example.com',
      password: 'Synthetic123',
    );
    await entered.future;
    final generation = coordinator.generation;
    final rejected = SignInController(protocol);
    expect(
      (await rejected.beginSignIn('other@example.com', 'Synthetic123').result)
          .verified,
      isFalse,
    );
    rejected.clearLocalSession();
    rejected.dispose();
    expect(coordinator.generation, generation);
    expect(transport.closed, isFalse);
    finish.complete(session());
    expect((await pending).authenticatedSnapshot, isTrue);
    client.close();
  });

  test('independent resource owners sign in and clear normally', () async {
    final owners = <SignInController>[];
    for (var i = 0; i < 2; i++) {
      final coordinator = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      owners.add(
        SignInController(
          PasswordAuthProtocol(
            client: ApiClient(
              configuration: config,
              transport: OwnedTransport(
                () async => callback,
                () async => session(),
              ),
            ),
            coordinator: coordinator,
          ),
        ),
      );
    }
    for (final owner in owners) {
      expect(
        (await owner.beginSignIn('fixture@example.com', 'Synthetic123').result)
            .verified,
        isTrue,
      );
    }
    owners.first.clearLocalSession();
    expect(owners.first.verified, isFalse);
    expect(owners.last.verified, isTrue);
    owners.last.clearLocalSession();
    expect(owners.last.verified, isFalse);
    for (final owner in owners) {
      owner.dispose();
    }
  });
}
