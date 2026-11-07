import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/workspace/builder_project_images.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'create_listing_photos_test.dart' show Fixture;
import 'marketplace_test.dart' show json;

// In-process API and device-picker fixtures only. No real network or device.
const _channel = MethodChannel('homezone/media-picker');
const _projectId = 'project-form-0001';
const _png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwY2D4DwACHAFG3vnH5QAAAABJRU5ErkJggg==';
const _mediaFields = [
  'mediaUrls',
  'floorPlanUrls',
  'masterPlanUrl',
  'brochureUrl',
];

JsonObject _body(ApiRequest request) => jsonDecode(request.body!) as JsonObject;

List<ApiRequest> _creates(Fixture fixture) => fixture.transport.requests
    .where(
      (request) =>
          request.method == 'POST' &&
          request.uri.path == '/api/builder/projects',
    )
    .toList();

List<ApiRequest> _uploads(Fixture fixture) => fixture.transport.requests
    .where(
      (request) =>
          request.method == 'POST' && request.uri.path == '/api/mobile/upload',
    )
    .toList();

class _Server {
  _Server(this.fixture) {
    fixture.transport.photoReadinessReply = (_) => json({
      'builderProjectImageUploadConfigured': ready,
      'builderProjectImageUploadFields': _mediaFields,
    });
    fixture.transport.reply = respond;
  }

  final Fixture fixture;
  bool ready = true;
  bool uncertainUpload = false;
  final project = <String, dynamic>{
    'id': _projectId,
    'status': 'DRAFT',
    'mediaUrls': <String>[],
    'floorPlanUrls': <String>[],
    'masterPlanUrl': null,
    'brochureUrl': null,
    'updatedAt': '2026-11-06T12:00:00.000Z',
  };

  ApiResponse respond(ApiRequest request) {
    if (request.uri.path == '/api/mobile/summary') {
      return json({
        'source': 'database',
        'metrics': {'MY_PROJECTS': 0, 'UNREAD_NOTIFICATIONS': 0},
      });
    }
    if (request.uri.path == '/api/mobile/workspace') {
      return json({
        'source': 'database',
        'module': request.uri.queryParameters['module'],
        'role': 'BUILDER',
        'mode': 'cursor',
        'items': <Object>[],
        'hasMore': false,
        'nextCursor': null,
      });
    }
    if (request.uri.path == '/api/builder/projects' &&
        request.method == 'POST') {
      final data = _body(request);
      expect(data['status'], 'DRAFT');
      expect(data.keys.any(_mediaFields.contains), false);
      project.addAll(data);
      return json({'project': project});
    }
    if (request.uri.path == '/api/mobile/upload') {
      if (uncertainUpload) throw const ApiException(ApiFailure.network);
      final data = _body(request);
      expect(data['projectId'], _projectId);
      expect(data['base64'], _png);
      final field = data['field'] as String;
      expect(_mediaFields, contains(field));
      final url = 'https://media.example.invalid/$field-image.png';
      if (field == 'mediaUrls' || field == 'floorPlanUrls') {
        project[field] = [...project[field] as List<String>, url];
      } else {
        project[field] = url;
      }
      return json({'url': url, 'project': project});
    }
    if (request.uri.path == '/api/builder/projects/$_projectId') {
      if (request.method == 'PATCH') project.addAll(_body(request));
      return json({'project': project});
    }
    throw StateError('Unexpected in-process Builder form endpoint');
  }
}

Finder _button(String label) => find.ancestor(
  of: find.text(label),
  matching: find.byWidgetPredicate((widget) => widget is ButtonStyleButton),
);

