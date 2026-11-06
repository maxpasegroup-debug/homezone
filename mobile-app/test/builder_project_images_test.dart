import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart'
    show ListingImage;
import 'package:homezone_mobile/features/workspace/builder_project_images.dart';
import 'package:homezone_mobile/features/workspace/listing_photo_picker.dart';

const _png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwY2D4DwACHAFG3vnH5QAAAABJRU5ErkJggg==';

SelectedListingPhoto _photo([int tag = 0, int? length]) {
  final png = base64Decode(_png);
  final bytes = Uint8List(length ?? png.length + 1)
    ..setRange(0, png.length, png);
  bytes[bytes.length - 1] = tag;
  return SelectedListingPhoto.fromPicker({'base64': base64Encode(bytes)});
}

Future<void> _show(
  WidgetTester tester, {
  Map<String, List<SelectedListingPhoto>> selections = const {},
  Map<String, dynamic> existing = const {},
  ValueChanged<Map<String, List<SelectedListingPhoto>>>? onChanged,
  bool current = true,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: ListView(
          children: [
            BuilderProjectImages(
              selections: selections,
              existing: existing,
              enabled: true,
              isCurrent: () => current,
              onChanged: onChanged ?? (_) {},
              onPickingChanged: (_) {},
            ),
          ],
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

ListingPhotoPicker _picker(WidgetTester tester, String field) =>
    tester.widget<ListingPhotoPicker>(
      find.byKey(ValueKey('builder-project-images-$field')),
    );

void main() {
  testWidgets(
    'Builder image slots reuse bounded picker and retain legacy PDFs',
    (tester) async {
      await _show(
        tester,
        existing: {'brochureUrl': 'https://files.example.invalid/brochure.pdf'},
      );
      expect(
        BuilderProjectImages.fields.map(
          (field) => _picker(tester, field).maximumPhotos,
        ),
        [6, 6, 1, 1],
      );
      expect(_picker(tester, 'mediaUrls').addLabel, 'Add project photo');
      expect(_picker(tester, 'floorPlanUrls').addLabel, 'Add floor plan');
      expect(_picker(tester, 'masterPlanUrl').addLabel, 'Add master plan');
      expect(_picker(tester, 'brochureUrl').addLabel, 'Add brochure image');
      expect(find.text('Existing brochure saved'), findsOneWidget);
      expect(find.byType(ListingImage), findsNothing);
      expect(ListingPhotoPicker.maxPhotos, 6);
      expect(ListingPhotoPicker.minimumPublicationPhotos, 2);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('the same selected bytes cannot be used in another section', (
    tester,
  ) async {
    final photo = _photo();
    Map<String, List<SelectedListingPhoto>>? changed;
    await _show(
      tester,
      selections: {
        'mediaUrls': [photo],
      },
      onChanged: (value) => changed = value,
    );
    _picker(tester, 'floorPlanUrls').onChanged([photo]);
    await tester.pumpAndSettle();
    expect(changed, isNull);
    expect(
      find
          .text(
            'That image is already selected in another project section. Choose a different image.',
          )
          .hitTestable(),
      findsOneWidget,
    );
    expect(_picker(tester, 'mediaUrls').photos, [photo]);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('all sections share the 24 MiB selection budget', (tester) async {
    final selected = [
      for (var index = 0; index < 4; index++)
        _photo(index, SelectedListingPhoto.maxBytes),
    ];
    Map<String, List<SelectedListingPhoto>>? changed;
    await _show(
      tester,
      selections: {'mediaUrls': selected},
      onChanged: (value) => changed = value,
    );
    _picker(tester, 'floorPlanUrls').onChanged([_photo(5)]);
    await tester.pumpAndSettle();
    expect(changed, isNull);
    expect(
      find
          .text(
            'Choose project images totalling no more than 24 MB across all sections.',
          )
          .hitTestable(),
      findsOneWidget,
    );
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'a new single image is a pending selection, not a stored mutation',
    (tester) async {
      final existing = {
        'masterPlanUrl': 'https://files.example.invalid/master-plan.pdf',
        'brochureUrl': 'https://files.example.invalid/brochure.pdf',
      };
      final photo = _photo();
      Map<String, List<SelectedListingPhoto>>? changed;
      await _show(
        tester,
        existing: existing,
        onChanged: (value) => changed = value,
      );
      _picker(tester, 'brochureUrl').onChanged([photo]);
      await tester.pump();
      expect(changed?['brochureUrl'], [photo]);
      expect(changed?['masterPlanUrl'], isEmpty);
      expect(
        existing['brochureUrl'],
        'https://files.example.invalid/brochure.pdf',
      );
      expect(find.byType(ListingImage), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('expired account context hides stored and selected media', (
    tester,
  ) async {
    await _show(
      tester,
      current: false,
      selections: {
        'mediaUrls': [_photo()],
      },
      existing: {
        'brochureUrl': 'https://files.example.invalid/private-name.pdf',
      },
    );
    expect(find.byType(ListingPhotoPicker), findsNothing);
    expect(find.byType(ListingImage), findsNothing);
    expect(find.text('Existing brochure saved'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
