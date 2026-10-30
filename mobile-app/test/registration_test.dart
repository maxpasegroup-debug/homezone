import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/homezone_app.dart';
import 'package:homezone_mobile/app/session_scope.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/marketplace/registration_screen.dart';
import 'marketplace_test.dart' show FixtureTransport, json;

class RegistrationTransport extends FixtureTransport {
  bool invalidSession = false, deliveryFailure = false;
  ApiResponse? startResponse;
  ApiResponse? resendResponse;
  DateTime Function()? clock;
  bool simulateTimeout = false;
  int starts = 0, verifies = 0, resends = 0;
  Completer<ApiResponse>? verification, sessionResponse;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    final path = request.uri.path;
    if (path.contains('/signup')) {
      requests.add(request);
      if (simulateTimeout) throw const ApiException(ApiFailure.timeout);
      if (path.endsWith('/verify')) {
        verifies++;
        return verification == null
            ? json({'verified': true})
            : verification!.future;
      }
      if (path.endsWith('/resend')) {
        resends++;
        if (resendResponse != null) return resendResponse!;
      } else {
        starts++;
      }
      return startResponse ??
          (deliveryFailure
              ? json({'error': 'SYNTHETIC_SENSITIVE_PROVIDER_BODY'}, 503)
              : json({
                  'challengeId': List.filled(
                    64,
                    path.endsWith('/resend') ? 'b' : 'a',
                  ).join(),
                  'expiresIn': 600,
                  'resendAfter': 60,
                  'expiresAt': (clock ?? DateTime.now)()
                      .toUtc()
                      .add(const Duration(minutes: 10))
                      .toIso8601String(),
                  'resendAt': (clock ?? DateTime.now)()
                      .toUtc()
                      .add(const Duration(seconds: 60))
                      .toIso8601String(),
                }, 202));
    }
    if (path == '/api/auth/session' &&
        (invalidSession || sessionResponse != null)) {
      requests.add(request);
      return sessionResponse == null ? json({}) : sessionResponse!.future;
    }
    if (path == '/api/mobile/properties') {
      requests.add(request);
      return json({
        'source': 'database',
        'page': 1,
        'hasMore': false,
        'properties': [],
      });
    }
    if (path == '/api/mobile/account') {
      return json({
        'savedProperties': [],
        'shortlists': [],
        'enquiries': [],
        'profile': {'role': 'USER', 'verificationStatus': 'PENDING'},
      });
    }
    return super.send(request, timeout, onHeaders: onHeaders);
  }
}

