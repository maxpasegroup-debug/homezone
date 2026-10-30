import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart';
import 'package:homezone_mobile/features/marketplace/listing_media.dart';

final sample = <String, dynamic>{
  'id': 'property-0001',
  'title': 'Synthetic home',
  'status': 'PUBLISHED',
  'city': 'Kochi',
  'currency': 'INR',
  'price': '100',
  'bedrooms': 3,
};
ApiResponse json(Object? data, [int status = 200]) =>
    ApiResponse(status, jsonEncode(data));

class FixtureTransport implements ApiTransport {
  final requests = <ApiRequest>[];
  FutureOr<ApiResponse> Function(ApiRequest)? reply;
  String identity = 'user-0001';
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    requests.add(request);
    if (request.uri.path == '/api/auth/csrf') {
      final token = List.filled(64, 'a').join(),
          hash = List.filled(64, 'b').join();
      return ApiResponse(
        200,
        jsonEncode({'csrfToken': token}),
        headers: {
          'set-cookie': [
            '__Host-authjs.csrf-token=$token%7C$hash; Path=/; Secure; HttpOnly',
          ],
        },
      );
    }
    if (request.uri.path == '/api/auth/callback/password') {
      return const ApiResponse(
        200,
        '{"url":"/"}',
        headers: {
          'set-cookie': [
            '__Secure-authjs.session-token=FAKE-JWE.synthetic-regression-only; Path=/; Secure; HttpOnly',
          ],
        },
      );
    }
    if (request.uri.path == '/api/auth/session') {
      return json({
        'user': {'id': identity, 'role': 'USER', 'whatsappVerified': false},
        'expires': DateTime.now()
            .toUtc()
            .add(const Duration(days: 1))
            .toIso8601String(),
      });
    }
    return await (reply?.call(request) ?? json({'url': '/'}));
  }

  @override
  void close() {}
}

