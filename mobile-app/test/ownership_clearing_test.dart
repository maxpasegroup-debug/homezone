import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/homezone_app.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'sign_in_integration_test.dart' show UiTransport;
import 'widget_test.dart' as helpers;

class BlockedStageTransport implements ApiTransport {
  BlockedStageTransport(this.delegate, this.path);
  final ApiTransport delegate;
  final String path;
  final entered = Completer<void>();
  final release = Completer<ApiResponse>();
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) {
    if (request.uri.path == path) {
      entered.complete();
      return release.future;
    }
    return delegate.send(request, timeout, onHeaders: onHeaders);
  }

  @override
  void close() => delegate.close();
}

void main() {
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );
  final initial = DateTime.utc(2030);
  const accepted = ApiResponse(
    200,
    '{"url":"/"}',
    headers: {
      'set-cookie': [
        '__Secure-authjs.session-token=FAKE-JWE.owned; Path=/; Secure; HttpOnly',
      ],
    },
  );
  ApiResponse session(DateTime expiry) => ApiResponse(
    200,
    jsonEncode({
      'user': {'id': 'fixture', 'role': 'USER', 'whatsappVerified': false},
      'expires': expiry.toIso8601String(),
    }),
  );
  ApiTransport good(DateTime expiry) =>
      UiTransport(() async => accepted, () async => session(expiry));
  SignInController owner(
    CookieRequestCoordinator c,
    ApiTransport t,
    DateTime Function() clock,
  ) => SignInController(
    PasswordAuthProtocol(
      client: ApiClient(configuration: config, transport: t),
      coordinator: c,
    ),
    clock: clock,
  );

  test(
    'undisposed obsolete owner cannot explicitly clear newer state or cookies',
    () async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: () => initial,
      );
      final old = owner(
        c,
        good(initial.add(const Duration(days: 1))),
        () => initial,
      );
      final newer = owner(
        c,
        good(initial.add(const Duration(days: 1))),
        () => initial,
      );
      try {
        expect(
          (await old.beginSignIn('old', 'synthetic').result).verified,
          true,
        );
        expect(
          (await newer.beginSignIn('new', 'synthetic').result).verified,
          true,
        );
        final generation = c.generation, identity = newer.identity;
        old.clearLocalSession();
        expect(c.generation, generation);
        expect(newer.identity, same(identity));
        expect(newer.verified, true);
        expect(c.hasProtocolCookie('__Secure-authjs.session-token'), true);
        newer.clearLocalSession();
        expect(newer.identity, isNull);
        expect(c.generation, generation + 1);
        expect(c.hasProtocolCookie('__Secure-authjs.session-token'), false);
      } finally {
        old.dispose();
        newer.dispose();
      }
    },
  );
  test(
    'identity read fails at exact expiry without waiting for timer',
    () async {
      var now = initial;
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: () => now,
      );
      final current = owner(
        c,
        good(initial.add(const Duration(seconds: 10))),
        () => now,
      );
      try {
        expect(
          (await current.beginSignIn('fixture', 'synthetic').result).verified,
          true,
        );
        now = initial.add(const Duration(seconds: 10));
        expect(current.identity, isNull);
        expect(current.verified, false);
      } finally {
        current.dispose();
      }
    },
  );
  testWidgets('old expiry timer cannot invalidate newer generation', (
    tester,
  ) async {
    var now = initial;
    final c = CookieRequestCoordinator(configuration: config, clock: () => now);
    final old = owner(
      c,
      good(initial.add(const Duration(seconds: 10))),
      () => now,
    );
    final newer = owner(
      c,
      good(initial.add(const Duration(seconds: 20))),
      () => now,
    );
    try {
      expect((await old.beginSignIn('old', 'synthetic').result).verified, true);
      expect(
        (await newer.beginSignIn('new', 'synthetic').result).verified,
        true,
      );
      final generation = c.generation;
      now = initial.add(const Duration(seconds: 11));
      await tester.pump(const Duration(seconds: 11));
      expect(c.generation, generation);
      expect(newer.verified, true);
      now = initial.add(const Duration(seconds: 20));
      await tester.pump(const Duration(seconds: 9));
      expect(newer.verified, false);
      expect(c.generation, generation + 1);
    } finally {
      old.dispose();
      newer.dispose();
    }
  });
  for (final path in ['/api/auth/csrf', '/api/auth/callback/password']) {
    testWidgets('screen unmount during $path rejects late authority', (
      tester,
    ) async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: () => initial,
      );
      final transport = BlockedStageTransport(
        good(initial.add(const Duration(days: 1))),
        path,
      );
      final current = owner(c, transport, () => initial);
      await tester.pumpWidget(
        HomezoneApp(initialRoute: '/sign-in', signInController: current),
      );
      await helpers.fill(tester, 'Email address', 'fixture@example.com');
      await helpers.fill(tester, 'Password', 'Synthetic123');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Sign In'));
      await tester.tap(find.text('Sign In'));
      await tester.pump();
      expect(transport.entered.isCompleted, true);
      await tester.pumpWidget(const SizedBox());
      final generation = c.generation;
      transport.release.complete(accepted);
      await tester.pumpAndSettle();
      expect(current.verified, false);
      expect(c.generation, generation);
      expect(c.hasProtocolCookie('__Secure-authjs.session-token'), false);
    });
  }
  testWidgets(
    'obsolete completion after newer success cannot overwrite or clear state',
    (tester) async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: () => initial,
        operationTimeout: const Duration(seconds: 1),
      );
      final transport = BlockedStageTransport(
        good(initial.add(const Duration(days: 1))),
        '/api/auth/session',
      );
      final old = owner(c, transport, () => initial),
          newer = owner(
            c,
            good(initial.add(const Duration(days: 1))),
            () => initial,
          );
      try {
        final pending = old.beginSignIn('old', 'synthetic');
        await tester.pump();
        expect(transport.entered.isCompleted, true);
        await tester.pump(const Duration(seconds: 1));
        expect((await pending.result).verified, false);
        expect(
          (await newer.beginSignIn('new', 'synthetic').result).verified,
          true,
        );
        final generation = c.generation, identity = newer.identity;
        transport.release.complete(
          session(initial.add(const Duration(days: 1))),
        );
        await tester.pump();
        old.clearLocalSession();
        expect(c.generation, generation);
        expect(newer.identity, same(identity));
        expect(c.hasProtocolCookie('__Secure-authjs.session-token'), true);
      } finally {
        old.dispose();
        newer.dispose();
      }
    },
  );
}
