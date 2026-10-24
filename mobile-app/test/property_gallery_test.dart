import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/buyer/data/demo_properties.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_gallery_screen.dart';
import 'package:homezone_mobile/features/buyer/screens/buyer_property_detail_screen.dart';
import 'package:homezone_mobile/theme/app_theme.dart';
import 'buyer_widget_test.dart' as helpers;

void main() {
  Future<void> details(WidgetTester tester) async {
    await helpers.start(tester);
    await helpers.tab(tester, 'search');
    await helpers.tapVisible(
      tester,
      find.byKey(const ValueKey('open-palm-residence')),
    );
  }

  testWidgets(
    'correct gallery returns to selected details with shared favorite',
    (tester) async {
      await details(tester);
      await helpers.tapVisible(
        tester,
        find.byKey(const ValueKey('detail-favorite')),
      );
      await helpers.tapVisible(tester, find.text('Photos'));
      expect(find.byType(BuyerGalleryScreen), findsOneWidget);
      expect(find.text('Palm Grove Residence'), findsOneWidget);
      final image = tester.widget<Image>(find.byType(Image));
      expect((image.image as AssetImage).assetName, demoProperties[1].image);
      expect(
        find.byType(Image),
        findsOneWidget,
      ); // No synthetic duplicate gallery images.
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byType(BuyerPropertyDetailScreen), findsOneWidget);
      expect(find.text('Remove from saved'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await helpers.tab(tester, 'saved');
      expect(find.text('Palm Grove Residence'), findsOneWidget);
    },
  );
  for (final image in ['', 'assets/images/unavailable.jpg']) {
    testWidgets(
      'gallery handles ${image.isEmpty ? 'empty' : 'failed'} photography',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: BuyerGalleryScreen(
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
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(
            image.isEmpty ? 'No photos available' : 'Photo unavailable',
          ),
          findsOneWidget,
        );
        expect(find.text('Untitled demo property'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('video and floor plan never fabricate media', (tester) async {
    await details(tester);
    await helpers.tapVisible(tester, find.text('Videos'));
    expect(find.text('Videos unavailable'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    await helpers.tapVisible(
      tester,
      find.widgetWithText(ChoiceChip, 'Floor Plan'),
    );
    expect(find.text('Floor plan unavailable'), findsOneWidget);
    await helpers.tapVisible(tester, find.widgetWithText(ChoiceChip, 'Photos'));
    expect(find.byType(Image), findsOneWidget);
  });
  testWidgets(
    'contact and enquiry previews explicitly perform no real action',
    (tester) async {
      await details(tester);
      for (final action in ['Contact preview', 'Enquiry preview']) {
        await helpers.tapVisible(tester, find.text(action));
        expect(
          find.textContaining('No enquiry was sent and no call was placed'),
          findsOneWidget,
        );
        await tester.tap(find.text('Close'));
        await tester.pumpAndSettle();
        expect(find.byType(BuyerPropertyDetailScreen), findsOneWidget);
      }
    },
  );
  for (final dark in [false, true]) {
    testWidgets(
      'gallery large text and narrow ${dark ? 'dark' : 'light'} layout',
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
              ).copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: BuyerGalleryScreen(property: demoProperties.first),
          ),
        );
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.textContaining('Fictional demo media'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      },
    );
  }
}
