import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/workspace/listing_photo_picker.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'create_listing_photos_test.dart' show Fixture;
import 'marketplace_test.dart' show json;

const _channel = MethodChannel('homezone/media-picker');
const _id = 'property-wizard-0001';
const _png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwY2D4DwACHAFG3vnH5QAAAABJRU5ErkJggg==';
const _fields = [
  FieldSpec('intent', 'Purpose', required: true, options: ['BUY', 'RENT']),
  FieldSpec('category', 'Category', required: true, options: ['RESIDENTIAL']),
  FieldSpec('propertyType', 'Property type', required: true),
  FieldSpec(
    'title',
    'Property title',
    required: true,
    minLength: 3,
    maxLength: 160,
  ),
  FieldSpec(
    'description',
    'Description',
    required: true,
    minLength: 10,
    maxLength: 3000,
  ),
  FieldSpec('city', 'City', required: true),
  FieldSpec('price', 'Price', required: true, number: true),
  FieldSpec('currency', 'Currency', required: true, options: ['INR']),
];
const _initial = {
  'intent': 'BUY',
  'category': 'RESIDENTIAL',
  'propertyType': 'Apartment',
  'title': 'Local wizard fixture',
  'description': 'A property used only in this test.',
  'city': 'Fixture city',
  'price': 2000000,
  'currency': 'INR',
};

Finder _button(String label) => find
    .ancestor(
      of: find.text(label),
      matching: find.byWidgetPredicate((widget) => widget is ButtonStyleButton),
    )
    .first;

Future<void> _tap(WidgetTester tester, String label) async {
  await tester.ensureVisible(_button(label));
  await tester.tap(_button(label));
  await tester.pumpAndSettle();
}

Future<void> _toPhotos(WidgetTester tester) async {
  for (var step = 0; step < 4; step++) {
    expect(find.text('Step ${step + 1} of 6'), findsOneWidget);
    await _tap(tester, 'Continue');
  }
  expect(find.text('Step 5 of 6'), findsOneWidget);
}

List<ApiRequest> _writes(Fixture fixture) => fixture.transport.requests
    .where(
      (request) =>
          const ['POST', 'PATCH'].contains(request.method) &&
          !request.uri.path.startsWith('/api/auth/'),
    )
    .toList();

