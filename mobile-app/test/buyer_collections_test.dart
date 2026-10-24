import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/buyer/data/buyer_collections.dart';
import 'buyer_widget_test.dart' as helpers;

void main() {
  test(
    'collections validate names, deduplicate membership and prune unsaved items',
    () {
      final favorites = {'garden-villa'};
      final c = BuyerCollections(favorites);
      expect(c.setName(''), isNotNull);
      expect(c.setName(' My Home '), isNull);
      expect(c.setName('my home'), isNotNull);
      final id = c.shortlists.single.id;
      c.membership(id, 'garden-villa', true);
      c.membership(id, 'garden-villa', true);
      expect(c.shortlists.single.propertyIds.length, 1);
      c.membership(id, 'palm-residence', true);
      expect(c.shortlists.single.propertyIds.length, 1);
      expect(c.setName('Renamed', id: id), isNull);
      favorites.remove('garden-villa');
      c.favoriteChanged('garden-villa');
      expect(c.shortlists.single.propertyIds, isEmpty);
      favorites.add('garden-villa');
      c.favoriteChanged('garden-villa');
      expect(c.shortlists.single.propertyIds, isEmpty);
      c.delete(id);
      expect(c.shortlists, isEmpty);
      c.dispose();
    },
  );
  test('comparison bounds selection and supports removal', () {
    final c = BuyerCollections({});
    for (final id in ['garden-villa', 'palm-residence', 'studio-office']) {
      c.compare(id, true);
    }
    expect(c.comparison.length, 2);
    c.compare('garden-villa', false);
    c.compare('studio-office', true);
    expect(c.comparison, {'palm-residence', 'studio-office'});
    c.compare('unknown', true);
    expect(c.comparison.length, 2);
    c.dispose();
  });
  testWidgets('create edit and delete shortlist through Saved', (tester) async {
    await helpers.start(tester);
    await helpers.tapVisible(
      tester,
      find.byKey(const ValueKey('favorite-garden-villa')),
    );
    await helpers.tab(tester, 'saved');
    await helpers.tapVisible(tester, find.text('Shortlists'));
    expect(find.text('No shortlists yet'), findsOneWidget);
    await helpers.tapVisible(tester, find.text('Create shortlist'));
    await tester.enterText(find.byType(TextField), 'Dream homes');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    await helpers.tapVisible(tester, find.text('Dream homes'));
    expect(find.text('This shortlist is empty'), findsOneWidget);
    await helpers.tapVisible(tester, find.byType(CheckboxListTile));
    expect(find.text('This shortlist is empty'), findsNothing);
    await helpers.tapVisible(tester, find.text('Rename'));
    await tester.enterText(find.byType(TextField), 'Family homes');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.text('Family homes'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.byKey(const ValueKey('open-garden-villa')),
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
    await helpers.tapVisible(tester, find.text('Delete shortlist'));
    expect(find.text('No shortlists yet'), findsOneWidget);
  });
  testWidgets('nonempty collections reset when shell is discarded', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'saved');
    await helpers.tapVisible(tester, find.text('Shortlists'));
    await helpers.tapVisible(tester, find.text('Create shortlist'));
    await tester.enterText(find.byType(TextField), 'Temporary');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.text('Temporary'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await helpers.tapVisible(tester, find.text('Compare Properties'));
    await helpers.tapVisible(
      tester,
      find.widgetWithText(FilterChip, 'Garden Courtyard Villa'),
    );
    expect(find.text('2,400 sq ft'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await helpers.start(tester);
    await helpers.tab(tester, 'saved');
    await helpers.tapVisible(tester, find.text('Shortlists'));
    expect(find.text('No shortlists yet'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await helpers.tapVisible(tester, find.text('Compare Properties'));
    expect(find.text('Choose properties to compare'), findsOneWidget);
  });
  testWidgets(
    'unsave and resave from shortlist details keeps membership empty and compare selected',
    (tester) async {
      await helpers.start(tester);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('favorite-garden-villa')),
      );
      await helpers.tab(tester, 'saved');
      await helpers.tapVisible(tester, find.text('Compare Properties'));
      await helpers.tapVisible(
        tester,
        find.widgetWithText(FilterChip, 'Garden Courtyard Villa'),
      );
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      await helpers.tapVisible(tester, find.text('Shortlists'));
      await helpers.tapVisible(tester, find.text('Create shortlist'));
      await tester.enterText(find.byType(TextField), 'Resave regression');
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();
      await helpers.tapVisible(tester, find.text('Resave regression'));
      await helpers.tapVisible(tester, find.byType(CheckboxListTile));
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('open-garden-villa')),
      );
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('detail-favorite')),
      );
      expect(find.text('Save demo property'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('detail-favorite')),
      );
      expect(find.text('Remove from saved'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('This shortlist is empty'), findsOneWidget);
      expect(find.byType(CheckboxListTile), findsOneWidget);
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isFalse,
      );
      expect(find.byKey(const ValueKey('open-garden-villa')), findsNothing);

      // Membership can be explicitly re-added and removed, without changing
      // the independently selected comparison property.
      await helpers.tapVisible(tester, find.byType(CheckboxListTile));
      expect(find.text('This shortlist is empty'), findsNothing);
      await helpers.tapVisible(tester, find.byType(CheckboxListTile));
      expect(find.text('This shortlist is empty'), findsOneWidget);
      await helpers.tapVisible(tester, find.text('Delete shortlist'));
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byTooltip('Unsave Garden Courtyard Villa'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('favorite-garden-villa')),
      );
      expect(find.text('A little inspiration, saved'), findsOneWidget);
      await helpers.tapVisible(tester, find.text('Compare Properties'));
      expect(find.text('2,400 sq ft'), findsOneWidget);
      expect(
        tester
            .widget<FilterChip>(
              find.widgetWithText(FilterChip, 'Garden Courtyard Villa'),
            )
            .selected,
        isTrue,
      );
      await helpers.tapVisible(tester, find.text('Remove'));
      expect(find.text('Choose properties to compare'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('comparison supports narrow screen and enlarged text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await helpers.start(tester);
    await helpers.tab(tester, 'saved');
    await helpers.tapVisible(tester, find.text('Compare Properties'));
    await helpers.tapVisible(
      tester,
      find.widgetWithText(FilterChip, 'Garden Courtyard Villa'),
    );
    await helpers.tapVisible(
      tester,
      find.widgetWithText(FilterChip, 'Neighbourhood Studio Office'),
    );
    await helpers.tapVisible(tester, find.text('Back to browsing'));
    expect(tester.takeException(), isNull);
  });
  testWidgets('comparison facts missing bedrooms removal and reset', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'saved');
    await helpers.tapVisible(tester, find.text('Compare Properties'));
    expect(find.text('Choose properties to compare'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(FilterChip, 'Neighbourhood Studio Office'),
    );
    expect(find.text('Not provided'), findsOneWidget);
    expect(find.text('900 sq ft'), findsOneWidget);
    await helpers.tapVisible(tester, find.text('Remove'));
    expect(find.text('Choose properties to compare'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await helpers.start(tester);
    await helpers.tab(tester, 'saved');
    await helpers.tapVisible(tester, find.text('Shortlists'));
    expect(find.text('No shortlists yet'), findsOneWidget);
  });
}
