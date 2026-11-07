import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/session_scope.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/marketplace/public_project.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart'
    show MarketplaceScreen;
import 'package:homezone_mobile/features/marketplace/public_projects_screen.dart';
import 'package:homezone_mobile/shared/ui/loading_skeleton.dart';

import 'marketplace_test.dart' as fixture;

Map<String, dynamic> _project([String id = 'project-0001']) => {
  'id': id,
  'name': 'Published development',
  'status': 'PUBLISHED',
  'city': 'Kochi',
  'description': 'A public project description',
  'constructionStatus': 'UNDER_CONSTRUCTION',
  'unitsCount': null,
  'availableUnits': null,
  'amenities': ['Garden'],
  'mediaUrls': [],
  'builderId': 'must-not-be-retained',
  'team': ['private-team'],
};

Map<String, dynamic> _unit(int index) => {
  'id': 'unit-${index.toString().padLeft(4, '0')}',
  'status': 'AVAILABLE',
  'unitType': 'Unit type $index',
  'areaValue': '1250.5',
  'areaUnit': 'sqft',
  'bedrooms': 2,
  'bathrooms': 2,
  'price': '5000000',
  'imageUrls': [],
};

Map<String, dynamic> _page(
  List<Map<String, dynamic>> projects, {
  int page = 1,
  bool more = false,
}) => {
  'source': 'database',
  'page': page,
  'hasMore': more,
  'projects': projects,
};

Map<String, dynamic> _detail({
  List<Map<String, dynamic>> units = const [],
  bool more = false,
  int page = 1,
}) => {
  'source': 'database',
  'project': {
    ..._project(),
    'units': units,
    'unitsPage': page,
    'unitsHasMore': more,
    'floorPlanUrls': [],
    'masterPlanUrl': null,
  },
};

