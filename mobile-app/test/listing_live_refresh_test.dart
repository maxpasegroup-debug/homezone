import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/session_scope.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart';
import 'package:homezone_mobile/features/marketplace/listing_realtime.dart';

import 'marketplace_test.dart' as fixture;
import 'listing_realtime_test.dart' show FakeListingConnection;

const _id = 'property-0001';
const _detailPath = '/api/mobile/properties/$_id';
const _first = 'https://images.example.invalid/first.png';
const _second = 'https://images.example.invalid/second.png';

Map<String, dynamic> _listing({
  String? cover = _first,
  List<String> images = const [],
}) => {...fixture.sample, 'coverImageUrl': cover, 'mediaUrls': images};

ApiResponse _detail(Map<String, dynamic> property) =>
    fixture.json({'source': 'database', 'property': property});

List<ApiRequest> _reads(fixture.Fixture f) => f.transport.requests
    .where((request) => request.uri.path == _detailPath)
    .toList();

List<ApiRequest> _catalogReads(fixture.Fixture f) => f.transport.requests
    .where((request) => request.uri.path == '/api/mobile/properties')
    .toList();

Map<String, dynamic> _catalogListing(int index) => {
  ...fixture.sample,
  'id': 'property-${index.toString().padLeft(4, '0')}',
  'title': 'Published home $index',
  'coverImageUrl': null,
  'mediaUrls': <String>[],
};

ApiResponse _catalog(List<Map<String, dynamic>> rows, int page) =>
    fixture.json({
      'source': 'database',
      'page': page,
      'hasMore': rows.length > page * 12,
      'properties': rows.skip((page - 1) * 12).take(12).toList(),
    });

