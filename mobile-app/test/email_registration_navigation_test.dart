import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/homezone_app.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_configuration.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/core/api/cookie_request_coordinator.dart';
import 'package:homezone_mobile/core/api/password_auth_protocol.dart';
import 'package:homezone_mobile/features/auth/sign_in_controller.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'widget_test.dart' as helpers;

// Offline contract fixtures. Passing these tests does not prove live staging
// registration, account creation, or dashboard availability.
class RegistrationNavigationTransport implements ApiTransport {
  RegistrationNavigationTransport({this.role = 'USER'});

  final String role;
  final requests = <ApiRequest>[];
  Future<ApiResponse> Function()? registration;
  Future<ApiResponse> Function()? callback;
  Future<ApiResponse> Function()? profile;
  bool signedOut = false;

  List<ApiRequest> requestsFor(String path) =>
      requests.where((request) => request.uri.path == path).toList();

  static const acknowledgment = ApiResponse(
    200,
    '{"message":"Continue with secure sign-in.","consentRecorded":false}',
  );

  ApiResponse profileResponse() => ApiResponse(
    200,
    jsonEncode({
      'profile': {
        'fullName': 'Registration fixture',
        'role': role,
        'verificationStatus': 'PENDING',
      },
      'saved': [],
      'shortlists': [],
      'enquiries': [],
    }),
  );

  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    requests.add(request);
    switch (request.uri.path) {
      case '/api/mobile/auth/email-register':
        return registration == null ? acknowledgment : registration!();
      case '/api/auth/csrf':
        return ApiResponse(
          200,
          jsonEncode({'csrfToken': 'a' * 64}),
          headers: {
            'set-cookie': [
              '__Host-authjs.csrf-token=${'a' * 64}%7C${'b' * 64}; Path=/; Secure; HttpOnly',
            ],
          },
        );
      case '/api/auth/callback/password':
        if (callback != null) return callback!();
        return const ApiResponse(
          200,
          '{"url":"/"}',
          headers: {
            'set-cookie': [
              '__Secure-authjs.session-token=FAKE-JWE.synthetic; Path=/; Secure; HttpOnly',
            ],
          },
        );
      case '/api/auth/session':
        return ApiResponse(
          200,
          jsonEncode(
            signedOut
                ? null
                : {
                    'user': {
                      'id': 'registration-fixture',
                      'role': role,
                      'whatsappVerified': false,
                    },
                    'expires': DateTime.now()
                        .toUtc()
                        .add(const Duration(days: 1))
                        .toIso8601String(),
                  },
          ),
        );
      case '/api/auth/signout':
        signedOut = true;
        return const ApiResponse(
          200,
          '{"url":"/"}',
          headers: {
            'set-cookie': [
              '__Secure-authjs.session-token=; Max-Age=0; Path=/; Secure; HttpOnly',
            ],
          },
        );
      case '/api/mobile/account':
        return profile == null ? profileResponse() : profile!();
      case '/api/mobile/properties':
        return const ApiResponse(
          200,
          '{"source":"database","properties":[],"page":1,"hasMore":false}',
        );
      default:
        throw const ApiException(ApiFailure.invalidRequest);
    }
  }

  @override
  void close() {}
}

