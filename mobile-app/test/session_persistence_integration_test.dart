import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/core/api/session_vault.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';

import 'email_auth_role_flow_test.dart' show RoleFlowTransport;

// The native secure-storage channel and HTTP transport are replaced in-process.
// This verifies protocol integration, not Android Keystore or live staging.
class PersistenceTransport extends RoleFlowTransport {
  PersistenceTransport(super.role);
  bool failSignOut = false;

  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) {
    if (request.uri.path == '/api/auth/callback/password') {
      requests.add(request);
      // Auth.js supplies an expiry for persistent sessions. The cookie store
      // intentionally refuses to persist unbounded session-only cookies.
      return Future.value(
        const ApiResponse(
          200,
          '{"url":"/"}',
          headers: {
            'set-cookie': [
              '__Secure-authjs.session-token=FAKE-JWE.synthetic-persistent; Max-Age=3600; Path=/; Secure; HttpOnly',
            ],
          },
        ),
      );
    }
    if (request.uri.path == '/api/auth/session' &&
        !(request.headers['cookie']?.contains(
              '__Secure-authjs.session-token=FAKE-JWE.synthetic-persistent',
            ) ??
            false)) {
      requests.add(request);
      return Future.value(const ApiResponse(200, 'null'));
    }
    if (failSignOut && request.uri.path == '/api/auth/signout') {
      requests.add(request);
      return Future.value(const ApiResponse(503, '{}'));
    }
    return super.send(request, timeout, onHeaders: onHeaders);
  }
}

class PersistenceHarness {
  PersistenceHarness(this.configuration, {String role = 'OWNER'}) {
    transport = PersistenceTransport(role);
    client = ApiClient(configuration: configuration, transport: transport);
    coordinator = CookieRequestCoordinator(
      configuration: configuration,
      clock: DateTime.now,
    );
    controller = SignInController(
      PasswordAuthProtocol(client: client, coordinator: coordinator),
      vault: SessionVault(scope),
    );
    repository = MarketplaceRepository(
      client: client,
      coordinator: coordinator,
      session: controller,
    );
  }

  final ApiConfiguration configuration;
  String get scope =>
      '${configuration.environment.name}:${configuration.baseUri.origin}';
  late final PersistenceTransport transport;
  late final ApiClient client;
  late final CookieRequestCoordinator coordinator;
  late final SignInController controller;
  late final MarketplaceRepository repository;

