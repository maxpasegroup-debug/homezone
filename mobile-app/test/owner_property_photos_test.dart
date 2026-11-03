import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/session_scope.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart'
    show ListingImage;
import 'package:homezone_mobile/features/workspace/owner_property_photos.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'marketplace_test.dart' show FixtureTransport, json;

const _id = 'property-0001';
const _first = 'https://images.example.invalid/first.png';
const _second = 'https://images.example.invalid/second.png';
const _third = 'https://images.example.invalid/third.png';
const _path = '/api/properties/$_id/media';

class _OwnerTransport extends FixtureTransport {
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    if (request.uri.path == '/api/auth/session') {
      requests.add(request);
      return json({
        'user': {'id': identity, 'role': 'OWNER', 'whatsappVerified': false},
        'expires': DateTime.now()
            .toUtc()
            .add(const Duration(days: 1))
            .toIso8601String(),
      });
    }
    return super.send(request, timeout, onHeaders: onHeaders);
  }
}

class _Fixture {
  _Fixture() {
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
      clock: () => now,
    );
    controller = SignInController(
      PasswordAuthProtocol(client: client, coordinator: coordinator),
      clock: () => now,
    );
    repository = MarketplaceRepository(
      client: client,
      coordinator: coordinator,
      session: controller,
    );
    transport.reply = (_) => media([_first]);
  }

  final transport = _OwnerTransport();
  final navigator = GlobalKey<NavigatorState>();
  final observer = SessionRouteObserver();
  late final SignInController controller;
  late final MarketplaceRepository repository;
  DateTime now = DateTime.now().toUtc();

  List<ApiRequest> get reads => transport.requests
      .where((request) => request.uri.path == _path && request.method == 'GET')
      .toList();

  ApiResponse media(
    List<String> photos, {
    String? cover,
    int version = 1,
    String id = _id,
  }) => json({
    'property': {
      'id': id,
      'coverImageUrl': cover,
      'mediaUrls': photos,
      'mediaState': version.toRadixString(16).padLeft(64, '0'),
      'updatedAt': now.toIso8601String(),
    },
  });

  Future<void> open(
    WidgetTester tester, {
    bool fullDetail = false,
    ValueNotifier<String>? listingId,
  }) async {
    final attempt = controller.beginSignIn(
      'synthetic@example.invalid',
      'SyntheticPassword123',
    );
    await tester.pump();
    expect((await attempt.result).verified, true);
    transport.requests.clear();
    await tester.pumpWidget(
      SessionScope(
        controller: controller,
        routeObserver: observer,
        child: MaterialApp(
          navigatorKey: navigator,
          navigatorObservers: [observer],
          home: fullDetail
              ? WorkspaceDetail(
                  repository: repository,
                  module: 'properties',
                  item: const {'id': _id, 'title': 'Local listing fixture'},
                )
              : Scaffold(
                  body: listingId == null
                      ? OwnerPropertyPhotos(
                          repository: repository,
                          id: _id,
                          clock: () => now,
                        )
                      : ValueListenableBuilder<String>(
                          valueListenable: listingId,
                          builder: (_, id, _) => OwnerPropertyPhotos(
                            repository: repository,
                            id: id,
                            clock: () => now,
                          ),
                        ),
                ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> advance(WidgetTester tester, Duration duration) async {
    now = now.add(duration);
    await tester.pump(duration);
    await tester.pump();
    await tester.pump();
  }

  void changed() => repository.listingChanges.value++;
}

List<String?> _visibleUrls(WidgetTester tester) => tester
    .widgetList<ListingImage>(find.byType(ListingImage))
    .map((image) => image.url)
    .toList();

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _Fixture fixture;

  void galleryTest(String description, WidgetTesterCallback body) {
    testWidgets(description, (tester) async {
      fixture = _Fixture();
      try {
        await body(tester);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.controller.dispose();
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        await tester.pump();
      }
    });
  }

  galleryTest('owned listing detail displays its server-confirmed photograph', (
    tester,
  ) async {
    await fixture.open(tester, fullDetail: true);
    expect(find.text('Property photos'), findsOneWidget);
    expect(_visibleUrls(tester), contains(_first));
    expect(find.text('1 of 1 photos'), findsOneWidget);
    expect(fixture.reads, hasLength(1));
    expect(
      fixture.transport.requests.every((request) => request.method == 'GET'),
      true,
    );
  });

  galleryTest('foreground polling reflects photo additions cover and removal', (
    tester,
  ) async {
    await fixture.open(tester);
    fixture.transport.reply = (_) =>
        fixture.media([_first, _second], cover: _second, version: 2);
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(find.text('1 of 2 photos'), findsOneWidget);
    expect(_visibleUrls(tester).first, _second);

    fixture.transport.reply = (_) => fixture.media([_first], version: 3);
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(find.text('1 of 1 photos'), findsOneWidget);
    expect(_visibleUrls(tester), [_first]);

    fixture.transport.reply = (_) => fixture.media([], version: 4);
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(find.text('No property photos added yet.'), findsOneWidget);
    expect(find.byType(ListingImage), findsNothing);
  });

  galleryTest(
    'acknowledged media mutation refreshes without waiting for poll',
    (tester) async {
      await fixture.open(tester);
      fixture.transport.reply = (_) => fixture.media([_second], version: 2);
      fixture.changed();
      await tester.pumpAndSettle();
      expect(_visibleUrls(tester), [_second]);
      expect(fixture.reads, hasLength(2));
    },
  );

  galleryTest('covered routes pause reads and refresh immediately on return', (
    tester,
  ) async {
    await fixture.open(tester);
    unawaited(
      fixture.navigator.currentState!.push<void>(
        MaterialPageRoute(
          builder: (_) => const Scaffold(body: Text('Covered')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    fixture.transport.reply = (_) => fixture.media([_second], version: 2);
    await fixture.advance(tester, const Duration(seconds: 20));
    expect(fixture.reads, hasLength(1));
    fixture.navigator.currentState!.pop();
    await tester.pumpAndSettle();
    expect(fixture.reads, hasLength(2));
    expect(_visibleUrls(tester), [_second]);
  });

  galleryTest('background pauses reads and resume refreshes confirmed photos', (
    tester,
  ) async {
    await fixture.open(tester);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump();
    fixture.transport.reply = (_) => fixture.media([_second], version: 2);
    await fixture.advance(tester, const Duration(seconds: 20));
    expect(fixture.reads, hasLength(1));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(fixture.reads, hasLength(2));
    expect(_visibleUrls(tester), [_second]);
  });

  galleryTest('polls never overlap a running authenticated media read', (
    tester,
  ) async {
    await fixture.open(tester);
    final pending = Completer<ApiResponse>();
    fixture.transport.reply = (_) => pending.future;
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(fixture.reads, hasLength(2));
    // Stay below the client's real 20-second timeout while a read is pending.
    await fixture.advance(tester, const Duration(seconds: 10));
    expect(fixture.reads, hasLength(2));
    pending.complete(fixture.media([_second], version: 2));
    await tester.pumpAndSettle();
    expect(_visibleUrls(tester), [_second]);
    fixture.transport.reply = (_) => fixture.media([_third], version: 3);
    await fixture.advance(tester, const Duration(seconds: 4));
    expect(fixture.reads, hasLength(2));
    await fixture.advance(tester, const Duration(seconds: 1));
    expect(fixture.reads, hasLength(3));
    expect(_visibleUrls(tester), [_third]);
  });

  galleryTest('logout clears images and discards an in-flight old response', (
    tester,
  ) async {
    await fixture.open(tester);
    final pending = Completer<ApiResponse>();
    fixture.transport.reply = (_) => pending.future;
    await fixture.advance(tester, const Duration(seconds: 5));
    fixture.controller.clearLocalSession();
    pending.complete(fixture.media([_second], version: 2));
    await tester.pumpAndSettle();
    expect(find.byType(ListingImage), findsNothing);
    expect(
      find.text('Sign in again to view listing photographs.'),
      findsOneWidget,
    );
    await fixture.advance(tester, const Duration(seconds: 30));
    expect(fixture.reads, hasLength(2));
  });

  galleryTest(
    'mutation during a read discards it and requests one fresh state',
    (tester) async {
      await fixture.open(tester);
      final oldRead = Completer<ApiResponse>();
      fixture.transport.reply = (_) => oldRead.future;
      await fixture.advance(tester, const Duration(seconds: 5));
      expect(fixture.reads, hasLength(2));
      fixture.changed();
      fixture.transport.reply = (_) => fixture.media([_third], version: 3);
      oldRead.complete(fixture.media([_second], version: 2));
      await tester.pump();
      expect(_visibleUrls(tester), isNot(contains(_second)));
      await tester.pumpAndSettle();
      expect(fixture.reads, hasLength(3));
      expect(_visibleUrls(tester), [_third]);
    },
  );

  galleryTest(
    'Retry-After blocks polling manual retries and mutation refresh',
    (tester) async {
      await fixture.open(tester);
      fixture.transport.reply = (_) => const ApiResponse(
        429,
        '{}',
        headers: {
          'retry-after': ['30'],
        },
        retryAfter: '30',
      );
      await fixture.advance(tester, const Duration(seconds: 5));
      expect(fixture.reads, hasLength(2));
      await tester.tap(find.byTooltip('Refresh property photos'));
      fixture.changed();
      await tester.pump();
      await fixture.advance(tester, const Duration(seconds: 25));
      expect(fixture.reads, hasLength(2));
      fixture.transport.reply = (_) => fixture.media([_second], version: 2);
      await fixture.advance(tester, const Duration(seconds: 5));
      expect(fixture.reads, hasLength(3));
      expect(_visibleUrls(tester), [_second]);
    },
  );

  galleryTest('successive transient failures back off instead of hammering', (
    tester,
  ) async {
    await fixture.open(tester);
    fixture.transport.reply = (_) => const ApiResponse(503, '{}');
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(fixture.reads, hasLength(2));
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(fixture.reads, hasLength(3));
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(fixture.reads, hasLength(3));
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(fixture.reads, hasLength(4));
    await fixture.advance(tester, const Duration(seconds: 15));
    expect(fixture.reads, hasLength(4));
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(fixture.reads, hasLength(5));
  });

  for (final status in [403, 404]) {
    galleryTest('$status clears photographs and stops automatic reads', (
      tester,
    ) async {
      await fixture.open(tester);
      fixture.transport.reply = (_) => ApiResponse(status, '{}');
      await fixture.advance(tester, const Duration(seconds: 5));
      expect(find.byType(ListingImage), findsNothing);
      await fixture.advance(tester, const Duration(minutes: 1));
      fixture.changed();
      await tester.pump();
      expect(fixture.reads, hasLength(2));
    });
  }

  galleryTest('foreign property IDs are rejected without replacing gallery', (
    tester,
  ) async {
    await fixture.open(tester);
    fixture.transport.reply = (_) =>
        fixture.media([_second], version: 2, id: 'foreign-property');
    await fixture.advance(tester, const Duration(seconds: 5));
    expect(_visibleUrls(tester), [_first]);
    expect(
      find.text('Unable to complete the request. Please try again.'),
      findsOneWidget,
    );
  });

  galleryTest(
    'reusing a gallery for another ID clears old media and reads it',
    (tester) async {
      final listingId = ValueNotifier(_id);
      addTearDown(listingId.dispose);
      await fixture.open(tester, listingId: listingId);
      final pending = Completer<ApiResponse>();
      fixture.transport.reply = (_) => pending.future;
      await fixture.advance(tester, const Duration(seconds: 5));
      listingId.value = 'property-0002';
      await tester.pump();
      expect(find.byType(ListingImage), findsNothing);
      fixture.transport.reply = (_) =>
          fixture.media([_third], version: 3, id: 'property-0002');
      pending.complete(fixture.media([_second], version: 2));
      await tester.pumpAndSettle();
      expect(_visibleUrls(tester), [_third]);
      expect(
        fixture.transport.requests.where(
          (request) =>
              request.uri.path == '/api/properties/property-0002/media',
        ),
        hasLength(1),
      );
    },
  );
}
