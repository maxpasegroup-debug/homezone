import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'package:homezone_mobile/app/homezone_app.dart';
import 'package:homezone_mobile/features/buyer/buyer_shell.dart';
import 'package:homezone_mobile/app/session_scope.dart';
import 'sign_in_integration_test.dart' show UiTransport;
import 'widget_test.dart' as helpers;

void main() {
  final config = ApiConfiguration(
    'https://approved.example.com',
    environment: ApiEnvironment.staging,
  );
  const accepted = ApiResponse(
    200,
    '{"url":"/"}',
    headers: {
      'set-cookie': [
        '__Secure-authjs.session-token=FAKE-JWE.synthetic; Path=/; Secure; HttpOnly',
      ],
    },
  );
  ApiResponse verified() => ApiResponse(
    200,
    jsonEncode({
      'user': {'id': 'fixture', 'role': 'USER', 'whatsappVerified': false},
      'expires': DateTime.now()
          .toUtc()
          .add(const Duration(days: 1))
          .toIso8601String(),
    }),
  );
  SignInController make(
    CookieRequestCoordinator c,
    Future<ApiResponse> Function() session,
  ) => SignInController(
    PasswordAuthProtocol(
      client: ApiClient(
        configuration: config,
        transport: UiTransport(() async => accepted, session),
      ),
      coordinator: c,
    ),
  );
  test(
    'app owner publishes minimal identity only after verification and clears on invalidation',
    () async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final finish = Completer<ApiResponse>();
      final owner = make(c, () => finish.future);
      try {
        final operation = owner.beginSignIn('fixture@example.com', 'synthetic');
        await Future<void>.delayed(Duration.zero);
        expect(owner.verified, false);
        expect(owner.identity, isNull);
        finish.complete(verified());
        expect((await operation.result).verified, true);
        expect(owner.identity!.id, 'fixture');
        expect(owner.identity!.role, 'USER');
        expect(owner.identity.toString(), isNot(contains('FAKE')));
        c.invalidateForLogout();
        expect(owner.verified, false);
        expect(owner.identity, isNull);
      } finally {
        owner.dispose();
      }
    },
  );
  test('invalid session never publishes owned state', () async {
    final c = CookieRequestCoordinator(
      configuration: config,
      clock: DateTime.now,
    );
    final owner = make(c, () async => const ApiResponse(200, 'null'));
    try {
      expect(
        (await owner.beginSignIn('fixture', 'synthetic').result).verified,
        false,
      );
      expect(owner.verified, false);
    } finally {
      owner.dispose();
    }
  });
  test(
    'old cancelled operation or owner disposal cannot clear newer verified session',
    () async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final entered = Completer<void>(), finish = Completer<ApiResponse>();
      final old = make(c, () {
        entered.complete();
        return finish.future;
      });
      final operation = old.beginSignIn('old', 'synthetic');
      await entered.future;
      final newer = make(c, () async => verified());
      final pending = newer.beginSignIn('new', 'synthetic');
      operation.cancel(); // Old generation only; must not cancel the new one.
      finish.complete(verified());
      expect((await operation.result).verified, false);
      expect((await pending.result).verified, true);
      old.dispose();
      expect(newer.verified, true);
      newer.clearLocalSession();
      expect(newer.verified, false);
      newer.dispose();
    },
  );
  testWidgets(
    'disposing pending sign-in rejects late publication and navigation',
    (tester) async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final entered = Completer<void>(), finish = Completer<ApiResponse>();
      final owner = make(c, () {
        entered.complete();
        return finish.future;
      });
      await tester.pumpWidget(
        HomezoneApp(initialRoute: '/sign-in', signInController: owner),
      );
      await helpers.fill(tester, 'Email address', 'fixture@example.com');
      await helpers.fill(tester, 'Password', 'Synthetic123');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Sign In'));
      await tester.tap(find.text('Sign In'));
      await tester.pump();
      expect(entered.isCompleted, true);
      final context = tester.element(find.text('Welcome Back'));
      Navigator.of(context).pushReplacementNamed('/onboarding');
      await tester.pump(const Duration(seconds: 1));
      finish.complete(verified());
      await tester.pumpAndSettle();
      expect(owner.verified, false);
      expect(find.byType(BuyerShell), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'demo entry and offline app replacement cannot restore verified identity',
    (tester) async {
      await tester.pumpWidget(const HomezoneApp(initialRoute: '/buyer'));
      final c = SessionScope.of(tester.element(find.byType(BuyerShell)));
      expect(c, isNull);
      await tester.tap(find.text('Profile').last);
      await tester.pumpAndSettle();
      expect(find.textContaining('You are not authenticated'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(const HomezoneApp(initialRoute: '/sign-in'));
      expect(
        SessionScope.of(tester.element(find.text('Welcome Back'))),
        isNull,
      );
    },
  );
  testWidgets(
    'replacing app owner clears prior identity and closes prior client',
    (tester) async {
      final c = CookieRequestCoordinator(
        configuration: config,
        clock: DateTime.now,
      );
      final owner = make(c, () async => verified());
      expect(
        (await owner.beginSignIn('fixture', 'synthetic').result).verified,
        true,
      );
      await tester.pumpWidget(
        HomezoneApp(initialRoute: '/buyer', signInController: owner),
      );
      await tester.pumpWidget(const HomezoneApp(initialRoute: '/buyer'));
      expect(owner.verified, false);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
