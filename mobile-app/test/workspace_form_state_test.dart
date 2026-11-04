import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'create_listing_photos_test.dart' show Fixture;

// These checks use only the in-process authentication transport fixture. No
// network, native picker, storage service or database is contacted.
void main() {
  const requiredFields = [
    FieldSpec('title', 'Property title', required: true),
    FieldSpec('intent', 'Purpose', options: ['BUY', 'RENT'], required: true),
    FieldSpec(
      'category',
      'Category',
      options: ['RESIDENTIAL', 'COMMERCIAL'],
      required: true,
    ),
  ];
  for (final missing in requiredFields) {
    testWidgets('offscreen ${missing.label} remains required before saving', (
      tester,
    ) async {
      final fixture = Fixture();
      try {
        await fixture.signIn(tester);
        fixture.transport.requests.clear();
        await tester.pumpWidget(
          MaterialApp(
            home: WorkspaceForm(
              repository: fixture.repository,
              title: 'Required fields fixture',
              path: '/api/enquiries',
              fields: [
                ...requiredFields,
                for (var index = 0; index < 16; index++)
                  FieldSpec('detail$index', 'Listing detail $index'),
              ],
              initial: {
                if (missing.key != 'title') 'title': 'Local listing fixture',
                if (missing.key != 'intent') 'intent': 'BUY',
                if (missing.key != 'category') 'category': 'RESIDENTIAL',
              },
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.text('Save'),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.ensureVisible(find.text('Save'));
        await tester.pumpAndSettle();
        expect(find.text(missing.label), findsNothing);
        await tester.tap(find.text('Save'));
        await tester.pumpAndSettle();
        expect(fixture.transport.requests, isEmpty);
        expect(find.textContaining('${missing.label}:'), findsWidgets);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    });
  }

  for (final intent in ['BUY', 'RENT']) {
    testWidgets('$intent listing selections survive scrolling and validation', (
      tester,
    ) async {
      final fixture = Fixture();
      try {
        await fixture.signIn(tester);
        fixture.transport.requests.clear();
        await tester.pumpWidget(
          MaterialApp(
            home: WorkspaceForm(
              repository: fixture.repository,
              title: 'Create listing fixture',
              path: '/api/properties',
              fixed: const {'status': 'PUBLISHED'},
              fields: [
                const FieldSpec(
                  'intent',
                  'Purpose',
                  options: ['BUY', 'RENT'],
                  required: true,
                ),
                const FieldSpec(
                  'category',
                  'Category',
                  options: ['RESIDENTIAL', 'COMMERCIAL'],
                  required: true,
                ),
                const FieldSpec(
                  'currency',
                  'Currency',
                  options: ['INR', 'USD'],
                  required: true,
                ),
                // Match the long listing form: the dropdowns leave the lazy
                // ListView cache before the publication action is visible.
                for (var index = 0; index < 16; index++)
                  FieldSpec('detail$index', 'Listing detail $index'),
              ],
            ),
          ),
        );
        await tester.pumpAndSettle();

        Future<void> reveal(Finder target, double direction) async {
          await tester.scrollUntilVisible(
            target,
            direction,
            scrollable: find.byType(Scrollable).first,
          );
          await tester.ensureVisible(target);
          await tester.pumpAndSettle();
        }

        Finder dropdown(String name) => find.byWidgetPredicate(
          (widget) =>
              widget is DropdownButtonFormField<String> &&
              widget.decoration.labelText == name,
        );

        Future<void> select(String name, String value) async {
          final field = dropdown(name);
          await reveal(field, 160);
          await tester.tap(field);
          await tester.pumpAndSettle();
          await tester.tap(find.text(value).last);
          await tester.pumpAndSettle();
        }

        await select('Purpose', intent);
        await select('Category', 'RESIDENTIAL');
        await select('Currency', 'INR');
        await reveal(find.text('Publish listing'), 200);
        expect(dropdown('Purpose'), findsNothing);
        expect(dropdown('Category'), findsNothing);

        await reveal(dropdown('Purpose'), -200);
        expect(
          tester.state<FormFieldState<String>>(dropdown('Purpose')).value,
          intent,
        );
        await reveal(dropdown('Category'), 100);
        expect(
          tester.state<FormFieldState<String>>(dropdown('Category')).value,
          'RESIDENTIAL',
        );
        await reveal(dropdown('Currency'), 100);
        expect(
          tester.state<FormFieldState<String>>(dropdown('Currency')).value,
          'INR',
        );

        await reveal(find.text('Publish listing'), 200);
        await tester.tap(find.text('Publish listing'));
        await tester.pumpAndSettle();
        expect(
          find.text(
            'Add at least 4 different property photos before publishing.',
          ),
          findsOneWidget,
        );
        expect(fixture.transport.requests, isEmpty);
        await reveal(dropdown('Purpose'), -200);
        expect(
          tester.state<FormFieldState<String>>(dropdown('Purpose')).value,
          intent,
        );
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    });
  }
}
