import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_filter_sheet.dart';
import 'package:homezone_mobile/features/buyer/data/buyer_filters.dart';
import 'package:homezone_mobile/features/buyer/data/demo_properties.dart';
import 'package:homezone_mobile/theme/app_theme.dart';
import 'buyer_widget_test.dart' as helpers;

void main() {
  Future<void> open(WidgetTester tester) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'search');
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
  }

  Future<void> applyBudget(
    WidgetTester tester,
    PropertyCategory category,
    int amount,
  ) async {
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    await helpers.tapVisible(
      tester,
      find.widgetWithText(ChoiceChip, category.label).last,
    );
    tester.widget<Slider>(find.byType(Slider)).onChanged!(amount.toDouble());
    await tester.pumpAndSettle();
    await helpers.tapVisible(tester, find.text('Apply Filters'));
  }

  test('category budget transition respects price basis', () {
    expect(
      budgetAfterCategoryChange(
        PropertyCategory.rent,
        PropertyCategory.buy,
        50000,
      ),
      isNull,
    );
    expect(
      budgetAfterCategoryChange(
        PropertyCategory.buy,
        PropertyCategory.rent,
        10000000,
      ),
      isNull,
    );
    expect(
      budgetAfterCategoryChange(
        PropertyCategory.buy,
        PropertyCategory.land,
        10000000,
      ),
      10000000,
    );
    expect(
      budgetAfterCategoryChange(
        PropertyCategory.rent,
        PropertyCategory.commercial,
        50000,
      ),
      50000,
    );
    expect(
      budgetAfterCategoryChange(PropertyCategory.rent, null, 50000),
      isNull,
    );
    expect(
      budgetAfterCategoryChange(null, PropertyCategory.buy, 50000),
      isNull,
    );
    expect(
      budgetAfterCategoryChange(
        PropertyCategory.rent,
        PropertyCategory.rent,
        50000,
      ),
      50000,
    );
  });

  testWidgets('Home category change clears monthly budget but keeps query', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'search');
    await applyBudget(tester, PropertyCategory.rent, 50000);
    expect(find.text('1 demo results'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    tester
        .widget<DropdownButtonFormField<String>>(
          find.byType(DropdownButtonFormField<String>),
        )
        .onChanged!('Kochi');
    await tester.pumpAndSettle();
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, '3'));
    await helpers.tapVisible(tester, find.text('Apply Filters'));
    await tester.enterText(
      find.byKey(const ValueKey('property-search')),
      'Garden',
    );
    await tester.pumpAndSettle();
    await helpers.tab(tester, 'home');
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Buy'));
    expect(find.byKey(const ValueKey('open-garden-villa')), findsOneWidget);
    await helpers.tab(tester, 'search');
    expect(
      tester
          .widget<TextField>(find.byKey(const ValueKey('property-search')))
          .controller!
          .text,
      'Garden',
    );
    expect(find.text('1 demo results'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    expect(find.text('Budget: any listed amount'), findsOneWidget);
    expect(
      tester
          .widget<DropdownButtonFormField<String>>(
            find.byType(DropdownButtonFormField<String>),
          )
          .initialValue,
      'Kochi',
    );
    expect(
      tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, '3')).selected,
      isTrue,
    );
  });

  testWidgets('Search category changes clear incompatible budgets both ways', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'search');
    await applyBudget(tester, PropertyCategory.rent, 50000);
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Buy'));
    expect(find.text('2 demo results'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    expect(find.text('Budget: any listed amount'), findsOneWidget);
    await helpers.tapVisible(tester, find.text('Cancel'));

    await applyBudget(tester, PropertyCategory.buy, 10000000);
    expect(find.text('1 demo results'), findsOneWidget);
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Rent'));
    expect(find.text('1 demo results'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    expect(find.text('Budget: any listed amount'), findsOneWidget);
  });

  testWidgets('sheet category draft shares rule and Cancel does not commit', (
    tester,
  ) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'search');
    await applyBudget(tester, PropertyCategory.rent, 50000);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    expect(find.text('Maximum listed amount: ₹50000'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(ChoiceChip, 'Buy').last,
    );
    expect(find.text('Budget: any listed amount'), findsOneWidget);
    await helpers.tapVisible(tester, find.text('Cancel'));
    expect(find.text('1 demo results'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    expect(find.text('Maximum listed amount: ₹50000'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(ChoiceChip, 'Buy').last,
    );
    await helpers.tapVisible(tester, find.text('Apply Filters'));
    expect(find.text('2 demo results'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Filters'),
    );
    await helpers.tapVisible(tester, find.text('Reset'));
    await helpers.tapVisible(tester, find.text('Apply Filters'));
    expect(find.text('4 demo results'), findsOneWidget);
  });

  testWidgets(
    'filter cancel discards, apply commits and reset waits for apply',
    (tester) async {
      await open(tester);
      await helpers.tapVisible(
        tester,
        find.widgetWithText(ChoiceChip, 'Rent').last,
      );
      await helpers.tapVisible(tester, find.text('Cancel'));
      expect(find.text('4 demo results'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.widgetWithText(OutlinedButton, 'Filters'),
      );
      await helpers.tapVisible(
        tester,
        find.widgetWithText(ChoiceChip, 'Rent').last,
      );
      await helpers.tapVisible(tester, find.text('Apply Filters'));
      expect(find.text('1 demo results'), findsOneWidget);
      expect(find.text('Lakeside Family Home'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('open-lakeside-rental')),
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('1 demo results'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.widgetWithText(OutlinedButton, 'Filters'),
      );
      await helpers.tapVisible(tester, find.text('Reset'));
      await helpers.tapVisible(tester, find.text('Cancel'));
      expect(find.text('1 demo results'), findsOneWidget);
      await helpers.tapVisible(
        tester,
        find.widgetWithText(OutlinedButton, 'Filters'),
      );
      await helpers.tapVisible(tester, find.text('Reset'));
      await helpers.tapVisible(tester, find.text('Apply Filters'));
      expect(find.text('4 demo results'), findsOneWidget);
    },
  );
  testWidgets('localities, land empty state, sort and map disclosure', (
    tester,
  ) async {
    await helpers.start(tester);
    expect(find.text('Popular localities'), findsOneWidget);
    await helpers.tapVisible(tester, find.text('Aluva'));
    expect(find.text('Palm Grove Residence'), findsOneWidget);
    await helpers.tapVisible(tester, find.byTooltip('Clear search'));
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Land'));
    expect(find.text('No demo matches'), findsOneWidget);
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, 'All'));
    await helpers.tapVisible(tester, find.text('Sort ▾'));
    await tester.tap(find.text('Title A–Z'));
    await tester.pumpAndSettle();
    expect(find.text('4 demo results'), findsOneWidget);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(OutlinedButton, 'Map View'),
    );
    expect(find.textContaining('Map view is not implemented'), findsOneWidget);
    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
  });
  test('budget bedrooms and furnishing use available demo fields', () {
    expect(
      demoProperties.where(const BuyerFilters(maxAmount: 50000).accepts).length,
      2,
    );
    expect(
      demoProperties.where(const BuyerFilters(bedrooms: 2).accepts).single.id,
      'lakeside-rental',
    );
    expect(
      demoProperties
          .where(
            const BuyerFilters(furnishing: Furnishing.semiFurnished).accepts,
          )
          .single
          .id,
      'garden-villa',
    );
  });

  test(
    'furnishing labels match exact categories and normalize case and whitespace',
    () {
      DemoProperty listing(String? label) => DemoProperty(
        id: demoProperties.first.id,
        title: demoProperties.first.title,
        location: demoProperties.first.location,
        city: demoProperties.first.city,
        price: demoProperties.first.price,
        type: demoProperties.first.type,
        area: demoProperties.first.area,
        image: demoProperties.first.image,
        category: demoProperties.first.category,
        amount: demoProperties.first.amount,
        bedrooms: demoProperties.first.bedrooms,
        furnishing: label,
      );
      for (final selected in Furnishing.values) {
        final filter = BuyerFilters(furnishing: selected);
        for (final value in Furnishing.values) {
          expect(filter.accepts(listing(value.label)), value == selected);
          expect(
            filter.accepts(listing('  ${value.label.toUpperCase()}  ')),
            value == selected,
          );
          expect(
            filter.accepts(listing('${value.label} (demo)')),
            value == selected,
          );
        }
        for (final missingOrUnknown in <String?>[
          null,
          '',
          '   ',
          'Partly furnished',
          'Unfurnished suite',
          'Fully furnished',
        ]) {
          expect(Furnishing.fromLabel(missingOrUnknown), isNull);
          expect(filter.accepts(listing(missingOrUnknown)), isFalse);
          expect(
            const BuyerFilters().accepts(listing(missingOrUnknown)),
            isTrue,
          );
        }
      }
      final fixture = demoProperties.first;
      expect(
        const BuyerFilters(
          furnishing: Furnishing.semiFurnished,
          bedrooms: 3,
          maxAmount: 13000000,
        ).accepts(fixture),
        isTrue,
      );
      expect(
        const BuyerFilters(
          furnishing: Furnishing.semiFurnished,
          bedrooms: 2,
        ).accepts(fixture),
        isFalse,
      );
      expect(
        const BuyerFilters(
          furnishing: Furnishing.semiFurnished,
          maxAmount: 10000000,
        ).accepts(fixture),
        isFalse,
      );
    },
  );

  testWidgets(
    'furnishing draft selections apply cancel and reset independently',
    (tester) async {
      await helpers.start(tester);
      await helpers.tab(tester, 'search');
      await tester.enterText(
        find.byKey(const ValueKey('property-search')),
        'Garden',
      );
      Future<void> sheet() => helpers.tapVisible(
        tester,
        find.widgetWithText(OutlinedButton, 'Filters'),
      );
      Future<void> choose(String label) async {
        await helpers.tapVisible(
          tester,
          find.byType(DropdownButtonFormField<Furnishing>),
        );
        await tester.tap(find.text(label).last);
        await tester.pumpAndSettle();
      }

      await sheet();
      await choose('Unfurnished');
      await helpers.tapVisible(tester, find.text('Cancel'));
      expect(find.text('1 demo results'), findsOneWidget);
      for (final pair in [
        ('Furnished', '0 demo results'),
        ('Semi-Furnished', '1 demo results'),
        ('Unfurnished', '0 demo results'),
      ]) {
        await sheet();
        await choose(pair.$1);
        await helpers.tapVisible(tester, find.text('Apply Filters'));
        expect(find.text(pair.$2), findsOneWidget);
      }
      await sheet();
      await helpers.tapVisible(tester, find.text('Reset'));
      expect(find.text('Any furnishing'), findsOneWidget);
      await helpers.tapVisible(tester, find.text('Cancel'));
      expect(find.text('0 demo results'), findsOneWidget);
      await sheet();
      expect(find.text('Unfurnished'), findsOneWidget);
      await helpers.tapVisible(tester, find.text('Reset'));
      await helpers.tapVisible(tester, find.text('Apply Filters'));
      expect(find.text('1 demo results'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('property-search')))
            .controller!
            .text,
        'Garden',
      );
      await sheet();
      expect(find.text('Any furnishing'), findsOneWidget);
    },
  );
  for (final dark in [false, true]) {
    testWidgets(
      'filter sheet supports small screen and scaled ${dark ? 'dark' : 'light'} theme',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(
          MaterialApp(
            theme: dark ? AppTheme.dark : AppTheme.light,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(1.5)),
              child: child!,
            ),
            home: const Scaffold(
              body: BuyerFilterSheet(initial: BuyerFilters()),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Apply Filters'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      },
    );
  }
}
