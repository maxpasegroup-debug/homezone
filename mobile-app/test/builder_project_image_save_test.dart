import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/workspace/builder_project_image_save.dart';
import 'package:homezone_mobile/features/workspace/listing_photo_picker.dart';

import 'create_listing_photos_test.dart' show Fixture;
import 'marketplace_test.dart' show json;

// All authentication, image bytes and storage responses stay in this process.
const _projectId = 'project-0001';
const _fields = ['mediaUrls', 'floorPlanUrls', 'masterPlanUrl', 'brochureUrl'];
const _png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwY2D4DwACHAFG3vnH5QAAAABJRU5ErkJggg==';
const _oldMedia = 'https://media.example.invalid/existing-photo.png';
const _oldPlan = 'https://media.example.invalid/existing-plan.png';

JsonObject _body(ApiRequest request) => jsonDecode(request.body!) as JsonObject;

SelectedListingPhoto _photo() =>
    SelectedListingPhoto.fromPicker({'base64': _png});

Map<String, List<SelectedListingPhoto>> _images({bool allSlots = false}) => {
  for (final field in allSlots ? _fields : ['mediaUrls']) field: [_photo()],
};

List<ApiRequest> _writes(Fixture fixture) => fixture.transport.requests
    .where((request) => request.method != 'GET')
    .toList();

class _ProjectServer {
  _ProjectServer(this.fixture, {bool existing = false}) {
    fixture.transport.photoReadinessReply = (_) => json(capabilities);
    fixture.transport.reply = respond;
    if (existing) {
      project['status'] = 'PUBLISHED';
      project['mediaUrls'] = [_oldMedia];
      project['floorPlanUrls'] = [_oldPlan];
    }
  }

  final Fixture fixture;
  JsonObject capabilities = {
    'builderProjectImageUploadConfigured': true,
    'builderProjectImageUploadFields': _fields,
  };
  JsonObject project = {
    'id': _projectId,
    'status': 'DRAFT',
    'mediaUrls': <String>[],
    'floorPlanUrls': <String>[],
    'masterPlanUrl': null,
    'brochureUrl': null,
    'updatedAt': '2026-11-06T10:00:00.000Z',
  };
  final uploaded = <String>[];
  FutureOr<ApiResponse> Function(ApiRequest)? createReply;
  FutureOr<ApiResponse> Function(ApiRequest)? uploadReply;
  FutureOr<ApiResponse> Function(ApiRequest)? readReply;

  JsonObject get snapshot => {
    ...project,
    'mediaUrls': List<String>.of(project['mediaUrls'] as List<String>),
    'floorPlanUrls': List<String>.of(project['floorPlanUrls'] as List<String>),
  };

  FutureOr<ApiResponse> respond(ApiRequest request) {
    if (request.method == 'POST' &&
        request.uri.path == '/api/builder/projects') {
      if (createReply != null) return createReply!(request);
      final data = _body(request);
      expect(data['status'], 'DRAFT');
      for (final field in _fields) {
        expect(
          data.containsKey(field),
          false,
          reason: 'Metadata must not overwrite attached project images.',
        );
      }
      project.addAll(data);
      return json({'project': snapshot});
    }
    if (request.method == 'POST' && request.uri.path == '/api/mobile/upload') {
      if (uploadReply != null) return uploadReply!(request);
      final data = _body(request);
      expect(data.keys.toSet(), {'projectId', 'field', 'base64'});
      expect(data['projectId'], _projectId);
      expect(data['base64'], _png);
      final field = data['field'] as String;
      expect(_fields, contains(field));
      final url = 'https://media.example.invalid/$field-${uploaded.length}.png';
      uploaded.add(url);
      if (field == 'mediaUrls' || field == 'floorPlanUrls') {
        project[field] = [...project[field] as List<String>, url];
      } else {
        project[field] = url;
      }
      return json({'url': url, 'project': snapshot});
    }
    if (request.uri.path == '/api/builder/projects/$_projectId') {
      if (request.method == 'GET') {
        return readReply?.call(request) ?? json({'project': snapshot});
      }
      if (request.method == 'PATCH') {
        final data = _body(request);
        for (final field in _fields) {
          expect(
            data.containsKey(field),
            false,
            reason: 'Metadata/status updates must preserve attached images.',
          );
        }
        project.addAll(data);
        return json({'project': snapshot});
      }
    }
    throw StateError('Unexpected in-process project fixture endpoint');
  }
}

