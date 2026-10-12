import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/homezone_app.dart';

Future<void> open(WidgetTester tester, String route) async {
  await tester.pumpWidget(HomezoneApp(initialRoute: route));
  await tester.pump();
}

Future<void> tapText(WidgetTester tester, String label) async {
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  final button = find.widgetWithText(FilledButton, label);
  final iconButton = find.byTooltip(label);
  final finder = button.evaluate().isNotEmpty
      ? button
      : iconButton.evaluate().isNotEmpty
      ? iconButton
      : find.text(label);
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> fill(WidgetTester tester, String label, String value) async {
  final field = find.widgetWithText(TextFormField, label);
  await tester.ensureVisible(field);
  await tester.enterText(field, value);
  await tester.pumpAndSettle();
}

Future<void> finishPreview(WidgetTester tester) async {
  await tester.pump(const Duration(milliseconds: 600));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Splash, both onboarding pages and role selection work', (
    tester,
  ) async {
    await tester.pumpWidget(const HomezoneApp());
    expect(find.text('HOMEZONE'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1200));
    await tester.pumpAndSettle();
    expect(find.text('Find Your Perfect Home'), findsOneWidget);
    await tapText(tester, 'Next');
    expect(find.text('Smarter Property Decisions'), findsOneWidget);
    await tapText(tester, 'Previous onboarding screen');
    expect(find.text('Find Your Perfect Home'), findsOneWidget);
    await tapText(tester, 'Next');
    await tapText(tester, 'Get started');
    expect(find.text('Choose Your Role'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Continue'))
          .onPressed,
      isNull,
    );
    for (final role in [
      'Property Buyer',
      'Property Owner',
      'Broker',
      'Builder',
      'Service Provider',
    ]) {
      await tapText(tester, role);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    }
    await tapText(tester, 'Continue');
    expect(find.text('Selected role: Service Provider'), findsOneWidget);
    await tapText(tester, 'Already have an account? Sign In');
    expect(find.text('Welcome Back'), findsOneWidget);
  });
  testWidgets('Sign-in validates and toggles password visibility', (
    tester,
  ) async {
    await open(tester, '/sign-in');
    await tapText(tester, 'Sign In');
    expect(find.text('Enter your email address.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);
    await fill(tester, 'Email address', 'invalid');
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    await fill(tester, 'Password', 'local-only');
    final editable = find.descendant(
      of: find.widgetWithText(TextFormField, 'Password'),
      matching: find.byType(EditableText),
    );
    expect(tester.widget<EditableText>(editable).obscureText, isTrue);
    await tester.tap(find.byTooltip('Show password'));
    await tester.pump();
    expect(tester.widget<EditableText>(editable).obscureText, isFalse);
  });
  testWidgets(
    'Valid sign-in disables button during preview and does not authenticate',
    (tester) async {
      await open(tester, '/sign-in');
      await fill(tester, 'Email address', 'test@example.com');
      await fill(tester, 'Password', 'local-only');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Sign In'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sign In'));
      await tester.pump();
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await finishPreview(tester);
      expect(
        find.text('Local preview complete. You are not signed in.'),
        findsOneWidget,
      );
      expect(find.text('Welcome Back'), findsOneWidget);
    },
  );
  testWidgets(
    'Sign-up requires valid fields and consent, then shows honest success',
    (tester) async {
      await open(tester, '/sign-up');
      await fill(tester, 'Full name', 'A');
      await fill(tester, 'Email address', 'test@example.com');
      await fill(tester, 'Password', 'short');
      await tapText(tester, 'Create Account');
      expect(find.text('Enter at least 2 characters.'), findsOneWidget);
      expect(find.text('Use at least 8 characters.'), findsOneWidget);
      expect(
        find.text('Please agree to the preview terms and privacy consent.'),
        findsOneWidget,
      );
      await fill(tester, 'Full name', 'Test User');
      await fill(tester, 'Password', 'PreviewOnly123');
      await tapText(tester, 'Create Account');
      expect(find.text('All Set!'), findsNothing);
      await tester.ensureVisible(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      await tapText(tester, 'Create Account');
      await finishPreview(tester);
      expect(find.text('All Set!'), findsOneWidget);
      expect(
        find.text('Local preview complete. No account was created.'),
        findsOneWidget,
      );
      await tapText(tester, 'Continue to Home');
      expect(find.text('Find Your Perfect Home'), findsOneWidget);
    },
  );
  testWidgets(
    'Recovery navigates to email preview and new password, without email',
    (tester) async {
      await open(tester, '/sign-in');
      await tapText(tester, 'Forgot Password?');
      await tapText(tester, 'Send Reset Link');
      expect(find.text('Enter your email address.'), findsOneWidget);
      await fill(tester, 'Email address', 'test@example.com');
      await tapText(tester, 'Send Reset Link');
      await finishPreview(tester);
      expect(find.text('Check Your Email'), findsOneWidget);
      expect(
        find.text(
          'Recovery preview for test@example.com. No reset link was sent.',
        ),
        findsOneWidget,
      );
      await tapText(tester, 'Open Email App');
      expect(
        find.text('Local preview only. No email app was opened.'),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 5));
      await tapText(tester, 'Resend');
      expect(
        find.text('Local preview only. No email was resent.'),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 5));
      await tapText(tester, 'Preview Set New Password');
      expect(find.text('Set New Password'), findsOneWidget);
      await fill(tester, 'New password', 'PreviewOnly123');
      await fill(tester, 'Confirm password', 'mismatch');
      await tapText(tester, 'Update Password');
      expect(find.text('Passwords must match.'), findsOneWidget);
      await fill(tester, 'Confirm password', 'PreviewOnly123');
      await tapText(tester, 'Update Password');
      await finishPreview(tester);
      expect(
        find.text('Local preview complete. No password was changed.'),
        findsOneWidget,
      );
      await tapText(tester, 'Back to Sign In');
      expect(find.text('Welcome Back'), findsOneWidget);
    },
  );
  testWidgets('Social sign-in buttons are explicitly disconnected', (
    tester,
  ) async {
    await open(tester, '/sign-in');
    for (final provider in ['Google', 'Apple']) {
      await tapText(tester, provider);
      expect(
        find.text(
          '$provider sign-in is a UI preview only. No authentication occurred.',
        ),
        findsOneWidget,
      );
      expect(find.text('Welcome Back'), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
    }
    await tapText(tester, "Don't have an account? Sign Up");
    expect(find.text('Choose Your Role'), findsOneWidget);
  });
  testWidgets('New password visibility controls are independent', (
    tester,
  ) async {
    await open(tester, '/reset-password');
    await tester.tap(find.byTooltip('Show new password'));
    await tester.pump();
    final first = find.descendant(
      of: find.widgetWithText(TextFormField, 'New password'),
      matching: find.byType(EditableText),
    );
    final second = find.descendant(
      of: find.widgetWithText(TextFormField, 'Confirm password'),
      matching: find.byType(EditableText),
    );
    expect(tester.widget<EditableText>(first).obscureText, isFalse);
    expect(tester.widget<EditableText>(second).obscureText, isTrue);
    await tester.tap(find.byTooltip('Show confirm password'));
    await tester.pump();
    expect(tester.widget<EditableText>(second).obscureText, isFalse);
  });
  for (final route in [
    '/onboarding',
    '/roles',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/check-email',
    '/success',
  ]) {
    testWidgets('$route fits small screen, keyboard and large text', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      tester.view.viewInsets = const FakeViewPadding(bottom: 220);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await open(tester, route);
      await tester.drag(
        find.byType(SingleChildScrollView),
        const Offset(0, -500),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
  testWidgets('System dark theme retains forest identity', (tester) async {
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    await open(tester, '/sign-in');
    expect(
      Theme.of(tester.element(find.text('Welcome Back'))).brightness,
      Brightness.dark,
    );
  });
}