  void dispose() {
    repository.dispose();
    controller.dispose();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('homezone/session-vault');
  final storage = <String, String>{};
  var fixture = 0;

  setUp(() {
    storage.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          final arguments = Map<String, dynamic>.from(call.arguments as Map);
          final scope = arguments['scope'] as String;
          switch (call.method) {
            case 'read':
              return storage[scope];
            case 'write':
              storage[scope] = arguments['value'] as String;
              return null;
            case 'delete':
              storage.remove(scope);
              return null;
          }
          throw MissingPluginException();
        });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  ApiConfiguration configuration() => ApiConfiguration(
    'https://session-${fixture++}.example.invalid',
    environment: ApiEnvironment.staging,
  );

  Future<void> signIn(PersistenceHarness harness) async {
    final outcome = await harness.controller
        .beginSignIn('synthetic@example.invalid', 'SyntheticOnly123')
        .result;
    expect(outcome.verified, isTrue);
    expect(harness.controller.identity?.role, 'OWNER');
  }

  test(
    'stored cookie restores only after independent session and profile checks',
    () async {
      final original = PersistenceHarness(configuration());
      await signIn(original);
      final stored = storage[original.scope];
      expect(stored, isNotNull);
      expect(jsonDecode(stored!), isA<List<dynamic>>());
      expect(stored, contains('__Secure-authjs.session-token='));
      expect(stored, isNot(contains('SyntheticOnly123')));
      expect(stored, isNot(contains('synthetic@example.invalid')));
      expect(stored, isNot(contains('OWNER')));

      // A new process owns a new coordinator and storage lease. The old owner's
      // cleanup cannot erase the new owner's persisted credentials.
      final restored = PersistenceHarness(original.configuration);
      original.dispose();
      addTearDown(restored.dispose);
      expect(restored.controller.verified, isFalse);
      await restored.controller.restoreSession();
      expect(restored.transport.requests.map((request) => request.uri.path), [
        '/api/auth/session',
      ]);
      expect(
        restored.transport.requests.single.headers['cookie'],
        contains('__Secure-authjs.session-token='),
      );
      expect(restored.controller.verified, isTrue);
      expect(restored.controller.identity?.role, 'OWNER');
      final profile = await restored.repository.confirmedProfile();
      expect(profile['role'], 'OWNER');
      final request = restored.transport.requests.last;
      expect(request.uri.path, '/api/mobile/account');
      expect(request.uri.queryParameters['view'], 'profile');
      expect(
        request.headers['cookie'],
        contains('__Secure-authjs.session-token='),
      );
    },
  );

  test(
    'a revoked stored session cannot restore identity or reach protected APIs',
    () async {
      final original = PersistenceHarness(configuration());
      await signIn(original);
      final restored = PersistenceHarness(original.configuration);
      original.dispose();
      addTearDown(restored.dispose);
      restored.transport.signedOut = true;
      await restored.controller.restoreSession();
      await Future<void>.delayed(Duration.zero);
      expect(restored.controller.verified, isFalse);
      expect(storage.containsKey(restored.scope), isFalse);
      await expectLater(
        restored.repository.confirmedProfile(),
        throwsA(isA<ApiException>()),
      );
      expect(restored.transport.requests.map((request) => request.uri.path), [
        '/api/auth/session',
      ]);
    },
  );

  test(
    'session cookies are isolated by backend origin and environment',
    () async {
      final original = PersistenceHarness(configuration());
      await signIn(original);
      addTearDown(original.dispose);
      final other = PersistenceHarness(configuration());
      addTearDown(other.dispose);
      await other.controller.restoreSession();
      expect(other.controller.verified, isFalse);
      expect(other.transport.requests, isEmpty);
      expect(storage.containsKey(original.scope), isTrue);

      final otherEnvironment = PersistenceHarness(
        ApiConfiguration(
          original.configuration.baseUri.origin,
          environment: ApiEnvironment.production,
        ),
      );
      addTearDown(otherEnvironment.dispose);
      await otherEnvironment.controller.restoreSession();
      expect(otherEnvironment.controller.verified, isFalse);
      expect(otherEnvironment.transport.requests, isEmpty);
      expect(storage.containsKey(original.scope), isTrue);
    },
  );

  for (final failedRevocation in [false, true]) {
    test(
      'logout clears local authority and storage with revocation failure=$failedRevocation',
      () async {
        final harness = PersistenceHarness(configuration());
        addTearDown(harness.dispose);
        await signIn(harness);
        harness.transport.failSignOut = failedRevocation;
        expect(await harness.controller.signOut(), !failedRevocation);
        expect(harness.controller.verified, isFalse);
        expect(harness.controller.credentialRemovalConfirmed, isTrue);
        expect(storage.containsKey(harness.scope), isFalse);
        final signOut = harness.transport.requests
            .where((request) => request.uri.path == '/api/auth/signout')
            .single;
        expect(signOut.method, 'POST');
        expect(Uri.splitQueryString(signOut.body!)['csrfToken'], 'a' * 64);
        expect(
          signOut.headers['cookie'],
          contains('__Secure-authjs.session-token='),
        );
        final count = harness.transport.requests.length;
        await expectLater(
          harness.repository.confirmedProfile(),
          throwsA(isA<ApiException>()),
        );
        expect(harness.transport.requests, hasLength(count));
      },
    );
  }
}