Future<void> _prepare(WidgetTester tester, Fixture fixture) async {
  fixture.initialize();
  fixture.transport.role = 'BUILDER';
  await fixture.signIn(tester);
  fixture.transport.requests.clear();
}

Future<JsonObject> _create(
  BuilderProjectImageSave save, {
  Map<String, List<SelectedListingPhoto>>? images,
}) => save.save(
  method: 'POST',
  path: '/api/builder/projects',
  payload: const {'name': 'Local project fixture', 'status': 'PUBLISHED'},
  images: images ?? _images(),
);

void main() {
  void saveTest(
    String description,
    Future<void> Function(WidgetTester, Fixture) body,
  ) {
    testWidgets(description, (tester) async {
      final fixture = Fixture();
      try {
        await _prepare(tester, fixture);
        await body(tester, fixture);
      } finally {
        fixture.dispose();
        await tester.pump();
      }
    });
  }

  saveTest(
    'creates a draft and confirms all four image slots before publishing',
    (tester, fixture) async {
      final server = _ProjectServer(fixture);
      final progress = <String>[];
      final save = BuilderProjectImageSave(
        fixture.repository,
        onProgress: progress.add,
      );

      await _create(save, images: _images(allSlots: true));

      final requests = fixture.transport.requests;
      expect(requests.first.uri.path, '/api/mobile/capabilities');
      expect(
        requests.map((request) => '${request.method} ${request.uri.path}'),
        [
          'GET /api/mobile/capabilities',
          'POST /api/builder/projects',
          for (var index = 0; index < 4; index++) 'POST /api/mobile/upload',
          'GET /api/builder/projects/$_projectId',
          'PATCH /api/builder/projects/$_projectId',
          'GET /api/builder/projects/$_projectId',
        ],
      );
      expect(
        requests
            .where((request) => request.uri.path == '/api/mobile/upload')
            .map((request) => _body(request)['field']),
        _fields,
      );
      expect(_body(requests[7]), {'status': 'PUBLISHED'});
      expect(save.started, true);
      expect(save.projectId, _projectId);
      expect(server.project['status'], 'PUBLISHED');
      expect(server.uploaded, hasLength(4));
      expect(progress, isNotEmpty);
    },
  );

  for (final readiness in ['disabled', 'missing flag', 'missing fields']) {
    saveTest(
      'fails closed before creation when image readiness is $readiness',
      (tester, fixture) async {
        final server = _ProjectServer(fixture);
        server.capabilities = switch (readiness) {
          'disabled' => {
            'builderProjectImageUploadConfigured': false,
            'builderProjectImageUploadFields': _fields,
          },
          'missing flag' => {'propertyPhotoUploadConfigured': true},
          _ => {'builderProjectImageUploadConfigured': true},
        };
        final save = BuilderProjectImageSave(fixture.repository);

        await expectLater(_create(save), throwsA(anything));

        expect(_writes(fixture), isEmpty);
        expect(save.started, false);
        expect(save.projectId, isNull);
      },
    );
  }

  for (final entry in {
    'HTTP': 'http://media.example.invalid/unsafe.png',
    'userinfo': 'https://synthetic:fixture@media.example.invalid/unsafe.png',
    'fragment': 'https://media.example.invalid/unsafe.png#fragment',
    'nonstandard port': 'https://media.example.invalid:8443/unsafe.png',
  }.entries) {
    saveTest('rejects ${entry.key} upload URL without final publication', (
      tester,
      fixture,
    ) async {
      final server = _ProjectServer(fixture);
      server.uploadReply = (_) =>
          json({'url': entry.value, 'project': server.snapshot});
      final save = BuilderProjectImageSave(fixture.repository);

      await expectLater(_create(save), throwsA(anything));

      expect(save.projectId, _projectId);
      expect(
        _writes(fixture).where((request) => request.method == 'PATCH'),
        isEmpty,
      );
      expect(server.project['status'], 'DRAFT');
    });
  }

  saveTest('rejects an upload confirmation for another project', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    server.uploadReply = (_) => json({
      'url': 'https://media.example.invalid/foreign.png',
      'project': {...server.snapshot, 'id': 'project-foreign'},
    });
    final save = BuilderProjectImageSave(fixture.repository);

    await expectLater(_create(save), throwsA(anything));

    expect(
      _writes(fixture).where((request) => request.method == 'PATCH'),
      isEmpty,
    );
    expect(save.projectId, _projectId);
  });

  saveTest('requires confirmation of a private draft before the first upload', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    server.createReply = (_) => json({
      'project': {...server.snapshot, 'status': 'PUBLISHED'},
    });
    final save = BuilderProjectImageSave(fixture.repository);

    await expectLater(_create(save), throwsA(anything));

    expect(save.projectId, _projectId);
    expect(_writes(fixture), hasLength(1));
  });

  saveTest('rejects a malformed project timestamp before final publication', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    server.readReply = (_) => json({
      'project': {...server.snapshot, 'updatedAt': 'not-a-timestamp'},
    });
    final save = BuilderProjectImageSave(fixture.repository);

    await expectLater(_create(save), throwsA(anything));

    expect(
      _writes(fixture).where((request) => request.method == 'PATCH'),
      isEmpty,
    );
  });

  for (final entry in {
    'unknown image field': {
      'qrCodeUrl': [_photo()],
    },
    'too many project images': {'mediaUrls': List.generate(7, (_) => _photo())},
    'too many floor plans': {
      'floorPlanUrls': List.generate(7, (_) => _photo()),
    },
    'multiple master plans': {
      'masterPlanUrl': [_photo(), _photo()],
    },
    'multiple brochures': {
      'brochureUrl': [_photo(), _photo()],
    },
  }.entries) {
    saveTest('rejects ${entry.key} before any mutation', (
      tester,
      fixture,
    ) async {
      _ProjectServer(fixture);
      final save = BuilderProjectImageSave(fixture.repository);

      await expectLater(_create(save, images: entry.value), throwsA(anything));

      expect(_writes(fixture), isEmpty);
      expect(save.started, false);
    });
  }

  saveTest('uncertain creation is never automatically repeated', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    server.createReply = (_) => throw const ApiException(ApiFailure.network);
    final save = BuilderProjectImageSave(fixture.repository);

    await expectLater(_create(save), throwsA(anything));
    final writes = _writes(fixture).length;
    await expectLater(_create(save), throwsA(anything));

    expect(save.started, true);
    expect(save.projectId, isNull);
    expect(_writes(fixture), hasLength(writes));
    expect(writes, 1);
  });

  saveTest('concurrent save during readiness cannot create a second project', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    final readiness = Completer<ApiResponse>();
    fixture.transport.photoReadinessReply = (_) => readiness.future;
    final save = BuilderProjectImageSave(fixture.repository);

    final first = _create(save);
    await tester.pump();
    final secondRejected = expectLater(_create(save), throwsA(anything));
    readiness.complete(json(server.capabilities));
    await first;
    await secondRejected;

    expect(
      _writes(fixture).where(
        (request) =>
            request.method == 'POST' &&
            request.uri.path == '/api/builder/projects',
      ),
      hasLength(1),
    );
  });

  saveTest(
    'uncertain upload retains the known project without replaying writes',
    (tester, fixture) async {
      final server = _ProjectServer(fixture);
      server.uploadReply = (_) => throw const ApiException(ApiFailure.timeout);
      final save = BuilderProjectImageSave(fixture.repository);

      await expectLater(_create(save), throwsA(anything));
      final writes = _writes(fixture).length;
      await expectLater(_create(save), throwsA(anything));

      expect(save.started, true);
      expect(save.projectId, _projectId);
      expect(_writes(fixture), hasLength(writes));
      expect(writes, 2);
      expect(server.project['status'], 'DRAFT');
    },
  );

  saveTest(
    'edits an existing project without creating or replacing image arrays',
    (tester, fixture) async {
      final server = _ProjectServer(fixture, existing: true);
      final save = BuilderProjectImageSave(fixture.repository);

      await save.save(
        method: 'PATCH',
        path: '/api/builder/projects/$_projectId',
        payload: const {
          'name': 'Updated local project',
          'status': 'PUBLISHED',
          'mediaUrls': <String>[],
          'floorPlanUrls': <String>[],
          'masterPlanUrl': null,
          'brochureUrl': null,
        },
        images: _images(allSlots: true),
      );

      expect(
        _writes(fixture).where(
          (request) =>
              request.method == 'POST' &&
              request.uri.path == '/api/builder/projects',
        ),
        isEmpty,
      );
      expect(save.projectId, _projectId);
      expect(server.project['mediaUrls'], contains(_oldMedia));
      expect(server.project['floorPlanUrls'], contains(_oldPlan));
      expect(server.project['mediaUrls'], hasLength(2));
      expect(server.project['floorPlanUrls'], hasLength(2));
      expect(server.project['status'], 'PUBLISHED');
    },
  );

  saveTest('missing uploaded image on owned readback prevents publication', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    server.readReply = (_) => json({
      'project': {...server.snapshot, 'mediaUrls': <String>[]},
    });
    final save = BuilderProjectImageSave(fixture.repository);

    await expectLater(_create(save), throwsA(anything));

    expect(
      _writes(fixture).where((request) => request.method == 'PATCH'),
      isEmpty,
    );
    expect(server.project['status'], 'DRAFT');
  });

  saveTest(
    'unconfirmed final status is an error without replaying publication',
    (tester, fixture) async {
      final server = _ProjectServer(fixture);
      server.readReply = (_) => json({
        'project': {...server.snapshot, 'status': 'DRAFT'},
      });
      final save = BuilderProjectImageSave(fixture.repository);

      await expectLater(_create(save), throwsA(anything));
      final writes = _writes(fixture).length;
      await expectLater(_create(save), throwsA(anything));

      expect(_writes(fixture), hasLength(writes));
      expect(
        _writes(fixture).where((request) => request.method == 'PATCH'),
        hasLength(1),
      );
    },
  );

  saveTest('account invalidation during upload stops subsequent image writes', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    server.uploadReply = (_) {
      fixture.controller.clearLocalSession();
      return json({
        'url': 'https://media.example.invalid/uploaded.png',
        'project': server.snapshot,
      });
    };
    final save = BuilderProjectImageSave(fixture.repository);

    await expectLater(
      _create(save, images: _images(allSlots: true)),
      throwsA(anything),
    );

    expect(fixture.controller.verified, false);
    expect(
      _writes(
        fixture,
      ).where((request) => request.uri.path == '/api/mobile/upload'),
      hasLength(1),
    );
    expect(
      _writes(fixture).where((request) => request.method == 'PATCH'),
      isEmpty,
    );
  });

  saveTest('account invalidation during readiness sends no project mutation', (
    tester,
    fixture,
  ) async {
    final server = _ProjectServer(fixture);
    fixture.transport.photoReadinessReply = (_) {
      fixture.controller.clearLocalSession();
      return json(server.capabilities);
    };
    final save = BuilderProjectImageSave(fixture.repository);

    await expectLater(_create(save), throwsA(anything));

    expect(_writes(fixture), isEmpty);
    expect(fixture.controller.verified, false);
  });
}