Future<void> _reveal(WidgetTester tester, Finder finder) async {
  if (finder.hitTestable().evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      180,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

Future<void> _openCreate(WidgetTester tester, Fixture fixture) async {
  fixture.initialize();
  fixture.transport.role = 'BUILDER';
  await fixture.signIn(tester);
  fixture.transport.requests.clear();
  await tester.pumpWidget(
    MaterialApp(home: WorkspaceScreen(repository: fixture.repository)),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const ValueKey('workspace-primary-action')));
  await tester.pumpAndSettle();

  final form = tester.widget<WorkspaceForm>(find.byType(WorkspaceForm));
  expect(form.path, '/api/builder/projects');
  expect(form.method, 'POST');
  expect(form.fields.any((field) => _mediaFields.contains(field.key)), false);
  expect(form.fields.map((field) => field.key), isNot(contains('qrCodeUrl')));
  for (final entry in {
    'name': 'Builder device image project',
    'city': 'Kochi',
    'description': 'A synthetic project for local UI validation only.',
  }.entries) {
    final input = find.descendant(
      of: find.byKey(ValueKey(entry.key)),
      matching: find.byType(TextFormField),
    );
    await _reveal(tester, input);
    await tester.enterText(input, entry.value);
  }
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  final status = find.byWidgetPredicate(
    (widget) =>
        widget is DropdownButtonFormField<String> &&
        widget.decoration.labelText == 'Project status',
  );
  await _reveal(tester, status);
  await tester.tap(status);
  await tester.pumpAndSettle();
  await tester.tap(find.text('PUBLISHED').last);
  await tester.pumpAndSettle();
}

Future<void> _chooseProjectImage(WidgetTester tester) async {
  final add = _button('Add project photo');
  await _reveal(tester, add);
  expect(find.text('Project photos'), findsOneWidget);
  expect(find.text('Floor plans'), findsOneWidget);
  expect(find.text('Master plan'), findsOneWidget);
  expect(find.text('Brochure image'), findsOneWidget);
  final choose = tester.widget<ButtonStyleButton>(add).onPressed!;
  // Native image codec completion needs the real event loop; the picker itself
  // remains a mocked method channel and returns only the local one-pixel PNG.
  await tester.runAsync(() async {
    await (choose as Future<void> Function())();
  });
  await tester.pumpAndSettle();
  expect(
    tester
        .widget<BuilderProjectImages>(find.byType(BuilderProjectImages))
        .selections['mediaUrls'],
    hasLength(1),
  );
}

Future<VoidCallback> _saveCallback(WidgetTester tester) async {
  final save = _button('Save');
  await _reveal(tester, save);
  return tester.widget<ButtonStyleButton>(save).onPressed!;
}

Future<void> _reassemble(WidgetTester tester) async {
  // RendererBinding waits for endOfFrame. Advance the test binding's fake
  // clock before awaiting reassembly so its warm-up frame can complete.
  final reassemble = tester.binding.reassembleApplication();
  await tester.pump();
  await tester.pumpAndSettle();
  await reassemble;
  await tester.pumpAndSettle();
}

void main() {
  void formTest(
    String description,
    Future<void> Function(WidgetTester, Fixture, _Server) body,
  ) {
    testWidgets(description, (tester) async {
      final fixture = Fixture();
      final server = _Server(fixture);
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_channel, (call) async {
            expect(call.method, 'image');
            return {'base64': _png};
          });
      try {
        await _openCreate(tester, fixture);
        await body(tester, fixture, server);
      } finally {
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(_channel, null);
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
        await tester.pump();
      }
    });
  }

  formTest(
    'Builder Create project saves device image before confirmed publication',
    (tester, fixture, server) async {
      await _chooseProjectImage(tester);
      await _saveCallback(tester);
      await tester.tap(_button('Save'));
      await tester.pumpAndSettle();

      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), hasLength(1));
      expect(_body(_creates(fixture).single), containsPair('status', 'DRAFT'));
      expect(
        _body(_creates(fixture).single),
        containsPair('name', 'Builder device image project'),
      );
      expect(
        _body(_uploads(fixture).single),
        containsPair('field', 'mediaUrls'),
      );
      expect(server.project['mediaUrls'], hasLength(1));
      expect(server.project['status'], 'PUBLISHED');
      expect(find.byType(WorkspaceForm), findsNothing);
      expect(find.text('Project and images saved.'), findsOneWidget);
      final writes = fixture.transport.requests
          .where(
            (request) =>
                request.uri.path.startsWith('/api/builder/projects') ||
                request.uri.path == '/api/mobile/upload',
          )
          .toList();
      expect(writes.map((request) => request.method), [
        'POST',
        'POST',
        'GET',
        'PATCH',
        'GET',
      ]);
      expect(tester.takeException(), isNull);
    },
  );

  formTest('Builder form retains entered data and one image across reassemble', (
    tester,
    fixture,
    server,
  ) async {
    await _chooseProjectImage(tester);
    final state = tester.state(find.byType(WorkspaceForm));

    // Covers retained State during reassemble. A widget test cannot synthesize
    // adding a Dart field to an already running, older VM class definition.
    await _reassemble(tester);
    expect(tester.state(find.byType(WorkspaceForm)), same(state));
    expect(tester.takeException(), isNull);
    expect(_creates(fixture), isEmpty);
    expect(_uploads(fixture), isEmpty);

    final formScrollable = find
        .descendant(
          of: find.byType(WorkspaceForm),
          matching: find.byType(Scrollable),
        )
        .first;
    tester.state<ScrollableState>(formScrollable).position.jumpTo(0);
    await tester.pumpAndSettle();

    for (final entry in {
      'name': 'Builder device image project',
      'city': 'Kochi',
      'description': 'A synthetic project for local UI validation only.',
    }.entries) {
      final input = find.descendant(
        of: find.byKey(ValueKey(entry.key)),
        matching: find.byType(TextFormField),
      );
      await _reveal(tester, input);
      expect(tester.widget<TextFormField>(input).controller!.text, entry.value);
    }
    await _reveal(tester, _button('Add project photo'));
    final selected = tester
        .widget<BuilderProjectImages>(find.byType(BuilderProjectImages))
        .selections['mediaUrls'];
    expect(selected, hasLength(1));
    expect(base64Encode(selected!.single.bytes), _png);

    await _saveCallback(tester);
    await tester.tap(_button('Save'));
    await tester.pumpAndSettle();

    expect(_creates(fixture), hasLength(1));
    expect(_uploads(fixture), hasLength(1));
    final projectRequests = fixture.transport.requests
        .where(
          (request) =>
              request.uri.path.startsWith('/api/builder/projects') ||
              request.uri.path == '/api/mobile/upload',
        )
        .toList();
    expect(projectRequests.map((request) => request.method), [
      'POST',
      'POST',
      'GET',
      'PATCH',
      'GET',
    ]);
    expect(server.project['status'], 'PUBLISHED');
    expect(find.byType(WorkspaceForm), findsNothing);
    expect(find.text('Project and images saved.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  formTest(
    'Unavailable project image service keeps entries without creating draft',
    (tester, fixture, server) async {
      server.ready = false;
      await _chooseProjectImage(tester);
      await _saveCallback(tester);
      await tester.tap(_button('Save'));
      await tester.pumpAndSettle();

      expect(_creates(fixture), isEmpty);
      expect(_uploads(fixture), isEmpty);
      expect(find.byType(WorkspaceForm), findsOneWidget);
      expect(
        find.textContaining('Project image uploads are unavailable.'),
        findsOneWidget,
      );
      expect(
        tester.widget<ButtonStyleButton>(_button('Save')).onPressed,
        isNotNull,
      );
      expect(
        tester
            .widget<BuilderProjectImages>(find.byType(BuilderProjectImages))
            .selections['mediaUrls'],
        hasLength(1),
      );
      final form = tester.widget<WorkspaceForm>(find.byType(WorkspaceForm));
      expect(form.path, '/api/builder/projects');
      expect(find.text('Project and images saved.'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  formTest(
    'Uncertain project upload disables Save and returns to Projects safely',
    (tester, fixture, server) async {
      server.uncertainUpload = true;
      await _chooseProjectImage(tester);
      final captured = await _saveCallback(tester);
      await tester.tap(_button('Save'));
      await tester.pumpAndSettle();

      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), hasLength(1));
      expect(
        find.textContaining('Some changes may already be stored'),
        findsOneWidget,
      );
      expect(
        tester.widget<ButtonStyleButton>(_button('Save')).onPressed,
        isNull,
      );
      final state = tester.state(find.byType(WorkspaceForm));
      await _reassemble(tester);
      expect(tester.state(find.byType(WorkspaceForm)), same(state));
      expect(
        tester.widget<ButtonStyleButton>(_button('Save')).onPressed,
        isNull,
      );
      await (captured as Future<void> Function())();
      await tester.pumpAndSettle();
      expect(_creates(fixture), hasLength(1));
      expect(_uploads(fixture), hasLength(1));
      expect(server.project['status'], 'DRAFT');
      await _reveal(tester, _button('Back to Projects'));
      await tester.tap(_button('Back to Projects'));
      await tester.pumpAndSettle();
      expect(find.byType(WorkspaceForm), findsNothing);
      expect(find.byType(WorkspaceScreen), findsOneWidget);
      expect(find.text('Project and images saved.'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
