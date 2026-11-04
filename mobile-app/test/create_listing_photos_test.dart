import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/workspace/listing_photo_picker.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'marketplace_test.dart' show FixtureTransport, json;

// Three complete one-pixel PNGs. All media and API replies stay in this process.
const _pngs = [
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwY2D4DwACHAFG3vnH5QAAAABJRU5ErkJggg==',
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPoYWD4DwADNAGM1yB87QAAAABJRU5ErkJggg==',
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGO4xMDwHwAETAHSEZXr1AAAAABJRU5ErkJggg==',
];
const _channel = MethodChannel('homezone/media-picker');
const _propertyId = 'property-0001';

Map<String, dynamic> _picked([int index = 0]) => {
  'base64': index < _pngs.length
      ? _pngs[index]
      : base64Encode([...base64Decode(_pngs[index % _pngs.length]), index]),
};

class _OwnerTransport extends FixtureTransport {
  String role = 'OWNER';
  FutureOr<ApiResponse> Function(ApiRequest)? photoReadinessReply;

  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    if (request.uri.path == '/api/mobile/capabilities') {
      requests.add(request);
      return photoReadinessReply == null
          ? json({'propertyPhotoUploadConfigured': true})
          : await photoReadinessReply!(request);
    }
    if (request.uri.path == '/api/auth/session') {
      requests.add(request);
      return json({
        'user': {'id': identity, 'role': role, 'whatsappVerified': false},
        'expires': DateTime.now()
            .toUtc()
            .add(const Duration(days: 1))
            .toIso8601String(),
      });
    }
    return super.send(request, timeout, onHeaders: onHeaders);
  }
}

class Fixture {
  bool initialized = false;

  void initialize() {
    if (initialized) return;
    initialized = true;
    final configuration = ApiConfiguration(
      'https://fixture.example.invalid',
      environment: ApiEnvironment.staging,
    );
    final client = ApiClient(
      configuration: configuration,
      transport: transport,
    );
    final coordinator = CookieRequestCoordinator(
      configuration: configuration,
      clock: DateTime.now,
    );
    controller = SignInController(
      PasswordAuthProtocol(client: client, coordinator: coordinator),
    );
    repository = MarketplaceRepository(
      client: client,
      coordinator: coordinator,
      session: controller,
    );
  }

  final transport = _OwnerTransport();
  late final SignInController controller;
  late final MarketplaceRepository repository;

  Future<void> signIn(WidgetTester tester) async {
    initialize();
    final signIn = controller.beginSignIn(
      'synthetic@example.invalid',
      'SyntheticPassword123',
    );
    await tester.pump();
    expect((await signIn.result).verified, true);
  }

  void dispose() {
    if (initialized) controller.dispose();
  }
}

class _PickerFixture {
  final results = <FutureOr<Object?>>[];
  int calls = 0;

  Future<Object?> handle(MethodCall call) async {
    expect(call.method, 'image');
    calls++;
    expect(
      results,
      isNotEmpty,
      reason: 'Only queued local selections may run.',
    );
    return await results.removeAt(0);
  }
}

List<ApiRequest> _creates(Fixture fixture) => fixture.transport.requests
    .where((r) => r.method == 'POST' && r.uri.path == '/api/properties')
    .toList();

List<ApiRequest> _uploads(Fixture fixture) => fixture.transport.requests
    .where((r) => r.method == 'POST' && r.uri.path == '/api/mobile/upload')
    .toList();

Map<String, dynamic> _body(ApiRequest request) =>
    jsonDecode(request.body!) as Map<String, dynamic>;

Finder _button(String label) => find
    .ancestor(
      of: find.text(label),
      matching: find.byWidgetPredicate((widget) => widget is ButtonStyleButton),
    )
    .first;

VoidCallback _saveCallback(WidgetTester tester) =>
    tester.widget<ButtonStyleButton>(_button('Save')).onPressed!;

