import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/features/marketplace/listing_realtime.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';

import 'marketplace_test.dart' as fixture;

class _LocalFixtureHttpOverrides extends HttpOverrides {}

class _RecordingUpgradeClient implements HttpClient {
  final opened = Completer<Uri>();
  String? method;
  @override
  set connectionTimeout(Duration? value) {}
  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async {
    this.method = method;
    if (!opened.isCompleted) opened.complete(url);
    throw StateError('Synthetic upgrade stopped before IO');
  }

  @override
  void close({bool force = false}) {}
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _RecordingUpgradeOverrides extends HttpOverrides {
  _RecordingUpgradeOverrides(this.client);
  final HttpClient client;
  @override
  HttpClient createHttpClient(SecurityContext? context) => client;
}

class FakeListingConnection implements ListingRealtimeConnection {
  final frames = StreamController<Object?>.broadcast(sync: true);
  var closed = false;
  @override
  Stream<Object?> get messages => frames.stream;
  void ready() => frames.add('{"v":1,"type":"ready"}');
  void changed() => frames.add('{"v":1,"type":"properties.changed"}');
  @override
  Future<void> close() async {
    closed = true;
    await frames.close();
  }
}

void main() {
  final configuration = ApiConfiguration(
    'https://homezone-staging.up.railway.app',
    environment: ApiEnvironment.staging,
  );

  testWidgets(
    'one anonymous socket is shared until the last visible lease ends',
    (tester) async {
      final connections = <FakeListingConnection>[];
      final requested = <Uri>[];
      final client = ListingRealtime(
        configuration: configuration,
        connector: (uri) async {
          requested.add(uri);
          final connection = FakeListingConnection();
          connections.add(connection);
          return connection;
        },
      );
      final first = Object(), second = Object();
      client.acquire(first);
      client.acquire(first);
      client.acquire(second);
      await tester.pump();
      expect(
        requested.single.toString(),
        'wss://homezone-staging.up.railway.app/api/mobile/properties/live',
      );
      expect(requested.single.userInfo, isEmpty);
      expect(requested.single.hasQuery, false);
      connections.single.ready();
      await tester.pump(const Duration(milliseconds: 200));
      expect(client.ready, true);
      expect(client.changes.value, 1);
      client.release(first);
      expect(connections.single.closed, false);
      client.release(second);
      await tester.pump();
      expect(connections.single.closed, true);
      expect(client.ready, false);
      await tester.pump(const Duration(minutes: 1));
      expect(requested.length, 1);
      client.dispose();
    },
  );

  testWidgets('ready and burst hints coalesce and never contain listing data', (
    tester,
  ) async {
    final connection = FakeListingConnection();
    final client = ListingRealtime(
      configuration: configuration,
      connector: (_) async => connection,
    );
    client.acquire(Object());
    await tester.pump();
    connection.ready();
    for (var index = 0; index < 50; index++) {
      connection.changed();
    }
    await tester.pump(const Duration(milliseconds: 199));
    expect(client.changes.value, 0);
    await tester.pump(const Duration(milliseconds: 1));
    expect(client.changes.value, 1);
    connection.changed();
    await tester.pump(const Duration(milliseconds: 200));
    expect(client.changes.value, 2);
    client.dispose();
    await tester.pump();
  });

  for (final badFrame in <Object?>[
    'not-json',
    '{"v":2,"type":"ready"}',
    '{"v":1.0,"type":"ready"}',
    '{"v":1,"type":"ready","propertyId":"private-record"}',
    '{"v":1,"type":"account.changed"}',
    '{"v":1,"type":"properties.changed"}',
    List<int>.filled(8, 1),
    'x' * 129,
  ]) {
    testWidgets(
      'malformed or unsolicited frame closes without exposing data: $badFrame',
      (tester) async {
        final connection = FakeListingConnection();
        final client = ListingRealtime(
          configuration: configuration,
          connector: (_) async => connection,
        );
        client.acquire(Object());
        await tester.pump();
        connection.frames.add(badFrame);
        await tester.pump();
        expect(connection.closed, true);
        expect(client.ready, false);
        expect(client.changes.value, 0);
        client.dispose();
        await tester.pump();
      },
    );
  }

  testWidgets(
    'disconnect reconnects with bounded backoff and ready catches up',
    (tester) async {
      final connections = <FakeListingConnection>[];
      final client = ListingRealtime(
        configuration: configuration,
        randomFraction: () => 0,
        connector: (_) async {
          final connection = FakeListingConnection();
          connections.add(connection);
          return connection;
        },
      );
      final lease = Object();
      client.acquire(lease);
      await tester.pump();
      connections.single.ready();
      await tester.pump(const Duration(milliseconds: 200));
      unawaited(connections.single.frames.close());
      await tester.pump();
      expect(client.ready, false);
      await tester.pump(const Duration(milliseconds: 999));
      expect(connections.length, 1);
      await tester.pump(const Duration(milliseconds: 1));
      expect(connections.length, 2);
      connections.last.ready();
      await tester.pump(const Duration(milliseconds: 200));
      expect(client.ready, true);
      expect(client.changes.value, 2);
      client.release(lease);
      client.dispose();
      await tester.pump();
    },
  );

  testWidgets('connection and ready deadlines retain polling fallback', (
    tester,
  ) async {
    final pending = Completer<ListingRealtimeConnection>();
    final lateConnection = FakeListingConnection();
    final nextConnection = FakeListingConnection();
    var attempts = 0;
    final client = ListingRealtime(
      configuration: configuration,
      randomFraction: () => 0,
      connector: (_) =>
          ++attempts == 1 ? pending.future : Future.value(nextConnection),
    );
    client.acquire(Object());
    await tester.pump(const Duration(seconds: 8));
    expect(client.ready, false);
    pending.complete(lateConnection);
    await tester.pump();
    expect(lateConnection.closed, true);
    await tester.pump(const Duration(seconds: 1));
    expect(attempts, 2);
    await tester.pump(const Duration(seconds: 8));
    expect(nextConnection.closed, true);
    expect(client.changes.value, 0);
    client.dispose();
    await tester.pump();
  });

  testWidgets(
    'dispose and stale connecting generations cannot reopen sockets',
    (tester) async {
      final pending = Completer<ListingRealtimeConnection>();
      final connection = FakeListingConnection();
      final client = ListingRealtime(
        configuration: configuration,
        connector: (_) => pending.future,
      );
      client.acquire(Object());
      client.dispose();
      pending.complete(connection);
      await tester.pump();
      expect(connection.closed, true);
      expect(client.ready, false);
      await tester.pump(const Duration(minutes: 1));
    },
  );

  test(
    'repository rejects realtime clients for a different origin/environment',
    () {
      final f = fixture.Fixture();
      final client = ListingRealtime(configuration: configuration);
      expect(
        () => MarketplaceRepository(
          client: f.client,
          coordinator: f.coordinator,
          session: f.controller,
          realtime: client,
        ),
        throwsA(isA<ApiConfigurationException>()),
      );
      client.dispose();
      f.controller.dispose();
    },
  );

  for (final target in [
    (configuration, 443),
    (
      ApiConfiguration(
        'http://localhost',
        environment: ApiEnvironment.development,
      ),
      80,
    ),
  ]) {
    test(
      'native upgrade pins implicit default port ${target.$2} without network IO',
      () async {
        final transport = _RecordingUpgradeClient();
        await HttpOverrides.runWithHttpOverrides(() async {
          final client = ListingRealtime(configuration: target.$1);
          try {
            client.acquire(Object());
            final uri = await transport.opened.future.timeout(
              const Duration(seconds: 2),
            );
            expect(transport.method, 'GET');
            expect(uri.scheme, target.$1.baseUri.scheme);
            expect(uri.host, target.$1.baseUri.host);
            expect(uri.port, target.$2);
            expect(uri.path, '/api/mobile/properties/live');
            expect(uri.hasQuery, false);
            expect(uri.hasFragment, false);
            expect(uri.userInfo, isEmpty);
          } finally {
            client.dispose();
          }
        }, _RecordingUpgradeOverrides(transport));
      },
    );
  }

  test(
    'native upgrade rejects redirects and sends no authentication headers',
    () async {
      await HttpOverrides.runWithHttpOverrides(() async {
        final redirect = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
        final destination = await HttpServer.bind(
          InternetAddress.loopbackIPv4,
          0,
        );
        var reachedDestination = false;
        var requests = 0;
        final observed = Completer<void>();
        destination.listen((request) async {
          reachedDestination = true;
          await request.response.close();
        });
        redirect.listen((request) async {
          requests++;
          expect(request.method, 'GET');
          expect(request.uri.path, '/api/mobile/properties/live');
          expect(request.headers.value('cookie'), isNull);
          expect(request.headers.value('authorization'), isNull);
          expect(request.uri.hasQuery, false);
          request.response.statusCode = HttpStatus.found;
          request.response.headers.set(
            'location',
            'http://127.0.0.1:${destination.port}/api/mobile/properties/live',
          );
          await request.response.close();
          if (!observed.isCompleted) observed.complete();
        });
        final client = ListingRealtime(
          configuration: ApiConfiguration(
            'http://127.0.0.1:${redirect.port}',
            environment: ApiEnvironment.development,
          ),
        );
        try {
          client.acquire(Object());
          await observed.future.timeout(const Duration(seconds: 5));
          await Future<void>.delayed(const Duration(milliseconds: 80));
          expect(requests, 1);
          expect(reachedDestination, false);
          expect(client.ready, false);
        } finally {
          client.dispose();
          await redirect.close(force: true);
          await destination.close(force: true);
        }
      }, _LocalFixtureHttpOverrides());
    },
  );

  test(
    'native loopback upgrade receives bounded hints with no client data writes',
    () async {
      await HttpOverrides.runWithHttpOverrides(() async {
        final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
        final clientFrames = <Object?>[];
        final connection = Completer<WebSocket>();
        server.listen((request) async {
          expect(request.headers.value('cookie'), isNull);
          expect(request.headers.value('authorization'), isNull);
          final socket = await WebSocketTransformer.upgrade(request);
          socket.listen(clientFrames.add);
          socket.add('{"v":1,"type":"ready"}');
          socket.add('{"v":1,"type":"properties.changed"}');
          connection.complete(socket);
        });
        final client = ListingRealtime(
          configuration: ApiConfiguration(
            'http://127.0.0.1:${server.port}',
            environment: ApiEnvironment.development,
          ),
        );
        final observed = Completer<void>();
        client.changes.addListener(() {
          if (!observed.isCompleted) observed.complete();
        });
        try {
          client.acquire(Object());
          await observed.future.timeout(const Duration(seconds: 5));
          expect(client.ready, true);
          expect(client.changes.value, 1);
          expect(clientFrames, isEmpty);
        } finally {
          client.dispose();
          if (connection.isCompleted) await (await connection.future).close();
          await server.close(force: true);
        }
      }, _LocalFixtureHttpOverrides());
    },
  );

  test('only explicit development loopback can map HTTP to ws', () {
    final local = ListingRealtime(
      configuration: ApiConfiguration(
        'http://127.0.0.1:3000',
        environment: ApiEnvironment.development,
      ),
    );
    expect(
      local.uri.toString(),
      'ws://127.0.0.1:3000/api/mobile/properties/live',
    );
    local.dispose();
    expect(
      () => ApiConfiguration(
        'http://example.invalid',
        environment: ApiEnvironment.staging,
      ),
      throwsA(isA<ApiConfigurationException>()),
    );
  });
}
