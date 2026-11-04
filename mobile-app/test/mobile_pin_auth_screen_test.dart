import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/auth/mobile_pin_auth_screen.dart';
import 'package:homezone_mobile/features/auth/role_first_auth_screen.dart';
import 'package:homezone_mobile/features/auth/auth_form_screen.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'marketplace_test.dart' as fixture;

void main() {
  testWidgets('matching server role confirms profile before dashboard', (
    tester,
  ) async {
    final f = fixture.Fixture();
    addTearDown(f.controller.dispose);
    f.transport.reply = (request) {
      if (request.uri.path == '/api/auth/callback/mobile-pin') {
        return const ApiResponse(
          200,
          '{"url":"/"}',
          headers: {
            'set-cookie': [
              '__Secure-authjs.session-token=FAKE-JWE.synthetic-regression-only; Path=/; Secure; HttpOnly',
            ],
          },
        );
      }
      return fixture.json({
        'profile': {'role': 'USER', 'verificationStatus': 'PENDING'},
      });
    };
    await tester.pumpWidget(
      MaterialApp(
        home: MobilePinAuthScreen(
          repository: f.repository,
          selectedRole: 'USER',
        ),
        routes: {
          '/buyer': (_) => const Scaffold(body: Text('Confirmed dashboard')),
        },
      ),
    );
    await tester.enterText(find.byType(TextFormField).at(0), '9000000001');
    await tester.enterText(find.byType(TextFormField).at(1), '001234');
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Confirmed dashboard'), findsOneWidget);
    expect(f.transport.requests.last.uri.path, '/api/mobile/account');
    expect(f.controller.identity?.role, 'USER');
    f.controller.dispose();
    await tester.pump();
  });
  testWidgets(
    'active email entry retains role through sign-in, create account and Back',
    (tester) async {
      final f = fixture.Fixture();
      addTearDown(f.controller.dispose);
      await tester.pumpWidget(
        MaterialApp(home: RoleFirstAuthScreen(repository: f.repository)),
      );
      expect(find.text('Who are you?'), findsOneWidget);
      expect(find.byType(TextFormField), findsNothing);
      await tester.tap(find.text('Broker'));
      await tester.pump();
      await tester.ensureVisible(find.text('Continue'));
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      expect(find.text('Welcome Back'), findsOneWidget);
      expect(find.text('Selected role: BROKER'), findsOneWidget);
      expect(find.byType(MobilePinAuthScreen), findsNothing);
      await tester.enterText(
        find.byType(TextFormField).at(0),
        'draft@example.invalid',
      );
      await tester.enterText(find.byType(TextFormField).at(1), 'DraftOnly123');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Create a new account'));
      await tester.tap(find.text('Create a new account'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<AuthFormScreen>(find.byType(AuthFormScreen).last)
            .selectedRole,
        'BROKER',
      );
      expect(find.text('Full name'), findsOneWidget);
      await tester.ensureVisible(find.text('Already have an account? Sign In'));
      await tester.tap(find.text('Already have an account? Sign In'));
      await tester.pumpAndSettle();
      final form = tester.widget<AuthFormScreen>(find.byType(AuthFormScreen));
      expect(form.mode, AuthFormMode.signIn);
      expect(form.selectedRole, 'BROKER');
      expect(
        tester
            .widget<TextFormField>(find.byType(TextFormField).at(0))
            .controller!
            .text,
        'draft@example.invalid',
      );
      expect(
        tester
            .widget<TextFormField>(find.byType(TextFormField).at(1))
            .controller!
            .text,
        'DraftOnly123',
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Who are you?'), findsOneWidget);
      expect(f.transport.requests, isEmpty);
    },
  );

  testWidgets('authenticated role mismatch signs out and never opens dashboard', (
    tester,
  ) async {
    final f = fixture.Fixture();
    addTearDown(f.controller.dispose);
    f.transport.reply = (request) {
      if (request.uri.path == '/api/auth/callback/mobile-pin') {
        return const ApiResponse(
          200,
          '{"url":"/"}',
          headers: {
            'set-cookie': [
              '__Secure-authjs.session-token=FAKE-JWE.synthetic-regression-only; Path=/; Secure; HttpOnly',
            ],
          },
        );
      }
      if (request.uri.path == '/api/mobile/account') {
        return fixture.json({
          'profile': {'role': 'USER', 'verificationStatus': 'PENDING'},
        });
      }
      return fixture.json({'url': '/'});
    };
    await tester.pumpWidget(
      MaterialApp(
        home: MobilePinAuthScreen(
          repository: f.repository,
          selectedRole: 'OWNER',
        ),
      ),
    );
    await tester.enterText(find.byType(TextFormField).at(0), '9000000001');
    await tester.enterText(find.byType(TextFormField).at(1), '001234');
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('does not match the selected account type'),
      findsOneWidget,
    );
    expect(f.controller.verified, false);
    expect(
      f.transport.requests.any((r) => r.uri.path == '/api/auth/signout'),
      true,
    );
    final callback = f.transport.requests.firstWhere(
      (r) => r.uri.path.endsWith('/mobile-pin'),
    );
    expect(Uri.splitQueryString(callback.body!).containsKey('role'), false);
  });

  testWidgets(
    'PIN registration preserves leading zeros and requires separate login',
    (tester) async {
      final f = fixture.Fixture();
      addTearDown(f.controller.dispose);
      f.transport.reply = (_) =>
          fixture.json({'message': 'Registration submitted.'});
      await tester.pumpWidget(
        MaterialApp(
          home: MobilePinAuthScreen(
            repository: f.repository,
            selectedRole: 'USER',
            register: true,
          ),
        ),
      );
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), '9000000001');
      await tester.enterText(fields.at(1), '001234');
      await tester.enterText(fields.at(2), '001234');
      await tester.ensureVisible(find.text('Create account'));
      await tester.tap(find.text('Create account'));
      await tester.pumpAndSettle();
      expect(f.transport.requests.length, 1);
      final request = f.transport.requests.single;
      expect(request.uri.path, '/api/mobile/auth/register');
      expect(jsonDecode(request.body!), {
        'mobileNumber': '9000000001',
        'pin': '001234',
        'confirmPin': '001234',
        'role': 'USER',
      });
      expect(f.controller.verified, false);
      expect(find.textContaining('Registration submitted.'), findsOneWidget);
      expect(find.text('Create account'), findsNothing);
      expect(find.text('Continue to sign-in'), findsOneWidget);
    },
  );

  testWidgets('PIN mismatch never dispatches registration', (tester) async {
    final f = fixture.Fixture();
    addTearDown(f.controller.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: MobilePinAuthScreen(
          repository: f.repository,
          selectedRole: 'USER',
          register: true,
        ),
      ),
    );
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), '9000000001');
    await tester.enterText(fields.at(1), '001234');
    await tester.enterText(fields.at(2), '001235');
    await tester.ensureVisible(find.text('Create account'));
    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();
    expect(f.transport.requests, isEmpty);
    expect(find.text('PINs must match.'), findsOneWidget);
    expect(find.textContaining('OTP'), findsNothing);
    expect(find.textContaining('Email'), findsNothing);
  });
}