Future<void> _openCatalog(
  WidgetTester tester,
  fixture.Fixture f, {
  MarketplaceRepository? repository,
  bool settle = true,
}) async {
  tester.view.physicalSize = const Size(600, 1200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final observer = SessionRouteObserver();
  await tester.pumpWidget(
    SessionScope(
      controller: f.controller,
      routeObserver: observer,
      child: MaterialApp(
        navigatorObservers: [observer],
        home: MarketplaceScreen(repository: repository ?? f.repository),
      ),
    ),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

Future<void> _loadMoreCatalog(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.text('Load more'),
    700,
    scrollable: find.byType(Scrollable).first,
    maxScrolls: 40,
  );
  await tester.ensureVisible(find.text('Load more'));
  await tester.tap(find.text('Load more'));
  await tester.pumpAndSettle();
}

class _ScreenFixture {
  _ScreenFixture(this.f, {MarketplaceRepository? repository})
    : repository = repository ?? f.repository;
  final fixture.Fixture f;
  final MarketplaceRepository repository;
  final navigator = GlobalKey<NavigatorState>();
  final observer = SessionRouteObserver();

  Future<void> open(WidgetTester tester, {bool detail = false}) async {
    await tester.pumpWidget(
      SessionScope(
        controller: f.controller,
        routeObserver: observer,
        child: MaterialApp(
          navigatorKey: navigator,
          navigatorObservers: [observer],
          home: detail
              ? LivePropertyScreen(
                  id: _id,
                  repository: repository,
                  saved: () => false,
                  onSave: () async {},
                )
              : LiveGalleryScreen(
                  property: Listing.parse(_listing()),
                  repository: repository,
                ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }
}

void main() {
  late fixture.Fixture f;
  setUp(() => f = fixture.Fixture());
  tearDown(() => f.controller.dispose());

  testWidgets(
    'a hint received during initial loading is not lost for 30 seconds',
    (tester) async {
      final connection = FakeListingConnection();
      final live = ListingRealtime(
        configuration: f.configuration,
        connector: (_) async => connection,
      );
      final repository = MarketplaceRepository(
        client: f.client,
        coordinator: f.coordinator,
        session: f.controller,
        realtime: live,
      );
      final pending = Completer<ApiResponse>();
      var reads = 0;
      f.transport.reply = (_) =>
          ++reads == 1 ? pending.future : _catalog([_catalogListing(25)], 1);
      await _openCatalog(tester, f, repository: repository, settle: false);
      connection.ready();
      await tester.pump(const Duration(milliseconds: 200));
      expect(reads, 1);
      pending.complete(_catalog([], 1));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(reads, 2);
      expect(find.text('Published home 25'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      repository.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'a WebSocket publication hint updates Buyer UI through a real HTTP read',
    (tester) async {
      final connection = FakeListingConnection();
      final live = ListingRealtime(
        configuration: f.configuration,
        connector: (_) async => connection,
      );
      final repository = MarketplaceRepository(
        client: f.client,
        coordinator: f.coordinator,
        session: f.controller,
        realtime: live,
      );
      var rows = <Map<String, dynamic>>[];
      f.transport.reply = (request) =>
          _catalog(rows, int.parse(request.uri.queryParameters['page']!));
      await _openCatalog(tester, f, repository: repository);
      connection.ready();
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pumpAndSettle();
      final baseline = _catalogReads(f).length;
      rows = [_catalogListing(25)];
      for (var index = 0; index < 20; index++) {
        connection.changed();
      }
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pumpAndSettle();
      expect(_catalogReads(f).length, baseline + 1);
      expect(find.text('Published home 25'), findsOneWidget);
      expect(
        _catalogReads(f).every(
          (request) =>
              request.method == 'GET' &&
              request.uri.path == '/api/mobile/properties' &&
              !request.headers.containsKey('cookie'),
        ),
        true,
      );
      await tester.pumpWidget(const SizedBox());
      expect(connection.closed, true);
      repository.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'healthy WebSocket uses periodic HTTP resync and disconnect retains fallback',
    (tester) async {
      final connection = FakeListingConnection();
      var connections = 0;
      final live = ListingRealtime(
        configuration: f.configuration,
        connector: (_) async {
          if (++connections == 1) return connection;
          throw StateError('Synthetic connection failure');
        },
      );
      final repository = MarketplaceRepository(
        client: f.client,
        coordinator: f.coordinator,
        session: f.controller,
        realtime: live,
      );
      f.transport.reply = (request) => _catalog([], 1);
      await _openCatalog(tester, f, repository: repository);
      connection.ready();
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pumpAndSettle();
      final baseline = _catalogReads(f).length;
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(_catalogReads(f).length, baseline);
      await tester.pump(const Duration(seconds: 25));
      await tester.pumpAndSettle();
      expect(_catalogReads(f).length, baseline + 1);
      unawaited(connection.frames.close());
      await tester.pump();
      expect(live.ready, false);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(_catalogReads(f).length, baseline + 2);
      // Ending the visible route closes its lease and cannot reconnect in back.
      await tester.pumpWidget(const SizedBox());
      expect(connection.closed, true);
      repository.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'public socket closes when covered or backgrounded and reconnects on return',
    (tester) async {
      final connections = <FakeListingConnection>[];
      final live = ListingRealtime(
        configuration: f.configuration,
        connector: (_) async {
          final connection = FakeListingConnection();
          connections.add(connection);
          return connection;
        },
      );
      final repository = MarketplaceRepository(
        client: f.client,
        coordinator: f.coordinator,
        session: f.controller,
        realtime: live,
      );
      f.transport.reply = (_) => _detail(_listing());
      final screen = _ScreenFixture(f, repository: repository);
      await screen.open(tester);
      expect(connections.length, 1);
      connections.last.ready();
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pumpAndSettle();
      screen.navigator.currentState!.push<void>(
        MaterialPageRoute(
          builder: (_) => const Scaffold(body: Text('Covered route')),
        ),
      );
      await tester.pumpAndSettle();
      expect(connections.single.closed, true);
      await tester.pump(const Duration(seconds: 30));
      expect(connections.length, 1);
      screen.navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(connections.length, 2);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(connections.last.closed, true);
      await tester.pump(const Duration(seconds: 30));
      expect(connections.length, 2);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(connections.length, 3);
      await tester.pumpWidget(const SizedBox());
      expect(connections.last.closed, true);
      repository.dispose();
      await tester.pump();
    },
  );

  testWidgets('WebSocket hints cannot bypass an HTTP Retry-After deadline', (
    tester,
  ) async {
    final connection = FakeListingConnection();
    final live = ListingRealtime(
      configuration: f.configuration,
      connector: (_) async => connection,
    );
    final repository = MarketplaceRepository(
      client: f.client,
      coordinator: f.coordinator,
      session: f.controller,
      realtime: live,
    );
    f.transport.reply = (_) => _catalog([], 1);
    await _openCatalog(tester, f, repository: repository);
    f.transport.reply = (_) => const ApiResponse(
      429,
      '{"error":"Synthetic rate limit"}',
      retryAfter: '90',
      headers: {
        'retry-after': ['90'],
      },
    );
    connection.ready();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    final baseline = _catalogReads(f).length;
    connection.changed();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 30));
    await tester.pumpAndSettle();
    expect(_catalogReads(f).length, baseline);
    expect(find.textContaining('Too many requests'), findsWidgets);
    await tester.pumpWidget(const SizedBox());
    repository.dispose();
    await tester.pump();
  });

  testWidgets('a newly published home replaces the valid empty catalogue', (
    tester,
  ) async {
    var rows = <Map<String, dynamic>>[];
    f.transport.reply = (request) =>
        _catalog(rows, int.parse(request.uri.queryParameters['page']!));
    await _openCatalog(tester, f);
    expect(find.text('A little space for possibility.'), findsOneWidget);
    rows = [_catalogListing(25)];
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.text('Published home 25'), findsOneWidget);
    expect(find.text('A little space for possibility.'), findsNothing);
    expect(_catalogReads(f).length, 2);
    expect(
      _catalogReads(f).every(
        (request) =>
            request.method == 'GET' &&
            request.uri.queryParameters['page'] == '1' &&
            request.uri.queryParameters['pageSize'] == '12' &&
            !request.headers.containsKey('cookie'),
      ),
      true,
    );
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'new first-page membership refreshes automatically and resets offset paging',
    (tester) async {
      var rows = List.generate(24, (index) => _catalogListing(index + 1));
      f.transport.reply = (request) =>
          _catalog(rows, int.parse(request.uri.queryParameters['page']!));
      await _openCatalog(tester, f);
      await _loadMoreCatalog(tester);
      expect(_catalogReads(f).last.uri.queryParameters['page'], '2');
      rows = [_catalogListing(25), ...rows];
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(_catalogReads(f).last.uri.queryParameters['page'], '1');
      await tester.drag(find.byType(ListView).first, const Offset(0, 20000));
      await tester.pumpAndSettle();
      expect(find.text('Published home 25'), findsOneWidget);
      expect(find.text('Listings changed. Refresh results'), findsNothing);
      await _loadMoreCatalog(tester);
      expect(_catalogReads(f).last.uri.queryParameters['page'], '2');
      expect(
        _catalogReads(f).map((request) => request.uri.queryParameters['page']),
        ['1', '2', '1', '2'],
      );
      expect(find.text('Published home 12'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'later-page membership shifts rebuild from page one without a manual refresh',
    (tester) async {
      var rows = List.generate(24, (index) => _catalogListing(index + 1));
      f.transport.reply = (request) =>
          _catalog(rows, int.parse(request.uri.queryParameters['page']!));
      await _openCatalog(tester, f);
      await _loadMoreCatalog(tester);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(_catalogReads(f).last.uri.queryParameters['page'], '1');
      rows = rows.where((row) => row['id'] != 'property-0013').toList();
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(
        _catalogReads(f).map((request) => request.uri.queryParameters['page']),
        ['1', '2', '1', '2', '1'],
      );
      expect(find.text('Listings changed. Refresh results'), findsNothing);
      await _loadMoreCatalog(tester);
      expect(_catalogReads(f).last.uri.queryParameters['page'], '2');
      expect(find.text('Published home 13'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'an invalidated in-flight catalogue cannot show newly read rows',
    (tester) async {
      final pending = Completer<ApiResponse>();
      var refreshing = false;
      f.transport.reply = (request) =>
          refreshing ? pending.future : _catalog([_catalogListing(1)], 1);
      await _openCatalog(tester, f);
      refreshing = true;
      await tester.pump(const Duration(seconds: 5));
      expect(_catalogReads(f).length, 2);
      f.controller.clearLocalSession();
      pending.complete(_catalog([_catalogListing(25)], 1));
      await tester.pumpAndSettle();
      expect(find.text('Published home 25'), findsNothing);
      expect(find.text('Published home 1'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  test(
    'only acknowledged listing writes invalidate visible listing reads',
    () async {
      await f.signIn();
      f.transport.reply = (_) => fixture.json({'ok': true});
      var changes = 0;
      f.repository.listingChanges.addListener(() => changes++);
      for (final request in [
        ('POST', '/api/properties'),
        ('POST', '/api/mobile/upload'),
        ('PATCH', '/api/properties/$_id'),
        ('PATCH', '/api/properties/$_id/media'),
      ]) {
        await f.repository.call(request.$1, request.$2);
      }
      expect(changes, 4);
      expect(f.repository.listingChanges.value, 4);
      for (final request in [
        ('GET', '/api/properties/$_id/media'),
        ('POST', '/api/properties/$_id/view'),
        ('POST', '/api/properties/$_id/save'),
        ('PATCH', '/api/mobile/account'),
      ]) {
        await f.repository.call(request.$1, request.$2);
      }
      await f.repository.call('GET', _detailPath, protected: false);
      expect(changes, 4);
    },
  );

  test('failed listing writes do not announce a confirmed change', () async {
    await f.signIn();
    f.transport.reply = (_) =>
        fixture.json({'error': 'Synthetic failure'}, 500);
    await expectLater(
      f.repository.call('PATCH', '/api/properties/$_id/media'),
      throwsA(isA<ApiException>()),
    );
    f.transport.reply = (_) => const ApiResponse(200, 'not-json');
    await expectLater(
      f.repository.call('POST', '/api/mobile/upload'),
      throwsA(isA<ApiException>()),
    );
    expect(f.repository.listingChanges.value, 0);
  });

  test(
    'an old-session write cannot invalidate the next session views',
    () async {
      await f.signIn();
      final entered = Completer<void>();
      final response = Completer<ApiResponse>();
      f.transport.reply = (_) {
        entered.complete();
        return response.future;
      };
      final request = f.repository.call('PATCH', '/api/properties/$_id/media');
      final assertion = expectLater(
        request,
        throwsA(isA<CookieLifecycleInvalidated>()),
      );
      await entered.future;
      f.controller.clearLocalSession();
      response.complete(fixture.json({'ok': true}));
      await assertion;
      expect(f.repository.listingChanges.value, 0);
    },
  );

  test(
    'listing reads retain server backoff without raw response metadata',
    () async {
      f.transport.reply = (_) => const ApiResponse(
        429,
        '{"error":"Synthetic rate limit"}',
        retryAfter: '90',
        headers: {
          'retry-after': ['90'],
        },
      );
      try {
        await f.repository.detail(_id);
        fail('must reject a rate-limited read');
      } on ApiException catch (error) {
        expect(error.failure, ApiFailure.rateLimited);
        expect(error.retryAfterSeconds, 90);
        expect(error.responseMetadata, isNull);
      }
    },
  );

  testWidgets('open Buyer gallery refreshes cover, added photos and removals', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(600, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    var property = _listing();
    f.transport.reply = (_) => _detail(property);
    await _ScreenFixture(f).open(tester);
    expect(tester.widget<ListingImage>(find.byType(ListingImage)).url, _first);
    property = _listing(cover: _second, images: [_first]);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(
      tester
          .widgetList<ListingImage>(find.byType(ListingImage))
          .map((image) => image.url),
      [_second, _first],
    );
    property = _listing(cover: null);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.byType(ListingImage), findsNothing);
    expect(find.text('No photographs are available.'), findsOneWidget);
    expect(_reads(f).every((request) => request.method == 'GET'), true);
    expect(
      _reads(f).every((request) => !request.headers.containsKey('cookie')),
      true,
    );
    expect(
      f.transport.requests.any((request) => request.method != 'GET'),
      false,
    );
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'timed Buyer detail updates never repeat view or related writes',
    (tester) async {
      // Construct coordinated futures in the widget test's fake-async zone.
      f.controller.dispose();
      f = fixture.Fixture();
      final signIn = f.controller.beginSignIn(
        'synthetic@example.invalid',
        'SyntheticPassword123',
      );
      await tester.pump();
      expect((await signIn.result).verified, true);
      f.transport.requests.clear();
      var property = _listing();
      f.transport.reply = (request) {
        if (request.uri.path == _detailPath) return _detail(property);
        if (request.uri.path == '/api/mobile/properties') {
          return fixture.json({
            'source': 'database',
            'page': 1,
            'hasMore': false,
            'properties': [],
          });
        }
        return fixture.json({'ok': true});
      };
      await _ScreenFixture(f).open(tester, detail: true);
      property = _listing(cover: _second);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(_reads(f).length, 3);
      expect(
        f.transport.requests
            .where((request) => request.uri.path.endsWith('/view'))
            .length,
        1,
      );
      expect(
        f.transport.requests
            .where((request) => request.uri.path == '/api/mobile/properties')
            .length,
        1,
      );
      expect(
        tester.widget<ListingImage>(find.byType(ListingImage).first).url,
        _second,
      );
      await tester.pumpWidget(const SizedBox());
      f.controller.clearLocalSession();
    },
  );

  for (final detail in [false, true]) {
    testWidgets(
      'Buyer ${detail ? 'detail' : 'gallery'} clears unavailable public media',
      (tester) async {
        var gone = false;
        f.transport.reply = (request) {
          if (request.uri.path == _detailPath) {
            return gone
                ? fixture.json({'error': 'Not found'}, 404)
                : _detail(_listing());
          }
          return fixture.json({
            'source': 'database',
            'page': 1,
            'hasMore': false,
            'properties': [],
          });
        };
        await _ScreenFixture(f).open(tester, detail: detail);
        gone = true;
        await tester.pump(const Duration(seconds: 5));
        await tester.pumpAndSettle();
        expect(find.byType(ListingImage), findsNothing);
        expect(find.textContaining('no longer available'), findsWidgets);
        final calls = _reads(f).length;
        await tester.pump(const Duration(seconds: 20));
        await tester.pumpAndSettle();
        expect(_reads(f).length, calls);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets(
    'Buyer refresh pauses when covered or backgrounded and resumes safely',
    (tester) async {
      f.transport.reply = (_) => _detail(_listing());
      final screen = _ScreenFixture(f);
      await screen.open(tester);
      screen.navigator.currentState!.push<void>(
        MaterialPageRoute(
          builder: (_) => const Scaffold(body: Text('Covered route')),
        ),
      );
      await tester.pumpAndSettle();
      final coveredCalls = _reads(f).length;
      await tester.pump(const Duration(seconds: 20));
      await tester.pumpAndSettle();
      expect(_reads(f).length, coveredCalls);
      screen.navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(_reads(f).length, coveredCalls + 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump(const Duration(seconds: 20));
      expect(_reads(f).length, coveredCalls + 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(_reads(f).length, coveredCalls + 2);
      await tester.pumpWidget(const SizedBox());
      await tester.pump(const Duration(seconds: 20));
      expect(_reads(f).length, coveredCalls + 2);
    },
  );

  testWidgets(
    'Buyer polling is single-flight and confirmed changes refresh immediately',
    (tester) async {
      final response = Completer<ApiResponse>();
      var release = false;
      f.transport.reply = (_) =>
          release ? _detail(_listing(cover: _second)) : response.future;
      await _ScreenFixture(f).open(tester);
      await tester.pump(const Duration(seconds: 5));
      await tester.pump(const Duration(seconds: 10));
      expect(_reads(f).length, 1);
      release = true;
      response.complete(_detail(_listing()));
      await tester.pumpAndSettle();
      f.repository.listingChanges.value++;
      await tester.pumpAndSettle();
      expect(_reads(f).length, 2);
      expect(
        tester.widget<ListingImage>(find.byType(ListingImage)).url,
        _second,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'rate-limited Buyer refresh cannot be bypassed by local change or resume',
    (tester) async {
      f.transport.reply = (_) => const ApiResponse(
        429,
        '{"error":"Synthetic rate limit"}',
        retryAfter: '90',
        headers: {
          'retry-after': ['90'],
        },
      );
      await _ScreenFixture(f).open(tester);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(_reads(f).length, 1);
      expect(find.textContaining('Too many requests'), findsOneWidget);
      f.repository.listingChanges.value++;
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(_reads(f).length, 1);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