class RegistrationFixture {
  RegistrationFixture() {
    final configuration = ApiConfiguration(
      'https://fixture.example.invalid',
      environment: ApiEnvironment.staging,
    );
    final client = ApiClient(
      configuration: configuration,
      transport: transport,
    );
    coordinator = CookieRequestCoordinator(
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
  final transport = RegistrationTransport();
  late final CookieRequestCoordinator coordinator;
  late final SignInController controller;
  late final MarketplaceRepository repository;
  final observer = SessionRouteObserver();
  // Retained legacy component coverage only. Active service /sign-up is PIN-only
  // and must not be redirected back to email OTP just to satisfy old fixtures.
  Widget app() => SessionScope(
    controller: controller,
    routeObserver: observer,
    child: MaterialApp(
      navigatorObservers: [observer],
      home: RegistrationScreen(repository: repository),
      routes: {'/buyer': (_) => HomezoneApp(initialRoute: '/buyer',
        signInController: controller, marketplace: repository)},
    ),
  );
}

Future<void> tapText(WidgetTester tester, String text) async {
  if (find.text(text).evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      find.text(text),
      120,
      scrollable: find.byType(Scrollable).first,
    );
  }
  final target = find.text(text).last;
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pump();
}

Future<void> start(WidgetTester tester) async {
  for (final entry in <(String, String)>[
    ('Name', 'Fictional Buyer'),
    ('Email', 'buyer@fixture.invalid'),
    ('Password', 'SyntheticPass123'),
    ('Confirm password', 'SyntheticPass123'),
  ]) {
    final field = find.widgetWithText(TextFormField, entry.$1);
    await tester.scrollUntilVisible(
      field,
      120,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.enterText(field, entry.$2);
    await tester.pump();
  }
  await tapText(tester, 'Create account');
  await tester.pumpAndSettle();
}

Future<void> verify(WidgetTester tester) async {
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Verification code'),
    '123456',
  );
  await tapText(tester, 'Verify and continue');
}

void main() {
  testWidgets(
    'registration verification uses independent session before service home, never demo',
    (tester) async {
      final f = RegistrationFixture();
      f.transport.sessionResponse = Completer<ApiResponse>();
      await tester.pumpWidget(f.app());
      await start(tester);
      expect(f.controller.verified, false);
      await verify(tester);
      await tester.pump();
      expect(f.transport.verifies, 1);
      expect(f.controller.verified, false);
      expect(find.text('Discover a place'), findsNothing);
      f.transport.sessionResponse!.complete(
        json({
          'user': {
            'id': 'verified-buyer',
            'role': 'USER',
            'whatsappVerified': false,
          },
          'expires': DateTime.now()
              .toUtc()
              .add(const Duration(hours: 1))
              .toIso8601String(),
        }),
      );
      await tester.pumpAndSettle();
      expect(f.controller.verified, true);
      expect(find.text('Discover a place'), findsOneWidget);
      expect(
        find.text(
          'Service-backed listings. The offline preview is a separate experience.',
        ),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'callback acceptance with missing session never navigates or creates identity',
    (tester) async {
      final f = RegistrationFixture();
      f.transport.invalidSession = true;
      await tester.pumpWidget(f.app());
      await start(tester);
      await verify(tester);
      await tester.pumpAndSettle();
      expect(f.controller.verified, false);
      expect(find.text('Discover a place'), findsNothing);
      expect(find.textContaining('Email verified.'), findsOneWidget);
      expect(find.text('Retry secure sign-in'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'OTP failure cannot dispatch password callback; resend cooldown is local feedback',
    (tester) async {
      final f = RegistrationFixture();
      f.transport.verification = Completer<ApiResponse>();
      var now = DateTime.now();
      f.transport.clock = () => now;
      await tester.pumpWidget(
        MaterialApp(
          home: RegistrationScreen(repository: f.repository, clock: () => now),
        ),
      );
      addTearDown(f.controller.dispose);
      await start(tester);
      expect(find.textContaining('Resend available'), findsOneWidget);
      await verify(tester);
      await tester.pump();
      f.transport.verification!.complete(json({'error': 'private-body'}, 400));
      await tester.pumpAndSettle();
      expect(
        f.transport.requests.any((r) => r.uri.path.contains('/callback/')),
        false,
      );
      expect(f.controller.verified, false);
      expect(find.textContaining('incorrect, expired'), findsOneWidget);
      expect(find.textContaining('private-body'), findsNothing);
      now = now.add(const Duration(seconds: 61));
      await tester.pump(const Duration(seconds: 1));
      await tapText(tester, 'Resend code');
      await tester.pumpAndSettle();
      expect(f.transport.resends, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'delivery failure stays on create account and hides provider body',
    (tester) async {
      final f = RegistrationFixture();
      f.transport.deliveryFailure = true;
      await tester.pumpWidget(f.app());
      await start(tester);
      expect(f.transport.starts, 1);
      expect(f.controller.verified, false);
      expect(find.text('Verify your email'), findsNothing);
      expect(find.textContaining('SYNTHETIC_SENSITIVE'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'duplicate verification taps and disposed route cannot authenticate later',
    (tester) async {
      final f = RegistrationFixture();
      f.transport.verification = Completer<ApiResponse>();
      await tester.pumpWidget(f.app());
      await start(tester);
      await verify(tester);
      await tester.pump();
      expect(f.transport.verifies, 1);
      final context = tester.element(find.text('Verify your email'));
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => const Scaffold(body: Text('Left registration')),
        ),
      );
      await tester.pumpAndSettle();
      f.transport.verification!.complete(json({'verified': true}));
      await tester.pumpAndSettle();
      expect(f.controller.verified, false);
      expect(
        f.transport.requests.any((r) => r.uri.path.contains('/callback/')),
        false,
      );
      expect(find.text('Left registration'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  for (final brightness in Brightness.values) {
    testWidgets(
      'registration narrow layout supports enlarged text $brightness',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final f = RegistrationFixture();
        addTearDown(f.controller.dispose);
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData(brightness: brightness),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(2)),
              child: child!,
            ),
            home: RegistrationScreen(repository: f.repository),
          ),
        );
        expect(tester.takeException(), isNull);
        await start(tester);
        expect(find.text('Verify your email'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }
  testWidgets(
    'timeout and malformed bootstrap stay unauthenticated with safe retry',
    (tester) async {
      final f = RegistrationFixture();
      f.transport.simulateTimeout = true;
      await tester.pumpWidget(f.app());
      await start(tester);
      expect(f.controller.verified, false);
      expect(find.text('Verify your email'), findsNothing);
      f.transport.simulateTimeout = false;
      f.transport.startResponse = json({
        'challengeId': 'malformed',
        'expiresIn': 600,
        'resendAfter': 60,
      }, 202);
      await tapText(tester, 'Create account');
      await tester.pumpAndSettle();
      expect(f.controller.verified, false);
      expect(find.text('Verify your email'), findsNothing);
      expect(
        f.transport.requests.any((r) => r.uri.path.contains('/callback/')),
        false,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'resend publishes replacement ID and verification submits only that new ID',
    (tester) async {
      final f = RegistrationFixture();
      var now = DateTime.now();
      f.transport.clock = () => now;
      f.transport.invalidSession = true;
      addTearDown(f.controller.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: RegistrationScreen(repository: f.repository, clock: () => now),
        ),
      );
      await start(tester);
      now = now.add(const Duration(seconds: 60));
      await tester.pump(const Duration(seconds: 1));
      await tapText(tester, 'Resend code');
      await tester.pumpAndSettle();
      await verify(tester);
      await tester.pumpAndSettle();
      final request = f.transport.requests.singleWhere(
        (r) => r.uri.path.endsWith('/signup/verify'),
      );
      expect(
        (jsonDecode(request.body!) as Map)['challengeId'],
        List.filled(64, 'b').join(),
      );
      expect(f.controller.verified, false);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'server hourly retry disables both actions and restart cannot bypass it',
    (tester) async {
      final f = RegistrationFixture();
      var now = DateTime.now();
      f.transport.clock = () => now;
      f.transport.resendResponse = const ApiResponse(
        429,
        '{"error":"private-body"}',
        retryAfter: '3600',
      );
      addTearDown(f.controller.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: RegistrationScreen(repository: f.repository, clock: () => now),
        ),
      );
      await start(tester);
      now = now.add(const Duration(seconds: 60));
      await tester.pump(const Duration(seconds: 1));
      await tapText(tester, 'Resend code');
      await tester.pumpAndSettle();
      expect(find.text('Try again in 3600s'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Verify and continue'),
            )
            .onPressed,
        isNull,
      );
      await tapText(tester, 'Restart registration');
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create account'),
            )
            .onPressed,
        isNull,
      );
      now = now.add(const Duration(seconds: 3599));
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Try again in 1s'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create account'),
            )
            .onPressed,
        isNull,
      );
      now = now.add(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create account'),
            )
            .onPressed,
        isNotNull,
      );
      expect(f.transport.resends, 1);
      expect(find.textContaining('private-body'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'rate limit on initial registration uses an exact injected-clock countdown',
    (tester) async {
      final f = RegistrationFixture();
      var now = DateTime.now();
      f.transport.clock = () => now;
      f.transport.startResponse = const ApiResponse(
        429,
        '{}',
        retryAfter: '180',
      );
      addTearDown(f.controller.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: RegistrationScreen(repository: f.repository, clock: () => now),
        ),
      );
      await start(tester);
      expect(find.text('Try again in 180s'), findsOneWidget);
      expect(f.transport.starts, 1);
      now = now.add(const Duration(milliseconds: 179999));
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Try again in 1s'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create account'),
            )
            .onPressed,
        isNull,
      );
      now = now.add(const Duration(milliseconds: 1));
      await tester.pump(const Duration(seconds: 1));
      f.transport.startResponse = null;
      await tapText(tester, 'Create account');
      await tester.pumpAndSettle();
      expect(find.text('Verify your email'), findsOneWidget);
      expect(f.transport.starts, 2);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'malformed retry timing never becomes an invented short automatic retry',
    (tester) async {
      final f = RegistrationFixture();
      var now = DateTime.now();
      f.transport.clock = () => now;
      f.transport.startResponse = const ApiResponse(
        429,
        '{}',
        retryAfter: 'invalid',
      );
      addTearDown(f.controller.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: RegistrationScreen(repository: f.repository, clock: () => now),
        ),
      );
      await start(tester);
      expect(
        find.textContaining('wait time could not be confirmed'),
        findsOneWidget,
      );
      now = now.add(const Duration(days: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create account'),
            )
            .onPressed,
        isNull,
      );
      expect(f.transport.starts, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'authoritative expiry disables verify and resend and leaves restart available',
    (tester) async {
      final f = RegistrationFixture();
      var now = DateTime.now();
      f.transport.clock = () => now;
      f.transport.startResponse = json({
        'challengeId': List.filled(64, 'a').join(),
        'expiresIn': 2,
        'resendAfter': 60,
        'expiresAt': now
            .add(const Duration(seconds: 2))
            .toUtc()
            .toIso8601String(),
        'resendAt': now
            .add(const Duration(seconds: 60))
            .toUtc()
            .toIso8601String(),
      }, 202);
      addTearDown(f.controller.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: RegistrationScreen(repository: f.repository, clock: () => now),
        ),
      );
      await start(tester);
      now = now.add(const Duration(seconds: 2));
      await tester.pump(const Duration(seconds: 1));
      expect(find.textContaining('Code expired. Restart'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Verify and continue'),
            )
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<TextButton>(
              find.widgetWithText(TextButton, 'Restart required'),
            )
            .onPressed,
        isNull,
      );
      expect(f.transport.verifies, 0);
      expect(f.controller.verified, false);
      await tapText(tester, 'Restart registration');
      await tester.pumpAndSettle();
      expect(find.text('Create HOMEZONE account'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'missing authoritative timing fails closed without password submission',
    (tester) async {
      final f = RegistrationFixture();
      f.transport.startResponse = json({
        'challengeId': List.filled(64, 'a').join(),
        'expiresIn': 600,
        'resendAfter': 60,
      }, 202);
      await tester.pumpWidget(f.app());
      await start(tester);
      expect(find.text('Verify your email'), findsNothing);
      expect(f.controller.verified, false);
      expect(
        f.transport.requests.any((r) => r.uri.path.contains('/callback/')),
        false,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