Future<void> _reveal(WidgetTester tester, String label) async {
  if (find.text(label).evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      find.text(label),
      160,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(find.text(label));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String label) async {
  await _reveal(tester, label);
  if (label == 'Add photo') {
    // Codec validation runs on the engine's real event loop.
    final choose = tester.widget<ButtonStyleButton>(_button(label)).onPressed!;
    await tester.runAsync(() async {
      await (choose as Future<void> Function())();
    });
  } else {
    await tester.tap(find.text(label));
  }
  await tester.pumpAndSettle();
}

Future<Completer<bool?>> _open(
  WidgetTester tester,
  Fixture fixture, {
  String path = '/api/properties',
  String method = 'POST',
  bool publish = false,
  List<FieldSpec>? fields,
  JsonObject? initial,
}) async {
  await fixture.signIn(tester);
  fixture.transport.requests.clear();
  final navigator = GlobalKey<NavigatorState>();
  final result = Completer<bool?>();
  await tester.pumpWidget(
    MaterialApp(
      navigatorKey: navigator,
      home: const Scaffold(body: Center(child: Text('Listings fixture'))),
    ),
  );
  unawaited(
    navigator.currentState!
        .push<bool>(
          MaterialPageRoute(
            builder: (_) => WorkspaceForm(
              repository: fixture.repository,
              title: 'Create listing fixture',
              path: path,
              method: method,
              fixed: publish ? const {'status': 'PUBLISHED'} : const {},
              fields:
                  fields ??
                  const [FieldSpec('title', 'Property title', required: true)],
              initial: initial ?? const {'title': 'Local listing fixture'},
            ),
          ),
        )
        .then(result.complete),
  );
  await tester.pumpAndSettle();
  return result;
}

void _success(Fixture fixture) {
  fixture.transport.reply = (request) {
    if (request.uri.path == '/api/properties') {
      return json({
        'property': {
          'id': _propertyId,
          'status': _body(request)['status'] ?? 'DRAFT',
        },
      });
    }
    if (request.uri.path == '/api/mobile/upload') {
      return json({
        'url':
            'https://media.example.invalid/photo-${_uploads(fixture).length}.png',
      });
    }
    if (request.uri.path == '/api/properties/$_propertyId/media') {
      return json({
        'property': {
          'id': _propertyId,
          'coverImageUrl': 'https://media.example.invalid/photo-1.png',
          'mediaUrls': List.generate(
            _uploads(fixture).length,
            (index) => 'https://media.example.invalid/photo-${index + 1}.png',
          ),
        },
      });
    }
    if (request.method == 'PATCH' &&
        request.uri.path == '/api/properties/$_propertyId') {
      return json({
        'property': {'id': _propertyId, 'status': 'PUBLISHED'},
      });
    }
    throw StateError('Unexpected fixture endpoint');
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Fixture fixture;
  late _PickerFixture picker;
  void photoTest(String description, WidgetTesterCallback body) {
    testWidgets(description, (tester) async {
      try {
        await body(tester);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
        await tester.pump();
      }
    });
  }

  setUp(() {
    fixture = Fixture();
    picker = _PickerFixture();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, picker.handle);
    _success(fixture);
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, null);
    fixture.dispose();
  });

  for (final role in ['OWNER', 'BROKER']) {
    photoTest('$role Create listing uses its authorized publication policy', (
      tester,
    ) async {
      fixture.transport.role = role;
      await fixture.signIn(tester);
      fixture.transport.reply = (_) => json({
        'source': 'database',
        'module': 'properties',
        'role': role,
        'mode': 'cursor',
        'items': <Object>[],
        'hasMore': false,
        'nextCursor': null,
      });
      await tester.pumpWidget(
        MaterialApp(
          home: WorkspaceRecords(
            repository: fixture.repository,
            module: 'properties',
            title: 'My listings',
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Create'));
      await tester.pumpAndSettle();
      final form = tester.widget<WorkspaceForm>(find.byType(WorkspaceForm));
      expect(form.fixed['status'], role == 'OWNER' ? 'PUBLISHED' : 'DRAFT');
      if (role == 'OWNER') {
        expect(
          find.textContaining('Add at least 4 different property photos.'),
          findsOneWidget,
        );
      }
      await _reveal(tester, role == 'OWNER' ? 'Publish listing' : 'Save');
      if (role == 'OWNER') {
        expect(find.text('Save'), findsNothing);
      } else {
        expect(find.text('Publish listing'), findsNothing);
      }
      expect(_creates(fixture), isEmpty);
    });
  }

  for (final intent in ['BUY', 'RENT']) {
    photoTest('$intent selections reach the created property after scrolling', (
      tester,
    ) async {
      final result = await _open(
        tester,
        fixture,
        publish: true,
        fields: const [
          FieldSpec('title', 'Property title', required: true),
          FieldSpec(
            'intent',
            'Purpose',
            options: ['BUY', 'RENT'],
            required: true,
          ),
          FieldSpec(
            'category',
            'Category',
            options: ['RESIDENTIAL', 'COMMERCIAL'],
            required: true,
          ),
          FieldSpec(
            'currency',
            'Currency',
            options: ['INR', 'AED'],
            required: true,
          ),
          FieldSpec('description', 'Description', lines: 6),
          FieldSpec('city', 'City'),
          FieldSpec('locality', 'Locality'),
          FieldSpec('country', 'Country'),
          FieldSpec('state', 'State / region'),
          FieldSpec('address', 'Address'),
          FieldSpec('bedrooms', 'Bedrooms', number: true),
          FieldSpec('bathrooms', 'Bathrooms', number: true),
          FieldSpec('areaValue', 'Area', number: true),
          FieldSpec('areaUnit', 'Area unit'),
        ],
      );
      picker.results.addAll(List.generate(4, _picked));
      for (var index = 0; index < 4; index++) {
        await _tap(tester, 'Add photo');
      }
      for (final selection in [
        ('Purpose', intent),
        ('Category', 'RESIDENTIAL'),
        ('Currency', 'INR'),
      ]) {
        final dropdown = find.byWidgetPredicate(
          (widget) =>
              widget is DropdownButtonFormField<String> &&
              widget.decoration.labelText == selection.$1,
        );
        await _reveal(tester, selection.$1);
        await tester.tap(dropdown);
        await tester.pumpAndSettle();
        await tester.tap(find.text(selection.$2).last);
        await tester.pumpAndSettle();
      }
      await _tap(tester, 'Publish listing');
      expect(_creates(fixture), hasLength(1));
      expect(_body(_creates(fixture).single), containsPair('intent', intent));
      expect(
        _body(_creates(fixture).single),
        containsPair('category', 'RESIDENTIAL'),
      );
      expect(_body(_creates(fixture).single), containsPair('currency', 'INR'));
      expect(
        _body(_creates(fixture).single),
        containsPair('title', 'Local listing fixture'),
      );
      expect(_body(_creates(fixture).single), containsPair('status', 'DRAFT'));
      expect(_uploads(fixture), hasLength(4));
      expect(await result.future, true);
      expect(find.text('Listing published with 4 photos.'), findsOneWidget);
    });
  }

  photoTest(
    'unconfigured uploads preserve the form without creating an empty draft',
    (tester) async {
      final result = await _open(tester, fixture, publish: true);
      picker.results.addAll(List.generate(4, _picked));
      for (var index = 0; index < 4; index++) {
        await _tap(tester, 'Add photo');
      }
      fixture.transport.photoReadinessReply = (_) =>
          json({'propertyPhotoUploadConfigured': false});
      await _tap(tester, 'Publish listing');
      expect(_creates(fixture), isEmpty);
      expect(_uploads(fixture), isEmpty);
      expect(
        find.textContaining('Photo uploads are unavailable.'),
        findsOneWidget,
      );
      expect(find.textContaining('No listing was created.'), findsOneWidget);
      expect(result.isCompleted, false);
      expect(
        tester.widget<ButtonStyleButton>(_button('Publish listing')).onPressed,
        isNotNull,
      );
      await _reveal(tester, 'Property title');
      expect(
        tester
            .widget<TextFormField>(find.byType(TextFormField).first)
            .controller!
            .text,
        'Local listing fixture',
      );
      await _reveal(tester, 'Property photos');
      expect(
        tester
            .widget<ListingPhotoPicker>(find.byType(ListingPhotoPicker))
            .photos,
        hasLength(4),
      );
      // A user retry after a successful readiness check creates exactly once.
      fixture.transport.photoReadinessReply = null;
      await _tap(tester, 'Publish listing');
      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), hasLength(4));
      expect(await result.future, true);
    },
  );

  for (final readiness in [null, 'true']) {
    photoTest('unknown upload readiness $readiness cannot create a draft', (
      tester,
    ) async {
      await _open(tester, fixture, publish: true);
      picker.results.addAll(List.generate(4, _picked));
      for (var index = 0; index < 4; index++) {
        await _tap(tester, 'Add photo');
      }
      fixture.transport.photoReadinessReply = (_) => json({
        if (readiness != null) 'propertyPhotoUploadConfigured': readiness,
      });
      await _tap(tester, 'Publish listing');
      expect(_creates(fixture), isEmpty);
      expect(_uploads(fixture), isEmpty);
      expect(
        find.textContaining('availability could not be confirmed'),
        findsOneWidget,
      );
      expect(find.textContaining('No listing was created.'), findsOneWidget);
    });
  }

  photoTest('readiness timeout keeps a safe retry without any mutation', (
    tester,
  ) async {
    await _open(tester, fixture, publish: true);
    picker.results.addAll(List.generate(4, _picked));
    for (var index = 0; index < 4; index++) {
      await _tap(tester, 'Add photo');
    }
    fixture.transport.photoReadinessReply = (_) =>
        throw TimeoutException('Fixture only');
    await _tap(tester, 'Publish listing');
    expect(_creates(fixture), isEmpty);
    expect(_uploads(fixture), isEmpty);
    expect(find.textContaining('No listing was created.'), findsOneWidget);
    expect(find.textContaining('Some photos may already'), findsNothing);
    expect(
      tester.widget<ButtonStyleButton>(_button('Publish listing')).onPressed,
      isNotNull,
    );
  });

  photoTest('negative readiness acknowledgment cannot create a draft', (
    tester,
  ) async {
    await _open(tester, fixture, publish: true);
    picker.results.addAll(List.generate(4, _picked));
    for (var index = 0; index < 4; index++) {
      await _tap(tester, 'Add photo');
    }
    fixture.transport.photoReadinessReply = (_) => json({
      'propertyPhotoUploadConfigured': true,
      'success': false,
    });
    await _tap(tester, 'Publish listing');
    expect(_creates(fixture), isEmpty);
    expect(_uploads(fixture), isEmpty);
    expect(find.textContaining('No listing was created.'), findsOneWidget);
  });

  for (final failure in [
    (
      503,
      'PROPERTY_PHOTO_STORAGE_UNAVAILABLE',
      'Photo uploads are unavailable.',
    ),
    (502, 'PROPERTY_PHOTO_UPLOAD_FAILED', 'could not complete the upload'),
    (
      502,
      'PROPERTY_PHOTO_CONFIRMATION_UNAVAILABLE',
      'response could not be confirmed',
    ),
    (
      503,
      'UNTRUSTED_PRIVATE_CODE',
      'server could not confirm the photo upload',
    ),
  ]) {
    photoTest(
      'first upload ${failure.$2} explains the failure without replay',
      (tester) async {
        await _open(tester, fixture, publish: true);
        picker.results.addAll(List.generate(4, _picked));
        for (var index = 0; index < 4; index++) {
          await _tap(tester, 'Add photo');
        }
        final success = fixture.transport.reply!;
        fixture.transport.reply = (request) =>
            request.uri.path == '/api/mobile/upload'
            ? json({
                'code': failure.$2,
                'error': 'PRIVATE_UPSTREAM_DETAILS',
              }, failure.$1)
            : success(request);
        await _tap(tester, 'Publish listing');
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), hasLength(1));
        expect(find.textContaining('0 of 4 photos confirmed'), findsOneWidget);
        expect(find.textContaining(failure.$3), findsOneWidget);
        expect(find.textContaining('PRIVATE_UPSTREAM_DETAILS'), findsNothing);
        expect(find.textContaining('UNTRUSTED_PRIVATE_CODE'), findsNothing);
        expect(
          fixture.transport.requests.where((r) => r.method == 'PATCH'),
          isEmpty,
        );
        expect(
          tester
              .widget<ButtonStyleButton>(_button('Publish listing'))
              .onPressed,
          isNull,
        );
      },
    );
  }

  photoTest(
    'Owner creates privately and confirms four photos before publishing',
    (tester) async {
      final result = await _open(tester, fixture, publish: true);
      picker.results.addAll(List.generate(4, _picked));
      for (var index = 0; index < 4; index++) {
        await _tap(tester, 'Add photo');
      }
      await _tap(tester, 'Publish listing');
      expect(_body(_creates(fixture).single), {
        'title': 'Local listing fixture',
        'status': 'DRAFT',
      });
      expect(
        fixture.transport.requests.map((r) => '${r.method} ${r.uri.path}'),
        [
          'GET /api/mobile/capabilities',
          'POST /api/properties',
          'GET /api/auth/session',
          'POST /api/mobile/upload',
          'POST /api/mobile/upload',
          'POST /api/mobile/upload',
          'POST /api/mobile/upload',
          'GET /api/properties/$_propertyId/media',
          'PATCH /api/properties/$_propertyId',
        ],
      );
      expect(
        _uploads(fixture).map(_body),
        List.generate(
          4,
          (index) => {
            'propertyId': _propertyId,
            'base64': _picked(index)['base64'],
          },
        ),
      );
      expect(_body(fixture.transport.requests.last), {'status': 'PUBLISHED'});
      expect(await result.future, true);
      expect(find.text('Listing published with 4 photos.'), findsOneWidget);
    },
  );

  for (final count in [0, 3]) {
    photoTest('Owner cannot publish with $count selected photos', (
      tester,
    ) async {
      final result = await _open(tester, fixture, publish: true);
      picker.results.addAll(List.generate(count, _picked));
      for (var index = 0; index < count; index++) {
        await _tap(tester, 'Add photo');
      }
      await _tap(tester, 'Publish listing');
      expect(_creates(fixture), isEmpty);
      expect(_uploads(fixture), isEmpty);
      expect(result.isCompleted, false);
      expect(
        find.text(
          'Add at least 4 different property photos before publishing.',
        ),
        findsOneWidget,
      );
    });
  }

  for (final returnedStatus in [null, 'PUBLISHED']) {
    photoTest(
      'unconfirmed private draft $returnedStatus never starts photo uploads',
      (tester) async {
        final result = await _open(tester, fixture, publish: true);
        picker.results.addAll(List.generate(4, _picked));
        for (var index = 0; index < 4; index++) {
          await _tap(tester, 'Add photo');
        }
        fixture.transport.reply = (_) => json({
          'property': {
            'id': _propertyId,
            if (returnedStatus != null) 'status': returnedStatus,
          },
        });
        await _tap(tester, 'Publish listing');
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), isEmpty);
        expect(
          find.textContaining('publication could not be confirmed'),
          findsOneWidget,
        );
        expect(find.textContaining('Buyers can now see it'), findsNothing);
        expect(
          tester
              .widget<ButtonStyleButton>(_button('Publish listing'))
              .onPressed,
          isNull,
        );
        expect(result.isCompleted, false);
      },
    );
  }

  photoTest(
    'photo failure leaves one private draft and never starts publication',
    (tester) async {
      final result = await _open(tester, fixture, publish: true);
      picker.results.addAll(List.generate(4, _picked));
      for (var index = 0; index < 4; index++) {
        await _tap(tester, 'Add photo');
      }
      final success = fixture.transport.reply!;
      fixture.transport.reply = (request) =>
          request.uri.path == '/api/mobile/upload' &&
              _uploads(fixture).length == 2
          ? json({}, 503)
          : success(request);
      await _tap(tester, 'Publish listing');
      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), hasLength(2));
      expect(
        find.textContaining('Draft saved. It has not been published.'),
        findsOneWidget,
      );
      expect(find.textContaining('1 of 4 photos confirmed'), findsOneWidget);
      expect(
        fixture.transport.requests.where(
          (request) => request.method == 'PATCH',
        ),
        isEmpty,
      );
      expect(
        tester.widget<ButtonStyleButton>(_button('Publish listing')).onPressed,
        isNull,
      );
      expect(result.isCompleted, false);
    },
  );

  photoTest('fourth upload must finish before stored gallery and publication', (
    tester,
  ) async {
    final result = await _open(tester, fixture, publish: true);
    picker.results.addAll(List.generate(4, _picked));
    for (var index = 0; index < 4; index++) {
      await _tap(tester, 'Add photo');
    }
    final fourth = Completer<ApiResponse>();
    final success = fixture.transport.reply!;
    fixture.transport.reply = (request) =>
        request.uri.path == '/api/mobile/upload' &&
            _uploads(fixture).length == 4
        ? fourth.future
        : success(request);
    await _reveal(tester, 'Publish listing');
    final publish = tester
        .widget<ButtonStyleButton>(_button('Publish listing'))
        .onPressed!;
    publish();
    await tester.pump();
    expect(_creates(fixture), hasLength(1));
    expect(_uploads(fixture), hasLength(4));
    expect(
      fixture.transport.requests.where(
        (request) => request.uri.path.endsWith('/media'),
      ),
      isEmpty,
    );
    expect(
      fixture.transport.requests.where((request) => request.method == 'PATCH'),
      isEmpty,
    );
    publish();
    await tester.pump();
    expect(_creates(fixture), hasLength(1));
    fourth.complete(json({'url': 'https://media.example.invalid/photo-4.png'}));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where((request) => request.method == 'PATCH'),
      hasLength(1),
    );
    expect(await result.future, true);
  });

  photoTest(
    'duplicate stored gallery URLs cannot satisfy the four-photo requirement',
    (tester) async {
      final result = await _open(tester, fixture, publish: true);
      picker.results.addAll(List.generate(4, _picked));
      for (var index = 0; index < 4; index++) {
        await _tap(tester, 'Add photo');
      }
      final success = fixture.transport.reply!;
      fixture.transport.reply = (request) => request.uri.path.endsWith('/media')
          ? json({
              'property': {
                'id': _propertyId,
                'coverImageUrl': 'https://media.example.invalid/same.png',
                'mediaUrls': List.filled(
                  4,
                  'https://media.example.invalid/same.png',
                ),
              },
            })
          : success(request);
      await _tap(tester, 'Publish listing');
      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), hasLength(4));
      expect(
        fixture.transport.requests.where(
          (request) => request.method == 'PATCH',
        ),
        isEmpty,
      );
      expect(
        find.textContaining('Draft saved. It has not been published.'),
        findsOneWidget,
      );
      expect(result.isCompleted, false);
    },
  );

  for (final failure in ['timeout', 'wrong id', 'wrong status']) {
    photoTest('uncertain publication $failure never repeats listing creation', (
      tester,
    ) async {
      final result = await _open(tester, fixture, publish: true);
      picker.results.addAll(List.generate(4, _picked));
      for (var index = 0; index < 4; index++) {
        await _tap(tester, 'Add photo');
      }
      final success = fixture.transport.reply!;
      fixture.transport.reply = (request) {
        if (request.method == 'PATCH') {
          if (failure == 'timeout') throw TimeoutException('Local fixture');
          return json({
            'property': {
              'id': failure == 'wrong id' ? 'property-other' : _propertyId,
              'status': failure == 'wrong status' ? 'DRAFT' : 'PUBLISHED',
            },
          });
        }
        return success(request);
      };
      await _reveal(tester, 'Publish listing');
      final publish = tester
          .widget<ButtonStyleButton>(_button('Publish listing'))
          .onPressed!;
      publish();
      await tester.pumpAndSettle();
      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), hasLength(4));
      expect(
        fixture.transport.requests.where(
          (request) => request.method == 'PATCH',
        ),
        hasLength(1),
      );
      expect(
        find.textContaining('publication could not be confirmed'),
        findsOneWidget,
      );
      expect(find.textContaining('It has not been published'), findsNothing);
      expect(result.isCompleted, false);
      publish();
      await tester.pumpAndSettle();
      expect(_creates(fixture), hasLength(1));
      expect(
        fixture.transport.requests.where(
          (request) => request.method == 'PATCH',
        ),
        hasLength(1),
      );
    });
  }

  for (final stage in ['gallery confirmation', 'publication']) {
    photoTest(
      'session change during $stage cannot confirm or repeat publication',
      (tester) async {
        final result = await _open(tester, fixture, publish: true);
        picker.results.addAll(List.generate(4, _picked));
        for (var index = 0; index < 4; index++) {
          await _tap(tester, 'Add photo');
        }
        final pending = Completer<ApiResponse>();
        final success = fixture.transport.reply!;
        fixture.transport.reply = (request) {
          final pause = stage == 'gallery confirmation'
              ? request.uri.path.endsWith('/media')
              : request.method == 'PATCH';
          return pause ? pending.future : success(request);
        };
        await _reveal(tester, 'Publish listing');
        final publish = tester
            .widget<ButtonStyleButton>(_button('Publish listing'))
            .onPressed!;
        publish();
        await tester.pump();
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), hasLength(4));
        fixture.controller.clearLocalSession();
        pending.complete(
          json({
            'property': {
              'id': _propertyId,
              'status': 'PUBLISHED',
              'coverImageUrl': null,
              'mediaUrls': List.generate(
                4,
                (index) => 'https://media.example.invalid/photo-$index.png',
              ),
            },
          }),
        );
        await tester.pumpAndSettle();
        expect(result.isCompleted, false);
        expect(find.text('Listing published with 4 photos.'), findsNothing);
        expect(
          fixture.transport.requests.where(
            (request) => request.method == 'PATCH',
          ),
          hasLength(stage == 'publication' ? 1 : 0),
        );
        publish();
        await tester.pumpAndSettle();
        expect(_creates(fixture), hasLength(1));
        expect(
          fixture.transport.requests.where(
            (request) => request.method == 'PATCH',
          ),
          hasLength(stage == 'publication' ? 1 : 0),
        );
      },
    );
  }

  test('public visibility does not claim independent verification', () {
    expect(
      recordSummary({
        'status': 'PUBLISHED',
        'verificationStatus': 'PENDING',
        'city': 'Kochi',
      }, property: true),
      'PUBLISHED · Not independently verified · Kochi',
    );
    expect(
      recordSummary({
        'status': 'DRAFT',
        'verificationStatus': 'PENDING',
      }, property: true),
      'DRAFT · PENDING',
    );
    expect(
      recordSummary({
        'status': 'PUBLISHED',
        'verificationStatus': 'UNDER_REVIEW',
      }, property: true),
      'PUBLISHED · Not independently verified',
    );
    expect(
      recordSummary({
        'status': 'PUBLISHED',
        'verificationStatus': 'VERIFIED',
      }, property: true),
      'PUBLISHED · VERIFIED',
    );
  });

  for (final state in [
    ('OWNER', 'DRAFT', 'PENDING', true),
    ('OWNER', 'PENDING_REVIEW', 'UNDER_REVIEW', true),
    ('OWNER', 'REJECTED', 'REJECTED', false),
    ('OWNER', 'ARCHIVED', 'VERIFIED', false),
    ('OWNER', 'DRAFT', 'NEEDS_CHANGES', false),
    ('OWNER', 'DRAFT', 'EXPIRED', false),
    ('BROKER', 'DRAFT', 'PENDING', false),
    ('BROKER', 'DRAFT', 'VERIFIED', true),
  ]) {
    photoTest('listing publication action respects $state', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1600));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      fixture.transport.role = state.$1;
      await fixture.signIn(tester);
      fixture.transport.reply = (_) => json({}, 404);
      await tester.pumpWidget(
        MaterialApp(
          home: WorkspaceDetail(
            repository: fixture.repository,
            module: 'properties',
            item: {
              'id': _propertyId,
              'title': 'Local listing fixture',
              'status': state.$2,
              'verificationStatus': state.$3,
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(state.$1 == 'OWNER' ? 'Publish listing' : 'PUBLISHED'),
        state.$4 ? findsOneWidget : findsNothing,
      );
      expect(
        find.text('PENDING REVIEW'),
        state.$1 == 'OWNER' ? findsNothing : findsOneWidget,
      );
      expect(_creates(fixture), isEmpty);
    });
  }

  for (final confirmed in [true, false]) {
    photoTest(
      'manual Owner publication requires status confirmation: $confirmed',
      (tester) async {
        await fixture.signIn(tester);
        fixture.transport.reply = (request) => request.method == 'PATCH'
            ? json({
                'property': {
                  'id': _propertyId,
                  'status': confirmed ? 'PUBLISHED' : 'DRAFT',
                },
              })
            : json({}, 404);
        final navigator = GlobalKey<NavigatorState>();
        await tester.pumpWidget(
          MaterialApp(
            navigatorKey: navigator,
            home: const Scaffold(body: Text('Listings fixture')),
          ),
        );
        unawaited(
          navigator.currentState!.push<void>(
            MaterialPageRoute(
              builder: (_) => WorkspaceDetail(
                repository: fixture.repository,
                module: 'properties',
                item: const {
                  'id': _propertyId,
                  'title': 'Local listing fixture',
                  'status': 'DRAFT',
                  'verificationStatus': 'PENDING',
                },
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await _tap(tester, 'Publish listing');
        expect(
          find.text('This makes your listing visible to Buyers. Publish now?'),
          findsOneWidget,
        );
        await tester.tap(find.text('Continue'));
        await tester.pumpAndSettle();
        final patches = fixture.transport.requests.where(
          (request) =>
              request.method == 'PATCH' &&
              request.uri.path == '/api/properties/$_propertyId',
        );
        expect(patches, hasLength(1));
        expect(_body(patches.single), {'status': 'PUBLISHED'});
        expect(
          find.text('Listing published. Buyers can now see it.'),
          confirmed ? findsOneWidget : findsNothing,
        );
        expect(
          find.byType(WorkspaceDetail),
          confirmed ? findsNothing : findsOneWidget,
        );
        expect(_creates(fixture), isEmpty);
      },
    );
  }

  photoTest(
    'existing draft publication rejection explains the four-photo requirement',
    (tester) async {
      await fixture.signIn(tester);
      fixture.transport.reply = (request) =>
          json({}, request.method == 'PATCH' ? 400 : 404);
      await tester.pumpWidget(
        MaterialApp(
          home: WorkspaceDetail(
            repository: fixture.repository,
            module: 'properties',
            item: const {
              'id': _propertyId,
              'title': 'Local listing fixture',
              'status': 'DRAFT',
              'verificationStatus': 'PENDING',
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, 'Publish listing');
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining(
          'Publishing requires at least 4 different property photos.',
        ),
        findsOneWidget,
      );
      expect(_creates(fixture), isEmpty);
      expect(find.byType(WorkspaceDetail), findsOneWidget);
    },
  );

  test('selected photo preserves raw canonical PNG bytes', () {
    final photo = SelectedListingPhoto.fromPicker(_picked());
    expect(photo.bytes, orderedEquals(base64Decode(_pngs.first)));
    expect(base64Encode(photo.bytes), _pngs.first);
    expect(SelectedListingPhoto.maxBytes, 6 * 1024 * 1024);
    expect(ListingPhotoPicker.maxPhotos, 10);
    expect(ListingPhotoPicker.maxTotalBytes, 24 * 1024 * 1024);
  });

  test(
    'selected photo rejects empty, malformed, unsupported and oversized data',
    () {
      final oversized = Uint8List(SelectedListingPhoto.maxBytes + 1)
        ..setRange(
          0,
          base64Decode(_pngs.first).length,
          base64Decode(_pngs.first),
        );
      for (final value in <Map<String, dynamic>>[
        {},
        {'base64': null},
        {'base64': ''},
        {'base64': 'not base64!'},
        {'base64': 'data:image/png;base64,${_pngs.first}'},
        {'base64': base64Encode(utf8.encode('GIF89a local fixture'))},
        {'base64': base64Encode(utf8.encode('%PDF-1.7 local fixture'))},
        {'base64': base64Encode(oversized)},
      ]) {
        expect(
          () => SelectedListingPhoto.fromPicker(value),
          throwsFormatException,
        );
      }
    },
  );

  photoTest('selection, cancellation and removal stay local before Save', (
    tester,
  ) async {
    final result = await _open(tester, fixture);
    picker.results.addAll([_picked(), null]);
    expect(find.byType(ListingPhotoPicker), findsOneWidget);

    await _tap(tester, 'Add photo');
    expect(find.byTooltip('Remove photo 1'), findsOneWidget);
    final preview = tester.widget<Image>(find.byType(Image)).image;
    expect(preview, isA<ResizeImage>());
    expect((preview as ResizeImage).imageProvider, isA<MemoryImage>());
    expect(fixture.transport.requests, isEmpty);

    await _tap(tester, 'Add photo');
    expect(find.byTooltip('Remove photo 1'), findsOneWidget);
    expect(fixture.transport.requests, isEmpty);

    await tester.tap(find.byTooltip('Remove photo 1'));
    await tester.pumpAndSettle();
    expect(find.byType(Image), findsNothing);
    expect(fixture.transport.requests, isEmpty);
    expect(picker.calls, 2);

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(result.isCompleted, true);
    expect(await result.future, isNull);
    expect(_creates(fixture), isEmpty);
    expect(_uploads(fixture), isEmpty);
  });

  photoTest('Save stays disabled while image selection is pending', (
    tester,
  ) async {
    await _open(tester, fixture);
    final pending = Completer<Object?>();
    picker.results.add(pending.future);
    late Future<void> choosing;
    await tester.runAsync(() async {
      final choose = tester
          .widget<ButtonStyleButton>(_button('Add photo'))
          .onPressed!;
      choosing = (choose as Future<void> Function())();
    });
    await tester.pump();

    expect(tester.widget<ButtonStyleButton>(_button('Save')).onPressed, isNull);
    expect(
      tester.widget<ButtonStyleButton>(_button('Opening photos...')).onPressed,
      isNull,
    );
    expect(fixture.transport.requests, isEmpty);

    await tester.runAsync(() async {
      pending.complete(_picked());
      await choosing;
    });
    await tester.pumpAndSettle();
    expect(find.byTooltip('Remove photo 1'), findsOneWidget);
    expect(
      tester.widget<ButtonStyleButton>(_button('Save')).onPressed,
      isNotNull,
    );
    expect(fixture.transport.requests, isEmpty);
  });

  photoTest('unsupported and corrupt local files never become previews', (
    tester,
  ) async {
    await _open(tester, fixture);
    picker.results.addAll([
      {'base64': base64Encode(utf8.encode('GIF89a unsupported fixture'))},
      {
        'base64': base64Encode([137, 80, 78, 71, 13, 10, 26, 10, 0]),
      },
      _picked(),
    ]);
    await _tap(tester, 'Add photo');
    expect(find.byType(Image), findsNothing);
    await _tap(tester, 'Add photo');
    expect(find.byType(Image), findsNothing);
    await _tap(tester, 'Add photo');
    expect(find.byTooltip('Remove photo 1'), findsOneWidget);
    expect(fixture.transport.requests, isEmpty);
    expect(tester.takeException(), isNull);
  });

  photoTest('selection is capped at ten photos without any API call', (
    tester,
  ) async {
    await _open(tester, fixture);
    picker.results.addAll(List.generate(11, _picked));
    for (var index = 0; index < 10; index++) {
      await _tap(tester, 'Add photo');
    }
    expect(
      tester.widget<ListingPhotoPicker>(find.byType(ListingPhotoPicker)).photos,
      hasLength(10),
    );
    expect(find.text('10/10'), findsOneWidget);
    expect(find.byTooltip('Remove photo 11'), findsNothing);
    expect(
      tester.widget<ButtonStyleButton>(_button('Add photo')).onPressed,
      isNull,
    );
    expect(picker.calls, 10);
    expect(fixture.transport.requests, isEmpty);
  });

  photoTest('selection rejects a photo that exceeds the 24 MiB total', (
    tester,
  ) async {
    await _open(tester, fixture);
    final png = base64Decode(_pngs.first);
    for (var index = 0; index < 4; index++) {
      final padded = Uint8List(SelectedListingPhoto.maxBytes)
        ..setRange(0, png.length, png);
      padded[padded.length - 1] = index + 1;
      picker.results.add({'base64': base64Encode(padded)});
    }
    picker.results.add(_picked(1));
    for (var index = 0; index < 4; index++) {
      await _tap(tester, 'Add photo');
    }
    expect(
      tester.widget<ListingPhotoPicker>(find.byType(ListingPhotoPicker)).photos,
      hasLength(4),
    );
    await _tap(tester, 'Add photo');
    expect(find.byTooltip('Remove photo 5'), findsNothing);
    expect(fixture.transport.requests, isEmpty);
    expect(tester.takeException(), isNull);
  });

  photoTest('Save creates once then uploads selected photos in order', (
    tester,
  ) async {
    final result = await _open(tester, fixture);
    picker.results.addAll([_picked(), _picked(1)]);
    await _tap(tester, 'Add photo');
    await _tap(tester, 'Add photo');
    expect(fixture.transport.requests, isEmpty);

    await _tap(tester, 'Save');
    expect(fixture.transport.requests.map((r) => '${r.method} ${r.uri.path}'), [
      'GET /api/mobile/capabilities',
      'POST /api/properties',
      'GET /api/auth/session',
      'POST /api/mobile/upload',
      'POST /api/mobile/upload',
    ]);
    expect(_body(_creates(fixture).single), {'title': 'Local listing fixture'});
    expect(_uploads(fixture).map(_body), [
      {'propertyId': _propertyId, 'base64': _pngs[0]},
      {'propertyId': _propertyId, 'base64': _pngs[1]},
    ]);
    expect(await result.future, true);
    expect(find.text('Listings fixture'), findsOneWidget);
    expect(find.text('Listing created with 2 photos.'), findsOneWidget);
  });

  photoTest('each upload waits for the previous server acknowledgment', (
    tester,
  ) async {
    final result = await _open(tester, fixture);
    picker.results.addAll([_picked(), _picked(1)]);
    await _tap(tester, 'Add photo');
    await _tap(tester, 'Add photo');
    final first = Completer<ApiResponse>();
    fixture.transport.reply = (request) {
      if (request.uri.path == '/api/properties') {
        return json({
          'property': {'id': _propertyId},
        });
      }
      return _uploads(fixture).length == 1
          ? first.future
          : json({'url': 'https://media.example.invalid/second.png'});
    };
    final save = _saveCallback(tester);
    save();
    await tester.pump();
    expect(_uploads(fixture), hasLength(1));
    expect(_body(_uploads(fixture).single)['base64'], _pngs.first);
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    save();
    await tester.pump();
    expect(_creates(fixture), hasLength(1));
    expect(_uploads(fixture), hasLength(1));

    first.complete(json({'url': 'https://media.example.invalid/first.png'}));
    await tester.pumpAndSettle();
    expect(_uploads(fixture), hasLength(2));
    expect(_body(_uploads(fixture).last)['base64'], _pngs[1]);
    expect(await result.future, true);
  });

  photoTest('a listing without photos follows the confirmed create path', (
    tester,
  ) async {
    final result = await _open(tester, fixture);
    await _tap(tester, 'Save');
    expect(_creates(fixture), hasLength(1));
    expect(_uploads(fixture), isEmpty);
    expect(await result.future, true);
    expect(find.text('Listing created.'), findsOneWidget);
    expect(picker.calls, 0);
  });

  photoTest('rapid Save callbacks cannot create duplicate listings', (
    tester,
  ) async {
    final result = await _open(tester, fixture);
    final pending = Completer<ApiResponse>();
    fixture.transport.reply = (request) => request.uri.path == '/api/properties'
        ? pending.future
        : json({'url': 'https://media.example.invalid/photo.png'});
    final save = _saveCallback(tester);
    save();
    save();
    await tester.pump();
    expect(_creates(fixture), hasLength(1));
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );

    pending.complete(
      json({
        'property': {'id': _propertyId},
      }),
    );
    await tester.pumpAndSettle();
    expect(await result.future, true);
    expect(_creates(fixture), hasLength(1));
  });

  for (final failure in [
    'timeout',
    'server',
    'missing id',
    'invalid id',
    'negative acknowledgment',
  ]) {
    photoTest(
      'unknown create outcome ($failure) locks Save and never uploads',
      (tester) async {
        final result = await _open(tester, fixture);
        picker.results.add(_picked());
        await _tap(tester, 'Add photo');
        fixture.transport.reply = (_) {
          if (failure == 'timeout') throw TimeoutException('Local fixture');
          if (failure == 'server') return json({}, 503);
          if (failure == 'missing id') return json({'ok': true});
          if (failure == 'negative acknowledgment') {
            return json({
              'ok': false,
              'property': {'id': _propertyId},
            });
          }
          return json({
            'property': {'id': '../invalid'},
          });
        };
        final save = _saveCallback(tester);
        save();
        await tester.pumpAndSettle();
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), isEmpty);
        await _reveal(tester, 'Back to listings');
        expect(find.text('Back to listings'), findsOneWidget);
        expect(
          tester.widget<ButtonStyleButton>(_button('Save')).onPressed,
          isNull,
        );

        save();
        await tester.pumpAndSettle();
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), isEmpty);
        await _tap(tester, 'Back to listings');
        expect(result.isCompleted, true);
        expect(find.text('Listings fixture'), findsOneWidget);
      },
    );
  }

  for (final status in [400, 403, 429]) {
    photoTest(
      'known precreate $status rejection can be corrected and submitted',
      (tester) async {
        final result = await _open(tester, fixture);
        picker.results.add(_picked());
        await _tap(tester, 'Add photo');
        fixture.transport.reply = (_) => json({}, status);
        await _tap(tester, 'Save');
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), isEmpty);
        expect(
          tester.widget<ButtonStyleButton>(_button('Save')).onPressed,
          isNotNull,
        );

        _success(fixture);
        await _tap(tester, 'Save');
        expect(_creates(fixture), hasLength(2));
        expect(_uploads(fixture), hasLength(1));
        expect(await result.future, true);
      },
    );
  }

  for (final failure in [
    'server rejection',
    'invalid upload acknowledgment',
    'negative acknowledgment',
  ]) {
    photoTest(
      'second upload $failure stops the batch and keeps one created listing',
      (tester) async {
        final result = await _open(tester, fixture);
        picker.results.addAll([_picked(), _picked(1), _picked(2)]);
        for (var index = 0; index < 3; index++) {
          await _tap(tester, 'Add photo');
        }
        fixture.transport.reply = (request) {
          if (request.uri.path == '/api/properties') {
            return json({
              'property': {'id': _propertyId},
            });
          }
          if (_uploads(fixture).length == 1) {
            return json({'url': 'https://media.example.invalid/confirmed.png'});
          }
          if (failure == 'negative acknowledgment') {
            return json({
              'ok': false,
              'url': 'https://media.example.invalid/unconfirmed.png',
            });
          }
          return failure == 'server rejection'
              ? json({}, 503)
              : json({'url': 'http://media.example.invalid/unconfirmed.png'});
        };
        final save = _saveCallback(tester);
        save();
        await tester.pumpAndSettle();
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), hasLength(2));
        expect(_uploads(fixture).map((r) => _body(r)['propertyId']), [
          _propertyId,
          _propertyId,
        ]);
        expect(find.textContaining('Listing created, but'), findsOneWidget);
        expect(find.textContaining('1 of 3 photos confirmed'), findsOneWidget);
        expect(find.text('Back to listings'), findsOneWidget);
        expect(result.isCompleted, false);

        save();
        await tester.pumpAndSettle();
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), hasLength(2));
        await _tap(tester, 'Back to listings');
        expect(result.isCompleted, true);
      },
    );
  }

  for (final stage in ['create', 'upload']) {
    for (final change in ['sign out', 'switch account']) {
      photoTest('$change during $stage prevents all remaining photo uploads', (
        tester,
      ) async {
        await _open(tester, fixture);
        picker.results.addAll([_picked(), _picked(1)]);
        await _tap(tester, 'Add photo');
        await _tap(tester, 'Add photo');
        final pending = Completer<ApiResponse>();
        fixture.transport.reply = (request) {
          if (request.uri.path == '/api/properties') {
            return stage == 'create'
                ? pending.future
                : json({
                    'property': {'id': _propertyId},
                  });
          }
          return pending.future;
        };
        _saveCallback(tester)();
        await tester.pump();
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), hasLength(stage == 'create' ? 0 : 1));

        fixture.controller.clearLocalSession();
        SignInOperation? switching;
        if (change == 'switch account') {
          fixture.transport.identity = 'user-0002';
          switching = fixture.controller.beginSignIn(
            'synthetic@example.invalid',
            'SyntheticPassword123',
          );
        }
        pending.complete(
          stage == 'create'
              ? json({
                  'property': {'id': _propertyId},
                })
              : json({'url': 'https://media.example.invalid/late.png'}),
        );
        await tester.pumpAndSettle();
        if (switching != null) {
          expect((await switching.result).verified, true);
          expect(fixture.controller.identity!.id, 'user-0002');
        }
        expect(_creates(fixture), hasLength(1));
        expect(_uploads(fixture), hasLength(stage == 'create' ? 0 : 1));
        expect(find.text('Listings fixture'), findsNothing);
      });
    }
  }

  photoTest(
    'changed account in post-create session verification prevents uploads',
    (tester) async {
      await _open(tester, fixture);
      picker.results.add(_picked());
      await _tap(tester, 'Add photo');
      fixture.transport.identity = 'user-0002';
      await _tap(tester, 'Save');
      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), isEmpty);
      expect(fixture.controller.verified, false);
      expect(find.text('Listings fixture'), findsNothing);
    },
  );

  photoTest('picker result after session invalidation is discarded locally', (
    tester,
  ) async {
    await _open(tester, fixture);
    final pending = Completer<Object?>();
    picker.results.add(pending.future);
    await tester.tap(find.text('Add photo'));
    await tester.pump();
    fixture.controller.clearLocalSession();
    pending.complete(_picked());
    await tester.pumpAndSettle();
    expect(find.byType(Image), findsNothing);
    expect(_creates(fixture), isEmpty);
    expect(_uploads(fixture), isEmpty);
  });

  for (final route in [
    ('/api/enquiries', 'POST'),
    ('/api/properties/$_propertyId', 'PATCH'),
  ]) {
    photoTest('${route.$2} ${route.$1} keeps the existing form save behavior', (
      tester,
    ) async {
      fixture.transport.reply = (_) => json({'ok': true});
      final result = await _open(
        tester,
        fixture,
        path: route.$1,
        method: route.$2,
      );
      expect(find.text('Add Images'), findsNothing);
      expect(find.text('Add photo'), findsNothing);
      expect(find.byType(ListingPhotoPicker), findsNothing);
      await _tap(tester, 'Save');
      expect(fixture.transport.requests, hasLength(1));
      expect(fixture.transport.requests.single.method, route.$2);
      expect(fixture.transport.requests.single.uri.path, route.$1);
      expect(_uploads(fixture), isEmpty);
      expect(picker.calls, 0);
      expect(await result.future, true);
      expect(find.text('Server confirmed the change.'), findsOneWidget);
    });
  }
}
