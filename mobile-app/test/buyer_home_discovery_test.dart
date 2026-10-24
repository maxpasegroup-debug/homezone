import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_property_detail_screen.dart';
import 'package:homezone_mobile/features/buyer/widgets/buyer_components.dart';

import 'buyer_widget_test.dart' as buyer;

void main() {
  testWidgets('Home exposes a featured listing on a standard phone viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await buyer.start(tester);

    final card = find.byKey(const ValueKey('open-garden-villa'));
    final navigation = find.byType(NavigationBar);
    expect(card, findsOneWidget);
    expect(
      tester.getRect(card).top,
      lessThan(tester.getRect(navigation).top - 72),
    );
    expect(find.byKey(const ValueKey('location-selector')), findsOneWidget);
    expect(find.byKey(const ValueKey('home-search')), findsOneWidget);
    expect(find.text('Popular localities'), findsOneWidget);
    expect(
      find.text('Fictional demo listings · Offline preview'),
      findsOneWidget,
    );
    expect(find.textContaining('No live inventory'), findsOneWidget);
    expect(find.widgetWithText(ChoiceChip, 'Commercial'), findsOneWidget);
  });

  testWidgets(
    'compact Home remains scrollable at narrow width and large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.8;
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      await buyer.start(tester);

      await tester.drag(find.byType(CategoryFilter), const Offset(-260, 0));
      await tester.pumpAndSettle();
      await buyer.tapVisible(
        tester,
        find.widgetWithText(ChoiceChip, 'Commercial'),
      );
      expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Commercial'))
            .selected,
        isTrue,
      );
      await tester.ensureVisible(find.textContaining('No live inventory'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('compact Home keeps category, favorites, details and history', (
    tester,
  ) async {
    await buyer.start(tester);
    await buyer.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Buy'));
    expect(find.byKey(const ValueKey('open-garden-villa')), findsOneWidget);
    await buyer.tapVisible(
      tester,
      find.byKey(const ValueKey('favorite-garden-villa')),
    );
    await buyer.tapVisible(
      tester,
      find.byKey(const ValueKey('open-garden-villa')),
    );
    expect(find.byType(BuyerPropertyDetailScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('recent-properties')), findsOneWidget);
    await buyer.tab(tester, 'saved');
    expect(find.text('Garden Courtyard Villa'), findsOneWidget);
    expect(find.byTooltip('Unsave Garden Courtyard Villa'), findsOneWidget);
  });
}