void main() {
  group('public project projection', () {
    test(
      'nullable inventory metadata stays nullable and HTTPS is required',
      () {
        final project = PublicProject.parse({
          ..._project(),
          'mediaUrls': [
            'http://untrusted.invalid/x',
            'https://image.invalid/a',
            'https://name:secret@image.invalid/a',
            'https://image.invalid/a',
          ],
        });
        expect(project.unitsCount, isNull);
        expect(project.availableUnits, isNull);
        expect(project.images, ['https://image.invalid/a']);
        expect(() => project.images.add('x'), throwsUnsupportedError);
      },
    );
    for (final patch in <Map<String, dynamic>>[
      {'status': 'DRAFT'},
      {'id': '../private'},
      {'unitsCount': -1},
      {
        'mediaUrls': [true],
      },
      {'completionDate': 'not-a-date'},
    ]) {
      test('rejects invalid public project ${patch.keys.first}', () {
        expect(
          () => PublicProject.parse({..._project(), ...patch}),
          throwsA(isA<ApiException>()),
        );
      });
    }
    test('rejects fake sources, oversized pages and duplicate project IDs', () {
      for (final payload in [
        {..._page([]), 'source': 'preview'},
        _page([_project(), _project()]),
        _page(List.generate(13, (i) => _project('project-000$i'))),
        _page([_project()], more: true),
      ]) {
        expect(
          () => PublicProjectPage.parse(payload),
          throwsA(isA<ApiException>()),
        );
      }
    });
    test('parses only available units and bounded image-only plans', () {
      final detail = PublicProjectDetail.parse(_detail(units: [_unit(1)]));
      expect(detail.units.single.price, 5000000);
      expect(detail.units.single.areaValue, 1250.5);
      expect(detail.units.single.unitType, 'Unit type 1');
      expect(detail.unitsPage, 1);
      expect(
        () => PublicProjectDetail.parse(
          _detail(
            units: [
              {..._unit(1), 'status': 'RESERVED'},
            ],
          ),
        ),
        throwsA(isA<ApiException>()),
      );
      expect(
        () => PublicProjectDetail.parse(_detail(units: [_unit(1), _unit(1)])),
        throwsA(isA<ApiException>()),
      );
    });
  });

  group('Buyer public projects UI', () {
    late fixture.Fixture f;
    late SessionRouteObserver observer;
    late GlobalKey<NavigatorState> navigator;
    setUp(() {
      f = fixture.Fixture();
      observer = SessionRouteObserver();
      navigator = GlobalKey<NavigatorState>();
    });
    tearDown(() {
      f.repository.dispose();
      f.controller.dispose();
    });

    Future<void> open(
      WidgetTester tester,
      Widget child, {
      bool settle = true,
    }) async {
      tester.view.physicalSize = const Size(600, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        SessionScope(
          controller: f.controller,
          routeObserver: observer,
          child: MaterialApp(
            navigatorKey: navigator,
            navigatorObservers: [observer],
            home: child,
          ),
        ),
      );
      if (settle) {
        await tester.pumpAndSettle();
      } else {
        await tester.pump();
      }
    }

    Future<void> close(WidgetTester tester) async {
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    }

    testWidgets(
      'requests real project API and distinguishes empty from failure',
      (tester) async {
        f.transport.reply = (_) => fixture.json(_page([]));
        await open(
          tester,
          Scaffold(body: PublicProjectsSection(repository: f.repository)),
        );
        expect(find.text('New projects, coming soon'), findsOneWidget);
        expect(f.transport.requests.single.uri.path, '/api/mobile/projects');
        expect(f.transport.requests.single.uri.queryParameters, {
          'page': '1',
          'pageSize': '12',
        });
        f.transport.reply = (_) => const ApiResponse(503, '{}');
        f.repository.listingChanges.value++;
        await tester.pumpAndSettle();
        expect(find.text('Projects could not be loaded'), findsOneWidget);
        expect(find.text('New projects, coming soon'), findsNothing);
        await close(tester);
      },
    );

    testWidgets(
      'detail renders actual project and units without Property-only actions',
      (tester) async {
        f.transport.reply = (_) => fixture.json(_detail(units: [_unit(1)]));
        await open(
          tester,
          PublicProjectDetailScreen(
            id: 'project-0001',
            repository: f.repository,
          ),
        );
        expect(find.text('Published development'), findsOneWidget);
        await tester.scrollUntilVisible(find.text('Unit type 1'), 400);
        expect(find.text('Unit type 1'), findsOneWidget);
        expect(
          find.text('Price: 5000000 (currency not provided)'),
          findsOneWidget,
        );
        expect(find.text('Send enquiry'), findsNothing);
        expect(find.text('Save property'), findsNothing);
        await close(tester);
      },
    );

    testWidgets('unpublish hint and 404 remove visible project details', (
      tester,
    ) async {
      f.transport.reply = (_) => fixture.json(_detail());
      await open(
        tester,
        PublicProjectDetailScreen(id: 'project-0001', repository: f.repository),
      );
      expect(find.text('Published development'), findsOneWidget);
      f.transport.reply = (_) => const ApiResponse(404, '{}');
      f.repository.listingChanges.value++;
      await tester.pumpAndSettle();
      expect(find.text('Published development'), findsNothing);
      expect(find.text('Project unavailable'), findsOneWidget);
      await close(tester);
    });

    testWidgets(
      'hint during pending read rejects stale completion and reads again',
      (tester) async {
        final first = Completer<ApiResponse>();
        var calls = 0;
        f.transport.reply = (_) =>
            ++calls == 1 ? first.future : fixture.json(_page([]));
        await open(
          tester,
          Scaffold(body: PublicProjectsSection(repository: f.repository)),
          settle: false,
        );
        expect(find.byType(LoadingSkeleton), findsOneWidget);
        await tester.pump(const Duration(milliseconds: 1));
        expect(calls, 1);
        f.repository.listingChanges.value++;
        first.complete(fixture.json(_page([_project()])));
        await tester.pumpAndSettle();
        expect(calls, 2);
        expect(find.text('Published development'), findsNothing);
        expect(find.text('New projects, coming soon'), findsOneWidget);
        await close(tester);
      },
    );

    testWidgets('hidden routes do not poll and refresh on return', (
      tester,
    ) async {
      f.transport.reply = (_) => fixture.json(_page([]));
      await open(
        tester,
        Scaffold(body: PublicProjectsSection(repository: f.repository)),
      );
      final reads = f.transport.requests.length;
      unawaited(
        navigator.currentState!.push(
          MaterialPageRoute<void>(
            builder: (_) => const Scaffold(body: Text('Other screen')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.pump(const Duration(minutes: 2));
      expect(f.transport.requests.length, reads);
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(f.transport.requests.length, reads + 1);
      await close(tester);
    });

    testWidgets('background pauses reads and resume revalidates', (
      tester,
    ) async {
      f.transport.reply = (_) => fixture.json(_page([]));
      await open(
        tester,
        Scaffold(body: PublicProjectsSection(repository: f.repository)),
      );
      final reads = f.transport.requests.length;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump(const Duration(minutes: 2));
      expect(f.transport.requests.length, reads);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(f.transport.requests.length, reads + 1);
      await close(tester);
    });

    testWidgets('live hints respect a server Retry-After deadline', (
      tester,
    ) async {
      f.transport.reply = (_) => const ApiResponse(
        429,
        '{}',
        headers: {
          'retry-after': ['30'],
        },
      );
      await open(
        tester,
        Scaffold(body: PublicProjectsSection(repository: f.repository)),
      );
      expect(f.transport.requests.length, 1);
      f.repository.listingChanges.value++;
      await tester.pump(const Duration(seconds: 1));
      expect(f.transport.requests.length, 1);
      await tester.pump(const Duration(seconds: 30));
      expect(f.transport.requests.length, 2);
      await close(tester);
    });

    testWidgets(
      'normal platform observer callbacks do not crash project screens',
      (tester) async {
        f.transport.reply = (_) => fixture.json(_page([]));
        await open(
          tester,
          Scaffold(body: PublicProjectsSection(repository: f.repository)),
        );
        tester.binding.handleMetricsChanged();
        tester.binding.handlePlatformBrightnessChanged();
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await close(tester);
      },
    );

    testWidgets(
      'unit next-page request is bounded and current page survives poll',
      (tester) async {
        f.transport.reply = (request) {
          final page = int.parse(
            request.uri.queryParameters['unitsPage'] ?? '1',
          );
          return fixture.json(
            page == 1
                ? _detail(units: List.generate(24, (i) => _unit(i)), more: true)
                : _detail(units: [_unit(25)], page: 2),
          );
        };
        await open(
          tester,
          PublicProjectDetailScreen(
            id: 'project-0001',
            repository: f.repository,
          ),
        );
        await tester.scrollUntilVisible(find.text('Next'), 800, maxScrolls: 50);
        await tester.tap(find.text('Next'));
        await tester.pumpAndSettle();
        expect(f.transport.requests.last.uri.queryParameters['unitsPage'], '2');
        await tester.scrollUntilVisible(
          find.text('Unit type 25'),
          -600,
          maxScrolls: 50,
        );
        expect(find.text('Unit type 25'), findsOneWidget);
        expect(find.text('Unit type 0'), findsNothing);
        await tester.pump(const Duration(seconds: 30));
        await tester.pumpAndSettle();
        expect(f.transport.requests.last.uri.queryParameters['unitsPage'], '2');
        await close(tester);
      },
    );

    testWidgets(
      'Buyer home receives a publication and opens the real project detail',
      (tester) async {
        var published = false;
        f.transport.reply = (request) {
          if (request.uri.path == '/api/mobile/projects') {
            return fixture.json(_page(published ? [_project()] : []));
          }
          if (request.uri.path == '/api/mobile/projects/project-0001') {
            return fixture.json(_detail(units: [_unit(1)]));
          }
          if (request.uri.path == '/api/mobile/properties') {
            return fixture.json({
              'source': 'database',
              'page': 1,
              'hasMore': false,
              'properties': [],
            });
          }
          return const ApiResponse(404, '{}');
        };
        await open(tester, MarketplaceScreen(repository: f.repository));
        await tester.scrollUntilVisible(
          find.text('New projects, coming soon'),
          500,
          scrollable: find.byType(Scrollable).first,
        );
        expect(find.text('Published development'), findsNothing);
        published = true;
        f.repository.listingChanges.value++;
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.text('Published development'),
          400,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.text('Published development'));
        await tester.pumpAndSettle();
        expect(find.byType(PublicProjectDetailScreen), findsOneWidget);
        expect(find.text('Published development'), findsOneWidget);
        final detail = f.transport.requests
            .where(
              (request) =>
                  request.uri.path == '/api/mobile/projects/project-0001',
            )
            .single;
        expect(detail.method, 'GET');
        expect(detail.uri.queryParameters, {'unitsPage': '1'});
        await tester.scrollUntilVisible(find.text('Unit type 1'), 400);
        expect(find.text('Unit type 1'), findsOneWidget);
        expect(
          f.transport.requests.where((request) => request.method != 'GET'),
          isEmpty,
        );
        await close(tester);
      },
    );
  });
}
