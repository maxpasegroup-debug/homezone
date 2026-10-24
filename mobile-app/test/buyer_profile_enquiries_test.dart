import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/buyer/data/demo_properties.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_profile_screen.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_enquiries_screen.dart';
import 'package:homezone_mobile/theme/app_theme.dart';
import 'buyer_widget_test.dart' as helpers;

void main() {
  testWidgets('enquiries start empty and examples open the correct property', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'profile');
    await helpers.tapVisible(tester, find.text('My Enquiries'));
    expect(find.text('No enquiries yet'), findsOneWidget);
    expect(find.textContaining('No enquiry has been sent'), findsOneWidget);
    await tester.tap(find.byType(SwitchListTile));
    await tester.pumpAndSettle();
    expect(find.textContaining('FICTIONAL EXAMPLE'), findsOneWidget);
    await helpers.tapVisible(tester, find.text(demoProperties.first.title));
    expect(find.text(demoProperties.first.title), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Preview status: example only'), findsOneWidget);
  });

  testWidgets('profile shortcuts reuse collections and history navigation', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'profile');
    for (final pair in [
      ('Shortlists', 'No shortlists yet'),
      ('Compare properties', 'Compare Properties'),
      ('Recently Viewed', 'No recently viewed properties'),
    ]) {
      await helpers.tapVisible(tester, find.text(pair.$1));
      expect(find.text(pair.$2), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
    }
    await helpers.tapVisible(tester, find.text('Saved properties'));
    expect(find.text('A little inspiration, saved'), findsOneWidget);
  });

  testWidgets('preview exit resets enquiry examples with the shell', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'profile');
    await helpers.tapVisible(tester, find.text('My Enquiries'));
    await tester.tap(find.byType(SwitchListTile));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    await helpers.tapVisible(
      tester,
      find.byKey(const ValueKey('preview-signout')),
    );
    await helpers.tapVisible(tester, find.text('Explore buyer preview'));
    await helpers.tab(tester, 'profile');
    await helpers.tapVisible(tester, find.text('My Enquiries'));
    expect(find.text('No enquiries yet'), findsOneWidget);
  });

  testWidgets(
    'preview exit discloses all memory-only state and revocation limit',
    (tester) async {
      await helpers.start(tester);
      await helpers.tab(tester, 'profile');
      final disclosure = find.textContaining(
        'Leaving clears memory-only preview',
      );
      expect(disclosure, findsOneWidget);
      final text = tester.widget<Text>(disclosure).data!;
      for (final item in [
        'favorites',
        'shortlists',
        'comparison',
        'Recently Viewed history',
        'enquiry examples',
        'No server-side session is revoked',
      ]) {
        expect(text, contains(item));
      }
    },
  );

  for (final brightness in Brightness.values) {
    testWidgets(
      'profile help disclosure scrolls fully at large text in ${brightness.name}',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          MaterialApp(
            theme: brightness == Brightness.light
                ? AppTheme.light
                : AppTheme.dark,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(2)),
              child: child!,
            ),
            home: const Scaffold(body: BuyerProfileScreen()),
          ),
        );
        await helpers.tapVisible(tester, find.text('Help & support'));
        final dialog = find.byType(AlertDialog);
        final scrollable = find.descendant(
          of: dialog,
          matching: find.byType(Scrollable),
        );
        expect(scrollable, findsOneWidget);
        await tester.drag(scrollable, const Offset(0, -1500));
        await tester.pumpAndSettle();
        final disclosure = find.textContaining('Live customer support');
        expect(disclosure, findsOneWidget);
        expect(
          tester.getBottomRight(disclosure).dy,
          lessThanOrEqualTo(tester.getTopLeft(find.text('Close')).dy),
        );
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Close'));
        await tester.pumpAndSettle();
        expect(dialog, findsNothing);
        expect(find.text('Help & support'), findsOneWidget);
      },
    );
    testWidgets(
      'profile and enquiries fit small scaled ${brightness.name} layout',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        for (final screen in [
          const BuyerProfileScreen(),
          BuyerEnquiriesScreen(
            showExamples: true,
            onExamples: (_) {},
            onOpen: (_) {},
          ),
        ]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: ThemeData(brightness: brightness),
              home: MediaQuery(
                data: const MediaQueryData(
                  size: Size(320, 640),
                  textScaler: TextScaler.linear(2),
                ),
                child: Scaffold(body: screen),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        }
      },
    );
  }
}
