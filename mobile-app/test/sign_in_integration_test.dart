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
import 'package:homezone_mobile/features/buyer/buyer_shell.dart';
import 'package:homezone_mobile/app/session_scope.dart';
import 'widget_test.dart' as helpers;

class UiTransport implements ApiTransport {
  UiTransport(this.callback, this.session);
  final Future<ApiResponse> Function() callback;
  final Future<ApiResponse> Function() session;
  int calls = 0;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    calls++;
    if (request.uri.path == '/api/auth/csrf') {
      final token = List.filled(64, 'a').join(),
          hash = List.filled(64, 'b').join();
      return ApiResponse(
        200,
        jsonEncode({'csrfToken': token}),
        headers: {
          'set-cookie': [
            '__Host-authjs.csrf-token=$token%7C$hash; Path=/; Secure; HttpOnly',
          ],
        },
      );
    }
    return request.uri.path == '/api/auth/session' ? session() : callback();
  }

  @override
  void close() {}
}

void main() {
  const accepted = ApiResponse(
    200,
    '{"url":"/"}',
    headers: {
      'set-cookie': [
        '__Secure-authjs.session-token=FAKE-JWE.synthetic; Path=/; Secure; HttpOnly',
      ],
    },
  );
  Future<void> open(WidgetTester tester, UiTransport transport) async {
    final config = ApiConfiguration(
      'https://approved.example.com',
      environment: ApiEnvironment.staging,
    );
    final controller = SignInController(
      PasswordAuthProtocol(
        client: ApiClient(configuration: config, transport: transport),
        coordinator: CookieRequestCoordinator(
          configuration: config,
          clock: DateTime.now,
        ),
      ),
    );
    await tester.pumpWidget(
      HomezoneApp(initialRoute: '/sign-in', signInController: controller),
    );
    await helpers.fill(tester, 'Email address', 'fixture@example.com');
    await helpers.fill(tester, 'Password', 'Synthetic123');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Sign In'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign In'));
    await tester.pump();
  }

  testWidgets('verified session gates navigation and duplicate submissions', (
    tester,
  ) async {
    final finish = Completer<ApiResponse>();
    final t = UiTransport(() async => accepted, () => finish.future);
    await open(tester, t);
    await tester.pump();
    expect(t.calls, 3);
    expect(find.byType(BuyerShell), findsNothing);
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton).first).onPressed,
      isNull,
    );
    await tester.tap(find.byType(FilledButton).first);
    await tester.pump();
    expect(t.calls, 3);
    finish.complete(
      ApiResponse(
        200,
        jsonEncode({
          'user': {'id': 'fixture', 'role': 'USER', 'whatsappVerified': false},
          'expires': DateTime.now()
              .toUtc()
              .add(const Duration(days: 1))
              .toIso8601String(),
        }),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(BuyerShell), findsOneWidget);
    final owner = SessionScope.of(tester.element(find.byType(BuyerShell)))!;
    expect(owner.verified, isTrue);
    expect(owner.identity!.id, 'fixture');
    await tester.tap(find.text('Saved').last);
    await tester.pumpAndSettle();
    expect(owner.verified, isTrue);
    await tester.tap(find.text('Profile').last);
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Verified in-memory sign-in. Listings and profile remain demo data.',
      ),
      findsOneWidget,
    );
    await helpers.tapText(tester, 'Leave verified access');
    expect(owner.verified, isFalse);
    expect(find.text('Welcome Back'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
  for (final entry in {
    'credentials': 'Unable to sign in. Check your email and password.',
    'csrf': 'Sign-in verification failed. Please try again.',
    'timeout': 'The request timed out. Please try again.',
    'session': 'Unable to sign in. Check your email and password.',
    'malformed': 'Unable to verify sign-in. Please try again.',
  }.entries) {
    testWidgets('${entry.key} failure stays on sign-in with safe error', (
      tester,
    ) async {
      final t = UiTransport(
        () async {
          if (entry.key == 'timeout') {
            throw TimeoutException('synthetic-sensitive');
          }
          if (entry.key == 'csrf') return const ApiResponse(403, '{}');
          if (entry.key == 'credentials') {
            return const ApiResponse(
              200,
              '{"url":"/auth?error=CredentialsSignin"}',
            );
          }
          return accepted;
        },
        () async => ApiResponse(200, entry.key == 'malformed' ? '{}' : 'null'),
      );
      await open(tester, t);
      await tester.pumpAndSettle();
      expect(find.text(entry.value), findsOneWidget);
      expect(find.byType(BuyerShell), findsNothing);
      expect(find.text('Welcome Back'), findsOneWidget);
    });
  }
}