void main() {
  const roles = {
    'USER': 'Property Buyer',
    'OWNER': 'Property Owner',
    'BROKER': 'Broker',
    'BUILDER': 'Builder',
    'SERVICE_PROVIDER': 'Service Provider',
  };
  const submittedEmail = 'registration.fixture@example.com';
  const submittedPassword = 'SyntheticOnly123';

  Future<SignInController> prepare(
    WidgetTester tester,
    RegistrationNavigationTransport transport, {
    String selectedRole = 'USER',
  }) async {
    final configuration = ApiConfiguration(
      'https://approved.example.com',
      environment: ApiEnvironment.staging,
    );
    final client = ApiClient(
      configuration: configuration,
      transport: transport,
    );
    final coordinator = CookieRequestCoordinator(
      configuration: configuration,
      clock: DateTime.now,
    );
    final controller = SignInController(
      PasswordAuthProtocol(client: client, coordinator: coordinator),
    );
    final repository = MarketplaceRepository(
      client: client,
      coordinator: coordinator,
      session: controller,
    );
    await tester.pumpWidget(
      HomezoneApp(
        initialRoute: '/roles',
        signInController: controller,
        marketplace: repository,
      ),
    );
    await helpers.tapText(tester, roles[selectedRole]!);
    await helpers.tapText(tester, 'Continue');
    await helpers.fill(tester, 'Full name', 'Registration fixture');
    // Normalization must happen once for the same registration/sign-in pair.
    await helpers.fill(
      tester,
      'Email address',
      '  Registration.Fixture@example.com  ',
    );
    await helpers.fill(tester, 'Password', submittedPassword);
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byType(CheckboxListTile));
    await tester.tap(find.byType(CheckboxListTile));
    await tester.pumpAndSettle();
    return controller;
  }

  Future<void> submit(WidgetTester tester) async {
    await tester.ensureVisible(
      find.widgetWithText(FilledButton, 'Create Account'),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Create Account'));
    await tester.pump();
  }

  void expectNoDashboard() {
    expect(find.byType(MarketplaceScreen), findsNothing);
    expect(find.byType(WorkspaceScreen), findsNothing);
  }

  for (final role in roles.keys) {
    testWidgets(
      '$role registration authenticates and opens its confirmed dashboard without another tap',
      (tester) async {
        final transport = RegistrationNavigationTransport(role: role);
        final controller = await prepare(tester, transport, selectedRole: role);
        await submit(tester);
        await tester.pumpAndSettle();

        final registrations = transport.requestsFor(
          '/api/mobile/auth/email-register',
        );
        expect(registrations, hasLength(1));
        expect(jsonDecode(registrations.single.body!), {
          'name': 'Registration fixture',
          'email': submittedEmail,
          'password': submittedPassword,
          'role': role,
          'termsAccepted': true,
        });
        final callbacks = transport.requestsFor('/api/auth/callback/password');
        expect(callbacks, hasLength(1));
        final login = Uri.splitQueryString(callbacks.single.body!);
        expect(login['email'], submittedEmail);
        expect(login['password'], submittedPassword);
        expect(transport.requestsFor('/api/auth/session'), isNotEmpty);
        expect(
          transport
              .requestsFor('/api/mobile/account')
              .any(
                (request) => request.uri.queryParameters['view'] == 'profile',
              ),
          isTrue,
        );
        expect(controller.verified, isTrue);
        expect(controller.identity!.role, role);
        expect(
          find.byType(MarketplaceScreen),
          role == 'USER' ? findsOneWidget : findsNothing,
        );
        expect(
          find.byType(WorkspaceScreen),
          role == 'USER' ? findsNothing : findsOneWidget,
        );
        expect(
          transport.requests.any((request) => request.method == 'PATCH'),
          isFalse,
        );
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets(
    'registration stays busy through independent profile confirmation and cannot submit twice',
    (tester) async {
      final finishRegistration = Completer<ApiResponse>();
      final finishProfile = Completer<ApiResponse>();
      final transport = RegistrationNavigationTransport()
        ..registration = (() => finishRegistration.future)
        ..profile = (() => finishProfile.future);
      final controller = await prepare(tester, transport);
      await submit(tester);
      expectNoDashboard();
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );
      expect(transport.requestsFor('/api/auth/callback/password'), isEmpty);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton).first).onPressed,
        isNull,
      );
      await tester.tap(find.byType(FilledButton).first);
      await tester.pump();
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );

      finishRegistration.complete(
        RegistrationNavigationTransport.acknowledgment,
      );
      await tester.pump(const Duration(milliseconds: 50));
      expect(
        transport.requestsFor('/api/auth/callback/password'),
        hasLength(1),
      );
      expectNoDashboard();
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton).first).onPressed,
        isNull,
      );
      finishProfile.complete(transport.profileResponse());
      await tester.pumpAndSettle();
      expect(controller.verified, isTrue);
      expect(find.byType(MarketplaceScreen), findsOneWidget);
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'generic acknowledgment followed by failed authentication stays recoverable without recreating an account',
    (tester) async {
      final transport = RegistrationNavigationTransport()
        ..callback = (() async =>
            const ApiResponse(200, '{"url":"/auth?error=CredentialsSignin"}'));
      final controller = await prepare(tester, transport);
      await submit(tester);
      await tester.pumpAndSettle();
      expect(controller.verified, isFalse);
      expectNoDashboard();
      expect(
        find.textContaining(
          'Registration was submitted, but sign-in could not be confirmed.',
        ),
        findsOneWidget,
      );
      expect(find.text('Continue to Sign In'), findsOneWidget);
      final create = find.widgetWithText(FilledButton, 'Create Account');
      expect(tester.widget<FilledButton>(create).onPressed, isNull);
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );
      await helpers.tapText(tester, 'Continue to Sign In');
      expect(find.text('Welcome Back'), findsOneWidget);
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'delayed acknowledgment signs in only with the credentials captured for that submission',
    (tester) async {
      final finish = Completer<ApiResponse>();
      final transport = RegistrationNavigationTransport()
        ..registration = (() => finish.future);
      final controller = await prepare(tester, transport);
      await submit(tester);
      // Even an autofill/controller update while inputs are disabled must not
      // substitute different credentials after the server acknowledges signup.
      tester
              .widget<TextFormField>(
                find.widgetWithText(TextFormField, 'Email address'),
              )
              .controller!
              .text =
          'different@example.com';
      tester
              .widget<TextFormField>(
                find.widgetWithText(TextFormField, 'Password'),
              )
              .controller!
              .text =
          'DifferentSynthetic456';
      finish.complete(RegistrationNavigationTransport.acknowledgment);
      await tester.pumpAndSettle();
      expect(controller.verified, isTrue);
      final registration =
          jsonDecode(
                transport
                    .requestsFor('/api/mobile/auth/email-register')
                    .single
                    .body!,
              )
              as Map<String, dynamic>;
      final callback = Uri.splitQueryString(
        transport.requestsFor('/api/auth/callback/password').single.body!,
      );
      expect(callback['email'], registration['email']);
      expect(callback['password'], registration['password']);
      expect(callback['email'], submittedEmail);
      expect(callback['password'], submittedPassword);
      expect(find.byType(MarketplaceScreen), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'failed profile confirmation cannot open a dashboard or repeat registration',
    (tester) async {
      final transport = RegistrationNavigationTransport()
        ..profile = (() async => const ApiResponse(503, '{}'));
      final controller = await prepare(tester, transport);
      await submit(tester);
      await tester.pumpAndSettle();
      expect(controller.verified, isFalse);
      expect(transport.signedOut, isTrue);
      expectNoDashboard();
      expect(
        find.textContaining(
          'Registration was submitted, but sign-in could not be confirmed.',
        ),
        findsOneWidget,
      );
      expect(find.text('Continue to Sign In'), findsOneWidget);
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create Account'),
            )
            .onPressed,
        isNull,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'registration role mismatch revokes the captured session without changing roles',
    (tester) async {
      final transport = RegistrationNavigationTransport(role: 'USER');
      final controller = await prepare(
        tester,
        transport,
        selectedRole: 'OWNER',
      );
      await submit(tester);
      await tester.pumpAndSettle();
      expect(controller.verified, isFalse);
      expect(transport.signedOut, isTrue);
      expectNoDashboard();
      expect(
        find.textContaining('does not match the selected role'),
        findsOneWidget,
      );
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );
      expect(
        transport.requests.any((request) => request.method == 'PATCH'),
        isFalse,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  for (final failure in ['transport', 'malformed acknowledgment']) {
    testWidgets(
      '$failure never starts authentication or retries account creation',
      (tester) async {
        final transport = RegistrationNavigationTransport()
          ..registration = (() async {
            if (failure == 'transport') {
              throw TimeoutException('synthetic transport interruption');
            }
            return const ApiResponse(200, '{"created":true}');
          });
        final controller = await prepare(tester, transport);
        await submit(tester);
        await tester.pumpAndSettle();
        expect(controller.verified, isFalse);
        expectNoDashboard();
        expect(transport.requestsFor('/api/auth/csrf'), isEmpty);
        expect(transport.requestsFor('/api/auth/callback/password'), isEmpty);
        expect(
          transport.requestsFor('/api/mobile/auth/email-register'),
          hasLength(1),
        );
        expect(find.text('Continue to Sign In'), findsOneWidget);
        expect(
          tester
              .widget<FilledButton>(
                find.widgetWithText(FilledButton, 'Create Account'),
              )
              .onPressed,
          isNull,
        );
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets(
    'late registration acknowledgment after Back cannot sign in or navigate',
    (tester) async {
      final finish = Completer<ApiResponse>();
      final transport = RegistrationNavigationTransport()
        ..registration = (() => finish.future);
      final controller = await prepare(tester, transport);
      await submit(tester);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Who are you?'), findsOneWidget);
      finish.complete(RegistrationNavigationTransport.acknowledgment);
      await tester.pumpAndSettle();
      expect(controller.verified, isFalse);
      expect(transport.requestsFor('/api/auth/callback/password'), isEmpty);
      expect(
        transport.requestsFor('/api/mobile/auth/email-register'),
        hasLength(1),
      );
      expectNoDashboard();
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'Back during profile confirmation clears only the unfinished authentication',
    (tester) async {
      final finish = Completer<ApiResponse>();
      final transport = RegistrationNavigationTransport()
        ..profile = (() => finish.future);
      final controller = await prepare(tester, transport);
      await submit(tester);
      await tester.pump(const Duration(milliseconds: 50));
      expect(transport.requestsFor('/api/mobile/account'), hasLength(1));
      expect(controller.verified, isTrue);
      expectNoDashboard();
      await tester.pageBack();
      await tester.pumpAndSettle();
      finish.complete(transport.profileResponse());
      await tester.pumpAndSettle();
      expect(controller.verified, isFalse);
      expect(find.text('Who are you?'), findsOneWidget);
      expectNoDashboard();
      await tester.pumpWidget(const SizedBox());
    },
  );
}
