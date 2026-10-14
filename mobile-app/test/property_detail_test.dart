import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_property_detail_screen.dart';
import 'package:homezone_mobile/features/buyer/data/demo_properties.dart';
import 'package:homezone_mobile/theme/app_theme.dart';
import 'buyer_widget_test.dart' as helpers;

void main() {
  for (final tab in ['home', 'search', 'saved']) {
    testWidgets('open correct detail from $tab and synchronize favorites', (
      tester,
    ) async {
      await helpers.start(tester);
      if (tab == 'saved') {
        await helpers.tapVisible(
          tester,
          find.byKey(const ValueKey('favorite-garden-villa')),
        );
      }
      await helpers.tab(tester, tab);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('open-garden-villa')),
      );
      expect(find.byType(BuyerPropertyDetailScreen), findsOneWidget);
      final property = demoProperties.first;
      expect(find.text(property.title), findsOneWidget);
      expect(find.text(property.price), findsOneWidget);
      expect(find.text(property.location), findsOneWidget);
      expect(find.text('3 bedrooms'), findsOneWidget);
      expect(find.text('Fictional demo listing'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('detail-favorite')),
      );
      expect(
        find.text(tab == 'saved' ? 'Save demo property' : 'Remove from saved'),
        findsOneWidget,
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      await helpers.tab(tester, 'saved');
      expect(
        find.text(property.title),
        tab == 'saved' ? findsNothing : findsOneWidget,
      );
    });
  }
  testWidgets(
    'different listing and repeated detail taps preserve favorite identity',
    (tester) async {
      await helpers.start(tester);
      await helpers.tab(tester, 'search');
      await tester.enterText(
        find.byKey(const ValueKey('property-search')),
        'Palm',
      );
      await tester.pumpAndSettle();
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('open-palm-residence')),
      );
      expect(find.text(demoProperties[1].title), findsOneWidget);
      expect(find.text(demoProperties[1].price), findsOneWidget);
      for (var i = 0; i < 3; i++) {
        await helpers.tapVisible(
          tester,
          find.byKey(const ValueKey('detail-favorite')),
        );
      }
      expect(find.text('Remove from saved'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await helpers.tab(tester, 'saved');
      expect(find.text(demoProperties[1].title), findsOneWidget);
      expect(find.text(demoProperties.first.title), findsNothing);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('open-palm-residence')),
      );
      expect(find.text('Remove from saved'), findsOneWidget);
    },
  );

  testWidgets('back preserves search query and category', (tester) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'search');
    await tester.enterText(
      find.byKey(const ValueKey('property-search')),
      'Garden',
    );
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Buy'));
    await helpers.tapVisible(
      tester,
      find.byKey(const ValueKey('open-garden-villa')),
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
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
    expect(find.text('1 demo results'), findsOneWidget);
  });
  for (final image in ['', 'assets/images/not-present.jpg']) {
    testWidgets('missing data and image fallback $image', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: BuyerPropertyDetailScreen(
            property: DemoProperty(
              id: 'missing',
              title: '',
              location: '',
              city: '',
              price: '',
              type: '',
              area: '',
              image: image,
              category: PropertyCategory.buy,
            ),
            saved: false,
            onFavorite: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Photo unavailable'), findsOneWidget);
      expect(find.text('Price unavailable'), findsOneWidget);
      expect(find.text('Location unavailable'), findsOneWidget);
      expect(
        find.text('No description is available for this demo listing.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }
  for (final dark in [false, true]) {
    testWidgets('small screen and large text in ${dark ? 'dark' : 'light'} theme', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: dark ? AppTheme.dark : AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(2)),
            child: child!,
          ),
          home: BuyerPropertyDetailScreen(
            property: DemoProperty(
              id: 'long',
              title:
                  'A fictional courtyard residence with a very long descriptive title for responsive layout testing',
              location:
                  'An unusually long fictional neighbourhood address in Kochi for layout testing',
              city: 'Kochi',
              price: demoProperties.first.price,
              type: 'Villa',
              area: '2,400 sq ft',
              image: demoProperties.first.image,
              category: PropertyCategory.buy,
              bedrooms: 3,
              bathrooms: 3,
            ),
            saved: false,
            onFavorite: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Fictional demo listing'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
}
