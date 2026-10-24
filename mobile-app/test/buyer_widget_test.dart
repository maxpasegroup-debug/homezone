import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/homezone_app.dart';

Future<void> start(WidgetTester tester) async {
  await tester.pumpWidget(const HomezoneApp(initialRoute: '/buyer'));
  await tester.pumpAndSettle();
}

Future<void> tab(WidgetTester tester, String name) async {
  await tester.tap(find.byKey(ValueKey('tab-$name')));
  await tester.pumpAndSettle();
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Home presents demo sections and all-properties navigation', (
    tester,
  ) async {
    await start(tester);
    expect(find.text('HOMEZONE'), findsOneWidget);
    expect(find.text('Find your next chapter.'), findsOneWidget);
    expect(find.text('Featured properties'), findsOneWidget);
    expect(find.text('Recommended properties'), findsOneWidget);
    expect(find.text('Recently viewed'), findsOneWidget);
    expect(find.text('Your story starts here'), findsOneWidget);
    await tapVisible(tester, find.text('Browse all properties'));
    expect(find.text('Discover a place'), findsOneWidget);
    expect(find.text('4 demo results'), findsOneWidget);
  });
  testWidgets('Bottom navigation shows local Saved and Profile states', (
    tester,
  ) async {
    await start(tester);
    await tab(tester, 'saved');
    expect(find.text('A little inspiration, saved'), findsOneWidget);
    await tab(tester, 'profile');
    expect(find.text('Welcome, explorer'), findsOneWidget);
    await tab(tester, 'home');
    expect(find.text('Find your next chapter.'), findsOneWidget);
    await tester.tap(find.byTooltip('Open preview profile'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome, explorer'), findsOneWidget);
  });
  testWidgets('Search filters demos and shows an empty state', (tester) async {
    await start(tester);
    await tab(tester, 'search');
    await tester.enterText(
      find.byKey(const ValueKey('property-search')),
      'Garden',
    );
    await tester.pumpAndSettle();
    expect(find.text('1 demo results'), findsOneWidget);
    expect(find.text('Garden Courtyard Villa'), findsOneWidget);
    expect(find.text('Palm Grove Residence'), findsNothing);
    await tester.enterText(
      find.byKey(const ValueKey('property-search')),
      'no-such-property',
    );
    await tester.pumpAndSettle();
    expect(find.text('No demo matches'), findsOneWidget);
    await tester.tap(find.byTooltip('Clear search'));
    await tester.pumpAndSettle();
    expect(find.text('4 demo results'), findsOneWidget);
    await tapVisible(tester, find.widgetWithText(ChoiceChip, 'Rent'));
    expect(find.text('1 demo results'), findsOneWidget);
    expect(find.text('Lakeside Family Home'), findsOneWidget);
  });
  testWidgets('Favorite toggles are shared across Home Search and Saved', (
    tester,
  ) async {
    await start(tester);
    await tapVisible(
      tester,
      find.byKey(const ValueKey('favorite-garden-villa')),
    );
    await tab(tester, 'saved');
    expect(find.text('Garden Courtyard Villa'), findsOneWidget);
    expect(find.byTooltip('Unsave Garden Courtyard Villa'), findsOneWidget);
    await tab(tester, 'search');
    await tester.enterText(
      find.byKey(const ValueKey('property-search')),
      'Garden',
    );
    await tester.pumpAndSettle();
    expect(find.byTooltip('Unsave Garden Courtyard Villa'), findsOneWidget);
    await tapVisible(
      tester,
      find.byKey(const ValueKey('favorite-garden-villa')),
    );
    await tab(tester, 'saved');
    expect(find.text('A little inspiration, saved'), findsOneWidget);
  });
  testWidgets('Location chooser is local and supports no demo inventory', (
    tester,
  ) async {
    await start(tester);
    await tapVisible(tester, find.byKey(const ValueKey('location-selector')));
    await tester.tap(find.text('Dubai'));
    await tester.pumpAndSettle();
    expect(find.text('Dubai · Preview'), findsOneWidget);
    expect(find.text('No featured demos'), findsOneWidget);
    await tab(tester, 'search');
    expect(find.text('No demo matches'), findsOneWidget);
  });
  testWidgets(
    'Preview entry and sign-out preserve auth and discard favorites',
    (tester) async {
      await tester.pumpWidget(const HomezoneApp(initialRoute: '/sign-in'));
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Explore buyer preview'));
      await tapVisible(
        tester,
        find.byKey(const ValueKey('favorite-garden-villa')),
      );
      await tab(tester, 'profile');
      await tapVisible(tester, find.byKey(const ValueKey('preview-signout')));
      expect(find.text('Welcome Back'), findsOneWidget);
      await tapVisible(tester, find.text('Explore buyer preview'));
      await tab(tester, 'saved');
      expect(find.text('A little inspiration, saved'), findsOneWidget);
    },
  );
  for (final name in ['home', 'search', 'saved', 'profile']) {
    testWidgets('$name supports a narrow screen and large text', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await start(tester);
      await tab(tester, name);
      if (name == 'search') {
        tester.view.viewInsets = const FakeViewPadding(bottom: 220);
        await tester.pumpAndSettle();
      }
      await tester.drag(
        find.byType(SingleChildScrollView).first,
        const Offset(0, -400),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
}