class MediaClient implements HttpClient {
  final request = MediaRequest();
  @override
  Duration? connectionTimeout;
  @override
  Future<HttpClientRequest> getUrl(Uri url) async => request;
  @override
  void close({bool force = false}) {}
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class MediaRequest implements HttpClientRequest {
  @override
  bool followRedirects = true;
  @override
  Future<HttpClientResponse> close() async => MediaResponse();
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class MediaResponse extends Stream<List<int>> implements HttpClientResponse {
  @override
  int get statusCode => 302;
  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) => const Stream<List<int>>.empty().listen(
    onData,
    onError: onError,
    onDone: onDone,
    cancelOnError: cancelOnError,
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class Fixture {
  Fixture() {
    client = ApiClient(configuration: configuration, transport: transport);
    coordinator = CookieRequestCoordinator(
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
  }
  final configuration = ApiConfiguration(
    'https://fixture.example.invalid',
    environment: ApiEnvironment.staging,
  );
  final transport = FixtureTransport();
  DateTime now = DateTime.now().toUtc();
  late final ApiClient client;
  late final CookieRequestCoordinator coordinator;
  late final SignInController controller;
  late final MarketplaceRepository repository;
  Future<void> signIn() async {
    expect(
      (await controller
              .beginSignIn('synthetic@example.invalid', 'SyntheticPassword123')
              .result)
          .verified,
      true,
    );
  }
}

void main() {
  late Fixture f;
  setUp(() => f = Fixture());
  tearDown(() => f.controller.dispose());

  test('workspace validates server role and cursor before exposing records', () async {
    await f.signIn();
    Map<String, dynamic> page = {
      'source': 'database', 'module': 'notifications', 'mode': 'cursor',
      'role': 'USER', 'items': [], 'hasMore': false, 'nextCursor': null,
    };
    f.transport.reply = (_) => json(page);
    expect((await f.repository.workspacePage('notifications'))['items'], isEmpty);
    for (final role in ['OWNER', 'ADMIN', null]) {
      page = {...page, 'role': role};
      await expectLater(f.repository.workspacePage('notifications'), throwsA(isA<ApiException>()));
    }
    page = {...page, 'role': 'USER', 'hasMore': true, 'nextCursor': 'same-cursor'};
    await expectLater(f.repository.workspacePage('notifications', after: 'same-cursor'), throwsA(isA<ApiException>()));
  });

  test(
    'catalog uses explicit backend pagination and never accepts fictional fallback',
    () async {
      f.transport.reply = (_) => json({
        'source': 'database',
        'page': 2,
        'hasMore': false,
        'properties': [sample],
      });
      final result = await f.repository.listings({'city': 'Kochi'}, 2);
      expect(result.items.single.id, 'property-0001');
      expect(f.transport.requests.single.uri.queryParameters, {
        'city': 'Kochi',
        'page': '2',
        'pageSize': '12',
      });
      f.transport.reply = (_) => json({
        'source': 'demo',
        'page': 1,
        'hasMore': false,
        'properties': [sample],
      });
      await expectLater(
        f.repository.listings({}, 1),
        throwsA(isA<ApiException>()),
      );
      expect(
        () => Listing.parse({...sample, 'status': 'DEMO'}),
        throwsA(isA<ApiException>()),
      );
    },
  );
  test(
    'protected requests fail before dispatch without independent authentication',
    () async {
      await expectLater(f.repository.account(), throwsA(isA<ApiException>()));
      expect(f.transport.requests, isEmpty);
    },
  );
  test(
    'save requires acknowledgment and strips error response metadata',
    () async {
      await f.signIn();
      f.transport.reply = (_) => json({'saved': true});
      await f.repository.save('property-0001', true);
      expect(f.transport.requests.last.headers.containsKey('cookie'), true);
      f.transport.reply = (_) =>
          const ApiResponse(500, 'SYNTHETIC_PRIVATE_BODY');
      try {
        await f.repository.save('property-0001', false);
        fail('must fail');
      } on ApiException catch (error) {
        expect(error.responseMetadata, isNull);
        expect('$error', isNot(contains('SYNTHETIC_PRIVATE_BODY')));
      }
      f.transport.reply = (_) => json({'saved': true});
      await expectLater(
        f.repository.save('property-0001', false),
        throwsA(isA<ApiException>()),
      );
    },
  );
  test('401 invalidates current identity and cookies', () async {
    await f.signIn();
    f.transport.reply = (_) => json({'error': 'Unauthorized'}, 401);
    await expectLater(f.repository.account(), throwsA(isA<ApiException>()));
    expect(f.controller.verified, false);
    expect(
      f.coordinator.hasProtocolCookie('__Secure-authjs.session-token'),
      false,
    );
  });
  test('a late account response cannot survive session invalidation', () async {
    await f.signIn();
    final entered = Completer<void>(), response = Completer<ApiResponse>();
    f.transport.reply = (_) {
      entered.complete();
      return response.future;
    };
    final request = f.repository.account();
    final assertion = expectLater(
      request,
      throwsA(isA<CookieLifecycleInvalidated>()),
    );
    await entered.future;
    f.controller.clearLocalSession();
    response.complete(
      json({
        'profile': {'fullName': 'Old owner'},
      }),
    );
    await assertion;
    expect(f.controller.identity, isNull);
  });
  test('queued protected work rechecks expiry before sending', () async {
    await f.signIn();
    final entered = Completer<void>(), release = Completer<void>();
    final blocker = f.coordinator.coordinate('/api/mobile/properties', (
      _,
    ) async {
      entered.complete();
      await release.future;
    });
    await entered.future;
    final calls = f.transport.requests.length;
    final queued = expectLater(
      f.repository.account(),
      throwsA(isA<ApiException>()),
    );
    f.now = f.now.add(const Duration(days: 2));
    release.complete();
    await blocker;
    await queued;
    expect(f.transport.requests.length, calls);
  });
  test(
    'resume independently verifies identity; changed identity is rejected',
    () async {
      await f.signIn();
      await f.controller.revalidateSession();
      expect(f.controller.verified, true);
      f.transport.identity = 'different-user';
      await f.controller.revalidateSession();
      expect(f.controller.verified, false);
    },
  );
  test(
    'failed server logout still clears local authority without claiming revocation',
    () async {
      await f.signIn();
      f.transport.reply = (_) => json({'error': 'unavailable'}, 503);
      expect(await f.controller.signOut(), false);
      expect(f.controller.verified, false);
      expect(
        f.coordinator.hasProtocolCookie('__Secure-authjs.session-token'),
        false,
      );
      expect(f.transport.requests.last.uri.path, '/api/auth/signout');
    },
  );
  test(
    'shortlist and enquiry requests require their actual server acknowledgment',
    () async {
      await f.signIn();
      f.transport.reply = (_) => json({
        'shortlist': {'id': 'shortlist-0001'},
      });
      await f.repository.shortlist(null, 'My homes');
      f.transport.reply = (_) => json({'added': true});
      await f.repository.membership('shortlist-0001', 'property-0001', true);
      f.transport.reply = (_) => json({
        'ok': true,
        'lead': {'id': 'lead-0001'},
      });
      await f.repository.enquire(
        'property-0001',
        'Synthetic buyer',
        '+910000000000',
        'Synthetic enquiry',
      );
      final body = jsonDecode(f.transport.requests.last.body!) as Map;
      expect(body['contactAction'], 'INQUIRY');
      expect(body.containsKey('userId'), false);
      f.transport.reply = (_) => json({'ok': true});
      await expectLater(
        f.repository.enquire(
          'property-0001',
          'Synthetic buyer',
          '+910000000000',
          'Synthetic enquiry',
        ),
        throwsA(isA<ApiException>()),
      );
    },
  );
  test(
    'media policy rejects unapproved origins, ports, credentials and ambiguous URLs',
    () {
      expect(
        ListingMedia.allowed(
          'https://photos.example.invalid/one.jpg',
          'photos.example.invalid',
        ),
        true,
      );
      for (final url in [
        'http://photos.example.invalid/a',
        'https://evil.example.invalid/a',
        'https://photos.example.invalid.evil.invalid/a',
        'https://user@photos.example.invalid/a',
        'https://photos.example.invalid:8443/a',
        'https://photos.example.invalid/a#fragment',
      ]) {
        expect(ListingMedia.allowed(url, 'photos.example.invalid'), false);
      }
    },
  );
  testWidgets('live draft filters preserve Cancel and Reset until Apply', (
    tester,
  ) async {
    Map<String, String>? result;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                result = await showModalBottomSheet<Map<String, String>>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const LiveFilterSheet(
                    initial: {
                      'keyword': 'home',
                      'city': 'Kochi',
                      'purpose': 'RENT',
                      'currency': 'INR',
                      'maxPrice': '10000',
                    },
                  ),
                );
              },
              child: const Text('Open filters'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open filters'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Reset'));
    await tester.tap(find.text('Reset'));
    await tester.pumpAndSettle();
    expect(find.text('Kochi'), findsNothing);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(result, isNull);
    await tester.tap(find.text('Open filters'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Reset'));
    await tester.tap(find.text('Reset'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Apply'));
    await tester.pumpAndSettle();
    expect(result, {'keyword': 'home'});
  });
  testWidgets(
    'unconfigured media has a visible fallback without sending requests',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ListingImage(
              url: 'https://unapproved.example.invalid/image.jpg',
            ),
          ),
        ),
      );
      expect(find.text('Image unavailable'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  test(
    'listing projection rejects malformed facts and omits unrelated response fields',
    () {
      for (final extra in [
        {
          'price': {'private': 'SYNTHETIC'},
        },
        {'latitude': 91},
        {'bedrooms': 1.5},
        {
          'mediaUrls': [1],
        },
      ]) {
        expect(
          () => Listing.parse({...sample, ...extra}),
          throwsA(isA<ApiException>()),
        );
      }
      expect(
        Listing.parse({
          ...sample,
          'internalNotes': 'SYNTHETIC',
        }).data.containsKey('internalNotes'),
        false,
      );
    },
  );
  test(
    'allowed media cannot follow a redirect to bypass its host restriction',
    () async {
      final client = MediaClient();
      await HttpOverrides.runZoned(() async {
        await expectLater(
          ListingMedia.load(
            'https://photos.example.invalid/image',
            'photos.example.invalid',
          ),
          throwsA(isA<FormatException>()),
        );
      }, createHttpClient: (_) => client);
      expect(client.request.followRedirects, false);
    },
  );
  testWidgets(
    'service tabs and saves use acknowledged account data, never demo inventory',
    (tester) async {
      f.controller.dispose();
      f = Fixture();
      final signIn = f.controller.beginSignIn(
        'synthetic@example.invalid',
        'SyntheticPassword123',
      );
      await tester.pump();
      expect((await signIn.result).verified, true);
      var saved = false;
      f.transport.reply = (request) {
        if (request.uri.path == '/api/mobile/properties') {
          return json({
            'source': 'database',
            'page': 1,
            'hasMore': false,
            'properties': [sample],
          });
        }
        if (request.uri.path.endsWith('/save')) {
          if (request.method == 'GET') return json({'saved': saved});
          saved = request.method == 'POST';
          return json({'saved': saved});
        }
        if (request.uri.path == '/api/mobile/saved-status') {
          return json({'propertyId': sample['id'], 'saved': saved});
        }
        if (request.uri.path == '/api/mobile/account/collections') {
          final collection = request.uri.queryParameters['collection'];
          return json({
            'collection': collection,
            'parent': null,
            'items': collection == 'saved' && saved ? [sample] : [],
            'nextCursor': null,
          });
        }
        return json({
          'profile': {'fullName': 'Synthetic Buyer'},
          'saved': saved ? [sample] : [],
          'shortlists': [],
          'enquiries': [],
        });
      };
      await tester.pumpWidget(
        MaterialApp(home: MarketplaceScreen(repository: f.repository)),
      );
      await tester.pumpAndSettle();
      expect(find.text('Synthetic home'), findsOneWidget);
      await tester.ensureVisible(find.text('Toggle saved property'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Toggle saved property'));
      await tester.pumpAndSettle();
      expect(saved, true);
      await tester.tap(find.byType(NavigationDestination).at(2));
      await tester.pumpAndSettle();
      expect(find.text('Saved & Shortlists'), findsOneWidget);
      expect(find.text('Synthetic home'), findsOneWidget);
      await tester.tap(find.byType(NavigationDestination).at(3));
      await tester.pumpAndSettle();
      expect(
        find.text('No enquiries yet. Open a property to enquire.'),
        findsOneWidget,
      );
      await tester.tap(find.byType(NavigationDestination).at(4));
      await tester.pumpAndSettle();
      expect(find.text('Synthetic Buyer'), findsOneWidget);
      f.controller.clearLocalSession();
      await tester.pumpAndSettle();
      expect(find.text('Synthetic Buyer'), findsNothing);
      expect(
        find.text(
          'Sign in to access your account. Offline preview data is separate.',
        ),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('disposed marketplace ignores a delayed catalog response', (
    tester,
  ) async {
    f.controller.dispose();
    f = Fixture();
    final response = Completer<ApiResponse>();
    f.transport.reply = (_) => response.future;
    await tester.pumpWidget(
      MaterialApp(home: MarketplaceScreen(repository: f.repository)),
    );
    await tester.pump();
    await tester.pumpWidget(const SizedBox());
    response.complete(
      json({
        'source': 'database',
        'page': 1,
        'hasMore': false,
        'properties': [sample],
      }),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
  for (final brightness in Brightness.values) {
    testWidgets(
      'service discovery supports narrow large text in ${brightness.name}',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        f.controller.dispose();
        f = Fixture();
        f.transport.reply = (_) => json({
          'source': 'database',
          'page': 1,
          'hasMore': false,
          'properties': [sample],
        });
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData(brightness: brightness),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: MarketplaceScreen(repository: f.repository),
          ),
        );
        await tester.pumpAndSettle();
        await tester.drag(find.byType(ListView).first, const Offset(0, -500));
        await tester.pumpAndSettle();
        expect(find.text('Synthetic home'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}
