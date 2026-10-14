import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/homezone_app.dart';
import 'package:homezone_mobile/features/buyer/data/demo_properties.dart';
import 'package:homezone_mobile/features/buyer/widgets/property_card.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_property_detail_screen.dart';
import 'buyer_widget_test.dart' as buyer;
import 'widget_test.dart' as auth;

void main() {
  Finder recent() => find.byKey(const ValueKey('recent-properties'));
  Finder recentItem(String key) =>
      find.descendant(of: recent(), matching: find.byKey(ValueKey(key)));

  testWidgets('offline launch to onboarding to explicit preview to details', (
    tester,
  ) async {
    await tester.pumpWidget(const HomezoneApp());
    await tester.pump(const Duration(milliseconds: 1200));
    await tester.pumpAndSettle();
    expect(find.text('Find Your Perfect Home'), findsOneWidget);
    await auth.tapText(tester, 'Next');
    expect(find.text('Smarter Property Decisions'), findsOneWidget);
    await auth.tapText(tester, 'Already have an account? Sign In');
    expect(find.text('Welcome Back'), findsOneWidget);
    await buyer.tapVisible(tester, find.text('Explore buyer preview'));
    await buyer.tapVisible(
      tester,
      find.byKey(const ValueKey('open-garden-villa')),
    );
    expect(find.text('Fictional demo listing'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.byType(BuyerPropertyDetailScreen), findsNothing);
    expect(find.text('Find your next chapter.'), findsOneWidget);
  });

  testWidgets('filters and scroll survive repeated details and system back', (
    tester,
  ) async {
    await buyer.start(tester);
    await buyer.tab(tester, 'search');
    await tester.enterText(
      find.byKey(const ValueKey('property-search')),
      'Garden',
    );
    await buyer.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Buy'));
    await buyer.tapVisible(
      tester,
      find.widgetWithText(TextButton, 'All locations · Preview'),
    );
    await tester.tap(find.text('Kochi'));
    await tester.pumpAndSettle();
    for (var i = 0; i < 2; i++) {
      final card = find.byKey(const ValueKey('open-garden-villa'));
      await tester.ensureVisible(card);
      await tester.pumpAndSettle();
      final scroll = tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position;
      final offset = scroll.pixels;
      await tester.tap(card);
      await tester.pumpAndSettle();
      expect(find.byType(BuyerPropertyDetailScreen), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byType(BuyerPropertyDetailScreen), findsNothing);
      expect(scroll.pixels, closeTo(offset, 0.1));
      expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('property-search')))
            .controller!
            .text,
        'Garden',
      );
      expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Buy'))
            .selected,
        isTrue,
      );
      expect(find.text('Kochi · Preview'), findsOneWidget);
      expect(find.text('1 demo results'), findsOneWidget);
    }
    await buyer.tab(tester, 'home');
    expect(
      find.descendant(of: recent(), matching: find.byType(PropertyCard)),
      findsOneWidget,
    );
    await buyer.tab(tester, 'profile');
    await buyer.tab(tester, 'home');
    expect(
      find.descendant(of: recent(), matching: find.byType(PropertyCard)),
      findsOneWidget,
    );
  });

  testWidgets(
    'favorite state spans all surfaces and local exit resets memory',
    (tester) async {
      await tester.pumpWidget(const HomezoneApp(initialRoute: '/sign-in'));
      await tester.pumpAndSettle();
      await buyer.tapVisible(tester, find.text('Explore buyer preview'));
      expect(find.text('Your story starts here'), findsOneWidget);
      await buyer.tab(tester, 'saved');
      expect(find.text('A little inspiration, saved'), findsOneWidget);
      await buyer.tab(tester, 'home');
      await buyer.tapVisible(
        tester,
        find.byKey(const ValueKey('favorite-garden-villa')),
      );
      await buyer.tab(tester, 'search');
      expect(find.byTooltip('Unsave Garden Courtyard Villa'), findsOneWidget);
      await buyer.tapVisible(
        tester,
        find.byKey(const ValueKey('open-garden-villa')),
      );
      expect(find.text('Remove from saved'), findsOneWidget);
      await buyer.tapVisible(
        tester,
        find.byKey(const ValueKey('detail-favorite')),
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      await buyer.tab(tester, 'home');
      await buyer.tapVisible(tester, recentItem('favorite-garden-villa'));
      await buyer.tab(tester, 'saved');
      expect(find.byTooltip('Unsave Garden Courtyard Villa'), findsOneWidget);
      await buyer.tab(tester, 'profile');
      await buyer.tapVisible(
        tester,
        find.byKey(const ValueKey('preview-signout')),
      );
      expect(find.text('Welcome Back'), findsOneWidget);
      await buyer.tapVisible(tester, find.text('Explore buyer preview'));
      expect(find.text('Your story starts here'), findsOneWidget);
      expect(recent(), findsNothing);
      await buyer.tab(tester, 'saved');
      expect(find.text('A little inspiration, saved'), findsOneWidget);
    },
  );

  testWidgets('property card asset failure has a usable fallback', (
    tester,
  ) async {
    var saved = false, opened = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: PropertyCard(
              property: const DemoProperty(
                id: 'missing',
                title: 'Fictional fallback home',
                location: 'Demo location',
                city: '',
                price: 'Demo price',
                type: 'Home',
                area: '',
                image: 'assets/images/missing.jpg',
                category: PropertyCategory.buy,
              ),
              saved: false,
              onFavorite: () => saved = true,
              onOpen: () => opened = true,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.byType(AspectRatio),
        matching: find.byIcon(Icons.home_outlined),
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
    await tester.tap(find.byKey(const ValueKey('favorite-missing')));
    expect(saved, isTrue);
    expect(opened, isFalse);
    await buyer.tapVisible(tester, find.text('Fictional fallback home'));
    expect(opened, isTrue);
  });

  testWidgets('dark large-text buyer journey supports history and every tab', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await buyer.start(tester);
    expect(
      Theme.of(tester.element(find.text('HOMEZONE'))).brightness,
      Brightness.dark,
    );
    await buyer.tab(tester, 'search');
    await buyer.tapVisible(
      tester,
      find.byKey(const ValueKey('open-palm-residence')),
    );
    await buyer.tapVisible(
      tester,
      find.byKey(const ValueKey('detail-favorite')),
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
    await buyer.tab(tester, 'home');
    await buyer.tapVisible(tester, recentItem('open-palm-residence'));
    await tester.pageBack();
    await tester.pumpAndSettle();
    await buyer.tab(tester, 'saved');
    expect(find.text('Palm Grove Residence'), findsOneWidget);
    await buyer.tab(tester, 'profile');
    expect(find.textContaining('You are not authenticated'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
