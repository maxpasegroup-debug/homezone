import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/buyer/data/demo_properties.dart';
import 'package:homezone_mobile/features/buyer/widgets/property_card.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_property_detail_screen.dart';
import 'buyer_widget_test.dart' as helpers;

void main() {
  test('new views lead and stable IDs deduplicate different objects', () {
    final first = demoProperties.first, second = demoProperties[1];
    var history = recordDemoView([], first);
    history = recordDemoView(history, second);
    expect(history.map((p) => p.id), [second.id, first.id]);
    final replacement = DemoProperty(
      id: first.id,
      title: 'Changed demo title',
      location: '',
      city: '',
      price: '',
      type: '',
      area: '',
      image: '',
      category: PropertyCategory.buy,
    );
    history = recordDemoView(history, replacement);
    expect(history.map((p) => p.id), [first.id, second.id]);
    expect(history.first, same(replacement));
  });
  test('real recording function keeps only ten unique latest properties', () {
    var history = <DemoProperty>[];
    for (var i = 0; i < 12; i++) {
      final property = DemoProperty(
        id: 'synthetic-$i',
        title: 'Fictional $i',
        location: '',
        city: '',
        price: '',
        type: '',
        area: '',
        image: '',
        category: PropertyCategory.buy,
      );
      history = recordDemoView(history, property);
      expect(history.length, lessThanOrEqualTo(10));
      expect(history.map((p) => p.id).toSet().length, history.length);
    }
    expect(history.map((p) => p.id), [
      for (var i = 11; i >= 2; i--) 'synthetic-$i',
    ]);
    history = recordDemoView(history, history.last);
    expect(history.length, 10);
    expect(history.first.id, 'synthetic-2');
  });
  Finder recent() => find.byKey(const ValueKey('recent-properties'));
  List<String> ids(WidgetTester tester) => tester
      .widgetList<PropertyCard>(
        find.descendant(of: recent(), matching: find.byType(PropertyCard)),
      )
      .map((card) => card.property.id)
      .toList();
  Future<void> openSearch(WidgetTester tester, String id) async {
    await helpers.tab(tester, 'search');
    await helpers.tapVisible(tester, find.byKey(ValueKey('open-$id')));
    expect(
      tester
          .widget<BuyerPropertyDetailScreen>(
            find.byType(BuyerPropertyDetailScreen),
          )
          .property
          .id,
      id,
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
    await helpers.tab(tester, 'home');
  }

  testWidgets(
    'empty history becomes ordered and recent cards reopen without duplicates',
    (tester) async {
      await helpers.start(tester);
      expect(find.text('Your story starts here'), findsOneWidget);
      expect(recent(), findsNothing);
      await openSearch(tester, 'garden-villa');
      expect(ids(tester), ['garden-villa']);
      await openSearch(tester, 'palm-residence');
      expect(ids(tester), ['palm-residence', 'garden-villa']);
      await helpers.tapVisible(
        tester,
        find.descendant(
          of: recent(),
          matching: find.byKey(const ValueKey('open-garden-villa')),
        ),
      );
      expect(
        tester
            .widget<BuyerPropertyDetailScreen>(
              find.byType(BuyerPropertyDetailScreen),
            )
            .property
            .id,
        'garden-villa',
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(ids(tester), ['garden-villa', 'palm-residence']);
    },
  );

  testWidgets(
    'history favorites share state and tab/rebuild never records again',
    (tester) async {
      await helpers.start(tester);
      await openSearch(tester, 'garden-villa');
      await openSearch(tester, 'palm-residence');
      await helpers.tapVisible(
        tester,
        find.descendant(
          of: recent(),
          matching: find.byKey(const ValueKey('favorite-garden-villa')),
        ),
      );
      expect(ids(tester), ['palm-residence', 'garden-villa']);
      await helpers.tab(tester, 'saved');
      expect(find.byTooltip('Unsave Garden Courtyard Villa'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('favorite-garden-villa')),
      );
      await helpers.tab(tester, 'search');
      await helpers.tab(tester, 'home');
      expect(ids(tester), ['palm-residence', 'garden-villa']);
      final card = tester.widget<PropertyCard>(
        find.descendant(of: recent(), matching: find.byType(PropertyCard)).last,
      );
      expect(card.saved, isFalse);
    },
  );

  for (final origin in ['home', 'saved']) {
    testWidgets('opening from $origin records the selected listing', (
      tester,
    ) async {
      await helpers.start(tester);
      if (origin == 'saved') {
        await helpers.tapVisible(
          tester,
          find.byKey(const ValueKey('favorite-garden-villa')),
        );
        await helpers.tab(tester, 'saved');
      }
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('open-garden-villa')),
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      await helpers.tab(tester, 'home');
      expect(ids(tester), ['garden-villa']);
    });
  }

  testWidgets('discarding buyer shell clears history', (tester) async {
    await helpers.start(tester);
    await openSearch(tester, 'garden-villa');
    expect(ids(tester), ['garden-villa']);
    await tester.pumpWidget(const SizedBox());
    await helpers.start(tester);
    expect(recent(), findsNothing);
    expect(find.text('Your story starts here'), findsOneWidget);
  });
}