void main() {
  late Fixture fixture;
  var selected = 0;
  void wizardTest(String description, WidgetTesterCallback body) {
    testWidgets(description, (tester) async {
      fixture = Fixture();
      selected = 0;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            _channel,
            (_) async => {
              'base64': base64Encode([...base64Decode(_png), selected++]),
            },
          );
      try {
        await body(tester);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(_channel, null);
        await tester.pump();
      }
    });
  }

  Future<void> open(
    WidgetTester tester, {
    Map<String, dynamic> initial = _initial,
    bool publish = true,
    double textScale = 1,
  }) async {
    if (!publish) fixture.transport.role = 'BROKER';
    await fixture.signIn(tester);
    fixture.transport.requests.clear();
    final navigator = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigator,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        home: const Scaffold(body: Text('Listings fixture')),
      ),
    );
    unawaited(
      navigator.currentState!.push<void>(
        MaterialPageRoute(
          builder: (_) => WorkspaceForm(
            repository: fixture.repository,
            title: 'Create listing',
            path: '/api/properties',
            fields: _fields,
            initial: initial,
            fixed: {'status': publish ? 'PUBLISHED' : 'DRAFT'},
            guidedListing: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> addPhotos(WidgetTester tester, [int count = 4]) async {
    for (var index = 0; index < count; index++) {
      if (find.text('Add photo').evaluate().isEmpty) {
        await tester.scrollUntilVisible(
          find.text('Add photo'),
          160,
          scrollable: find.byType(Scrollable).first,
        );
      }
      await tester.ensureVisible(_button('Add photo'));
      await tester.pumpAndSettle();
      final action = tester
          .widget<ButtonStyleButton>(_button('Add photo'))
          .onPressed!;
      await tester.runAsync(
        () async => await (action as Future<void> Function())(),
      );
      await tester.pumpAndSettle();
    }
  }

  wizardTest('step validation blocks navigation without any backend write', (
    tester,
  ) async {
    await open(tester, initial: {..._initial, 'intent': ''});
    await _tap(tester, 'Continue');
    expect(find.text('Step 1 of 6'), findsOneWidget);
    expect(find.textContaining('Purpose: Choose an option'), findsOneWidget);
    expect(_writes(fixture), isEmpty);
    expect(fixture.transport.requests, isEmpty);
  });

  wizardTest('Back preserves entered details and normalized sale purpose', (
    tester,
  ) async {
    await open(tester);
    await _tap(tester, 'Continue');
    final title = find.widgetWithText(TextFormField, 'Property title');
    await tester.enterText(title, 'Retained listing title');
    await _tap(tester, 'Continue');
    expect(find.text('Step 3 of 6'), findsOneWidget);
    await _tap(tester, 'Back');
    expect(find.text('Retained listing title'), findsOneWidget);
    await _tap(tester, 'Back');
    expect(find.text('Sell'), findsOneWidget);
    final purpose = tester.widget<DropdownButtonFormField<String>>(
      find.byWidgetPredicate(
        (widget) =>
            widget is DropdownButtonFormField<String> &&
            widget.decoration.labelText == 'Purpose',
      ),
    );
    expect(purpose.initialValue, 'BUY');
    expect(_writes(fixture), isEmpty);
  });

  wizardTest(
    'short property details are rejected before photos or a backend write',
    (tester) async {
      await open(tester, initial: {..._initial, 'title': 'A'});
      await _tap(tester, 'Continue');
      await _tap(tester, 'Continue');
      expect(find.text('Step 2 of 6'), findsOneWidget);
      expect(
        find.textContaining('Property title: Use at least 3 characters'),
        findsOneWidget,
      );
      expect(_writes(fixture), isEmpty);
    },
  );

  wizardTest('session loss on a later step leaves a safe exit to Listings', (
    tester,
  ) async {
    await open(tester);
    await _tap(tester, 'Continue');
    fixture.controller.clearLocalSession();
    await tester.pumpAndSettle();
    expect(find.text('Sign in again before making changes.'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Listings fixture'), findsOneWidget);
    expect(find.byType(WorkspaceForm), findsNothing);
    expect(_writes(fixture), isEmpty);
  });

  wizardTest('Owner cannot reach review with fewer than four photos', (
    tester,
  ) async {
    await open(tester);
    await _toPhotos(tester);
    await addPhotos(tester, 3);
    await _tap(tester, 'Continue');
    expect(find.byKey(const ValueKey('listing-step-4')), findsOneWidget);
    await tester.scrollUntilVisible(
      find.textContaining(
        'Add at least 4 different property photos before publishing.',
      ),
      150,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.textContaining(
        'Add at least 4 different property photos before publishing.',
      ),
      findsOneWidget,
    );
    expect(
      tester.widget<ListingPhotoPicker>(find.byType(ListingPhotoPicker)).photos,
      hasLength(3),
    );
    expect(_writes(fixture), isEmpty);
  });

  wizardTest(
    'review precedes one draft, four uploads, readback and publication',
    (tester) async {
      var uploads = 0;
      Map<String, dynamic>? created;
      fixture.initialize();
      fixture.transport.reply = (request) {
        if (request.method == 'POST' && request.uri.path == '/api/properties') {
          created = jsonDecode(request.body!) as Map<String, dynamic>;
          return json({
            'property': {'id': _id, 'status': 'DRAFT'},
          });
        }
        if (request.uri.path == '/api/mobile/upload') {
          uploads++;
          return json({'url': 'https://images.example.invalid/$uploads.png'});
        }
        if (request.uri.path == '/api/properties/$_id/media') {
          return json({
            'property': {
              'id': _id,
              'coverImageUrl': null,
              'mediaUrls': List.generate(
                uploads,
                (i) => 'https://images.example.invalid/${i + 1}.png',
              ),
            },
          });
        }
        if (request.method == 'PATCH')
          return json({
            'property': {'id': _id, 'status': 'PUBLISHED'},
          });
        return json({}, 404);
      };
      await open(tester);
      await _toPhotos(tester);
      await addPhotos(tester);
      await _tap(tester, 'Continue');
      expect(find.text('Step 6 of 6'), findsOneWidget);
      expect(_writes(fixture), isEmpty);
      final submit = tester
          .widget<ButtonStyleButton>(_button('Publish listing'))
          .onPressed!;
      submit();
      submit();
      await tester.pumpAndSettle();
      if (find.text('Back to listings').evaluate().isNotEmpty) {
        await tester.drag(find.byType(ListView).first, const Offset(0, -4000));
        await tester.pumpAndSettle();
      }
      expect(
        _writes(fixture).map((request) => request.uri.path),
        [
          '/api/properties',
          ...List.filled(4, '/api/mobile/upload'),
          '/api/properties/$_id',
        ],
        reason: tester
            .widgetList<Text>(find.byType(Text))
            .map((text) => text.data)
            .join('\n'),
      );
      expect(uploads, 4);
      expect(created?['status'], 'DRAFT');
      expect(created?['intent'], 'BUY');
      expect(find.text('Listing published with 4 photos.'), findsOneWidget);
    },
  );

  wizardTest(
    'unavailable storage retains review and photos without creating a draft',
    (tester) async {
      fixture.transport.photoReadinessReply = (_) =>
          json({'propertyPhotoUploadConfigured': false});
      await open(tester);
      await _toPhotos(tester);
      await addPhotos(tester);
      await _tap(tester, 'Continue');
      await _tap(tester, 'Publish listing');
      expect(find.byKey(const ValueKey('listing-step-5')), findsOneWidget);
      expect(_writes(fixture), isEmpty);
      await tester.scrollUntilVisible(
        find.textContaining('No listing was created.'),
        150,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining('No listing was created.'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Edit photos'),
        -200,
        scrollable: find.byType(Scrollable).first,
      );
      await _tap(tester, 'Edit photos');
      expect(
        tester
            .widget<ListingPhotoPicker>(find.byType(ListingPhotoPicker))
            .photos,
        hasLength(4),
      );
    },
  );

  wizardTest('uncertain draft creation cannot be submitted again from review', (
    tester,
  ) async {
    fixture.initialize();
    fixture.transport.reply = (request) {
      if (request.uri.path == '/api/properties')
        throw const ApiException(ApiFailure.timeout);
      return json({}, 404);
    };
    await open(tester);
    await _toPhotos(tester);
    await addPhotos(tester);
    await _tap(tester, 'Continue');
    final submit = tester
        .widget<ButtonStyleButton>(_button('Publish listing'))
        .onPressed!;
    submit();
    await tester.pumpAndSettle();
    submit();
    await tester.pumpAndSettle();
    expect(_writes(fixture), hasLength(1));
    expect(find.text('Back to listings'), findsOneWidget);
    expect(find.text('Listing published with 4 photos.'), findsNothing);
  });

  wizardTest('Broker can review and save a private draft without photos', (
    tester,
  ) async {
    fixture.initialize();
    fixture.transport.reply = (_) => json({
      'property': {'id': _id, 'status': 'DRAFT'},
    });
    await open(tester, publish: false);
    await _toPhotos(tester);
    await _tap(tester, 'Continue');
    await _tap(tester, 'Save draft');
    final writes = _writes(fixture);
    expect(writes, hasLength(1));
    expect(jsonDecode(writes.single.body!)['status'], 'DRAFT');
  });

  wizardTest('narrow large-text layout preserves visible navigation', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await open(tester, textScale: 2);
    final context = tester.element(find.byType(WorkspaceForm));
    // The wizard uses scrollable content and an independently reachable footer.
    expect(MediaQuery.sizeOf(context).width, 320);
    await _tap(tester, 'Continue');
    expect(find.text('Step 2 of 6'), findsOneWidget);
    for (var step = 0; step < 3; step++) {
      await _tap(tester, 'Continue');
    }
    await addPhotos(tester);
    await _tap(tester, 'Continue');
    expect(find.byKey(const ValueKey('listing-step-5')), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Edit photos'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      tester.widget<ButtonStyleButton>(_button('Publish listing')).onPressed,
      isNotNull,
    );
    expect(tester.takeException(), isNull);
  });
}
