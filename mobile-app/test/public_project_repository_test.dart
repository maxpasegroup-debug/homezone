import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';

import 'marketplace_test.dart' as fixture;

const _project = <String, Object?>{
  'id': 'project-0001',
  'name': 'Synthetic project',
  'city': 'Kochi',
  'status': 'PUBLISHED',
  'mediaUrls': <String>[],
  'amenities': <String>[],
  'unitsCount': 0,
  'availableUnits': 0,
};

Map<String, Object?> _page({int page = 1}) => {
  'source': 'database',
  'page': page,
  'hasMore': false,
  'projects': [_project],
};

Map<String, Object?> _detail({String id = 'project-0001', int page = 1}) => {
  'source': 'database',
  'project': {
    ..._project,
    'id': id,
    'units': <Object?>[],
    'unitsHasMore': false,
    'unitsPage': page,
    'floorPlanUrls': <String>[],
    'masterPlanUrl': null,
  },
};

void main() {
  late fixture.Fixture f;
  setUp(() => f = fixture.Fixture());
  tearDown(() {
    f.repository.dispose();
    f.controller.dispose();
  });

  test(
    'project catalogue uses one client and its own bounded pagination',
    () async {
      f.transport.reply = (_) => fixture.json(_page(page: 2));
      final page = await f.repository.publicProjects({'city': 'Kochi'}, 2);
      expect(page.items.single.id, 'project-0001');
      final request = f.transport.requests.single;
      expect(request.uri.origin, f.configuration.baseUri.origin);
      expect(request.method, 'GET');
      expect(request.uri.path, '/api/mobile/projects');
      expect(request.uri.queryParameters, {
        'city': 'Kochi',
        'page': '2',
        'pageSize': '12',
      });
      expect(request.headers.containsKey('cookie'), false);
      for (final page in [0, 1001]) {
        await expectLater(
          f.repository.publicProjects({}, page),
          throwsA(isA<ApiException>()),
        );
      }
      await expectLater(
        f.repository.publicProjects({'purpose': 'BUY'}, 1),
        throwsA(isA<ApiException>()),
      );
      expect(f.transport.requests, hasLength(1));
    },
  );

  test(
    'public project reads work after logout without sending or accepting cookies',
    () async {
      await f.signIn();
      f.controller.clearLocalSession();
      f.transport.requests.clear();
      f.transport.reply = (request) => ApiResponse(
        200,
        fixture
            .json(
              request.uri.path == '/api/mobile/projects' ? _page() : _detail(),
            )
            .body,
        headers: const {
          'set-cookie': [
            '__Secure-authjs.session-token=synthetic-only; Path=/; Secure; HttpOnly',
          ],
        },
      );
      await f.repository.publicProjects({}, 1);
      await f.repository.publicProject('project-0001');
      expect(
        f.transport.requests.every(
          (request) => !request.headers.containsKey('cookie'),
        ),
        true,
      );
      expect(
        f.coordinator.hasProtocolCookie('__Secure-authjs.session-token'),
        false,
      );
      expect(f.controller.verified, false);
    },
  );

  test('project detail checks identity and requested unit page', () async {
    f.transport.reply = (_) => fixture.json(_detail(page: 2));
    final detail = await f.repository.publicProject(
      'project-0001',
      unitsPage: 2,
    );
    expect(detail.project.id, 'project-0001');
    expect(f.transport.requests.single.uri.queryParameters, {'unitsPage': '2'});
    f.transport.reply = (_) =>
        fixture.json(_detail(id: 'project-other', page: 2));
    await expectLater(
      f.repository.publicProject('project-0001', unitsPage: 2),
      throwsA(isA<ApiException>()),
    );
    f.transport.reply = (_) => fixture.json(_detail(page: 1));
    await expectLater(
      f.repository.publicProject('project-0001', unitsPage: 2),
      throwsA(isA<ApiException>()),
    );
    final before = f.transport.requests.length;
    for (final page in [0, 1001]) {
      await expectLater(
        f.repository.publicProject('project-0001', unitsPage: page),
        throwsA(isA<ApiException>()),
      );
    }
    expect(f.transport.requests, hasLength(before));
  });

  test(
    'project responses reject demo source and HTTP errors stay errors',
    () async {
      f.transport.reply = (_) => fixture.json({..._page(), 'source': 'demo'});
      await expectLater(
        f.repository.publicProjects({}, 1),
        throwsA(isA<ApiException>()),
      );
      f.transport.reply = (_) => fixture.json({
        'source': 'database',
        'page': 1,
        'hasMore': false,
        'projects': [],
      });
      expect((await f.repository.publicProjects({}, 1)).items, isEmpty);
      f.transport.reply = (_) =>
          const ApiResponse(503, 'SYNTHETIC_PRIVATE_PROVIDER_DETAIL');
      try {
        await f.repository.publicProjects({}, 1);
        fail('HTTP failure must not become an empty catalogue');
      } on ApiException catch (error) {
        expect(error.failure, ApiFailure.server);
        expect(error.responseMetadata, isNull);
        expect('$error', isNot(contains('SYNTHETIC_PRIVATE_PROVIDER_DETAIL')));
      }
    },
  );

  test(
    'late public project responses cannot cross a session generation change',
    () async {
      await f.signIn();
      final response = Completer<ApiResponse>();
      final dispatched = Completer<void>();
      f.transport.reply = (_) {
        dispatched.complete();
        return response.future;
      };
      final pending = f.repository.publicProjects({}, 1);
      await dispatched.future;
      final generation = f.coordinator.generation;
      f.controller.clearLocalSession();
      expect(f.coordinator.generation, isNot(generation));
      final assertion = expectLater(
        pending,
        throwsA(isA<CookieLifecycleInvalidated>()),
      );
      response.complete(fixture.json(_page()));
      await assertion;
    },
  );

  test(
    'confirmed Builder project writes invalidate the shared public catalogue',
    () async {
      await f.signIn();
      f.transport.reply = (_) => fixture.json({'project': _project});
      var hints = 0;
      f.repository.listingChanges.addListener(() => hints++);
      await f.repository.call(
        'POST',
        '/api/builder/projects',
        body: {'name': 'Synthetic project'},
      );
      await f.repository.call(
        'PATCH',
        '/api/builder/projects/project-0001',
        body: {'status': 'PUBLISHED'},
      );
      expect(hints, 2);
      f.transport.reply = (_) => const ApiResponse(403, '{}');
      await expectLater(
        f.repository.call(
          'PATCH',
          '/api/builder/projects/project-0001',
          body: {'status': 'PUBLISHED'},
        ),
        throwsA(isA<ApiException>()),
      );
      expect(hints, 2);
    },
  );
}
