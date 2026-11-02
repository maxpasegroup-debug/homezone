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

// Local contract fixtures only. These tests do not establish staging acceptance.
class RoleFlowTransport implements ApiTransport {
  RoleFlowTransport(this.role);
  final String role;
  final requests = <ApiRequest>[];
  bool signedOut = false;
  @override
  Future<ApiResponse> send(
    ApiRequest request,
    Duration timeout, {
    void Function(ApiResponseMetadata)? onHeaders,
  }) async {
    requests.add(request);
    Object? body;
    Map<String, List<String>> headers = {};
    switch (request.uri.path) {
      case '/api/auth/csrf':
        body = {'csrfToken': 'a' * 64};
        headers = {
          'set-cookie': [
            '__Host-authjs.csrf-token=${'a' * 64}%7C${'b' * 64}; Path=/; Secure; HttpOnly',
          ],
        };
      case '/api/auth/callback/password':
        body = {'url': '/'};
        headers = {
          'set-cookie': [
            '__Secure-authjs.session-token=FAKE-JWE.synthetic; Path=/; Secure; HttpOnly',
          ],
        };
      case '/api/auth/signout':
        signedOut = true;
        body = {'url': '/'};
      case '/api/auth/session':
        body = signedOut
            ? null
            : {
                'user': {
                  'id': 'role-fixture',
                  'role': role,
                  'whatsappVerified': false,
                },
                'expires': DateTime.now()
                    .toUtc()
                    .add(const Duration(days: 1))
                    .toIso8601String(),
              };
      case '/api/mobile/account':
        body = {
          'profile': {
            'fullName': 'Role fixture',
            'role': role,
            'verificationStatus': 'PENDING',
          },
          'saved': [],
          'shortlists': [],
          'enquiries': [],
        };
      case '/api/mobile/properties':
        body = {
          'source': 'database',
          'properties': [],
          'page': 1,
          'hasMore': false,
        };
      case '/api/mobile/workspace':
        final module = request.uri.queryParameters['module'];
        body = {
          'source': 'database',
          'role': role,
          'module': module,
          'mode': 'cursor',
          'hasMore': false,
          'nextCursor': null,
          'items': [
            if (module == 'properties')
              {
                'id': 'owned-listing-fixture',
                'title': 'Owned listing fixture',
                'status': 'DRAFT',
              },
            if (module == 'ownerEnquiries')
              {
                'id': 'owner-enquiry-fixture',
                'name': 'Owner enquiry fixture',
                'message': 'A listing enquiry',
              },
          ],
        };
      default:
        throw const ApiException(ApiFailure.invalidRequest);
    }
    return ApiResponse(200, jsonEncode(body), headers: headers);
  }

  @override
  void close() {}
}

void main() {
  const labels = {
    'USER': 'Property Buyer',
    'OWNER': 'Property Owner',
    'BROKER': 'Broker',
    'BUILDER': 'Builder',
    'SERVICE_PROVIDER': 'Service Provider',
  };
  Future<(SignInController, RoleFlowTransport)> signIn(
    WidgetTester tester,
    String selectedRole,
    String actualRole,
  ) async {
    final configuration = ApiConfiguration(
      'https://approved.example.com',
      environment: ApiEnvironment.staging,
    );
    final transport = RoleFlowTransport(actualRole);
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
    await helpers.tapText(tester, labels[selectedRole]!);
    await helpers.tapText(tester, 'Already have an account? Sign In');
    await helpers.fill(tester, 'Email address', 'fixture@example.com');
    await helpers.fill(tester, 'Password', 'Synthetic123');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await helpers.tapText(tester, 'Sign In');
    await tester.pumpAndSettle();
    return (controller, transport);
  }

  for (final role in labels.keys) {
    testWidgets('$role reaches only its server-confirmed service dashboard', (
      tester,
    ) async {
      final (controller, transport) = await signIn(tester, role, role);
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
        find.byKey(const ValueKey('owner-bottom-navigation')),
        role == 'OWNER' ? findsOneWidget : findsNothing,
      );
      expect(
        transport.requests.any(
          (r) =>
              r.uri.path == '/api/mobile/account' &&
              r.uri.queryParameters['view'] == 'profile',
        ),
        isTrue,
      );
      expect(transport.requests.any((r) => r.method == 'PATCH'), isFalse);
      await tester.pumpWidget(const SizedBox());
    });
  }
  testWidgets(
    'owner tabs load their own records and disappear when access ends',
    (tester) async {
      final (controller, transport) = await signIn(tester, 'OWNER', 'OWNER');
      final navigation = find.byKey(const ValueKey('owner-bottom-navigation'));
      expect(
        transport.requests.where((r) => r.uri.path == '/api/mobile/workspace'),
        isEmpty,
      );

      await tester.tap(
        find.descendant(of: navigation, matching: find.text('Listings')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Owned listing fixture'), findsOneWidget);
      expect(find.text('Owner enquiry fixture'), findsNothing);
      expect(find.byTooltip('Create'), findsOneWidget);

      await tester.tap(
        find.descendant(of: navigation, matching: find.text('Enquiries')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Owner enquiry fixture'), findsOneWidget);
      expect(find.text('Owned listing fixture'), findsNothing);
      expect(find.byTooltip('Create'), findsNothing);
      expect(
        transport.requests
            .where((r) => r.uri.path == '/api/mobile/workspace')
            .map((r) => r.uri.queryParameters['module']),
        ['properties', 'ownerEnquiries'],
      );

      await tester.tap(
        find.descendant(of: navigation, matching: find.text('More')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Sign out'), findsOneWidget);
      expect(find.text('Request account-deletion review'), findsOneWidget);
      expect(find.text('Owner enquiry fixture'), findsNothing);
      expect(find.text('HOMEZONE'), findsNothing);

      await tester.tap(
        find.descendant(of: navigation, matching: find.text('Home')),
      );
      await tester.pumpAndSettle();
      expect(find.text('HOMEZONE'), findsOneWidget);
      expect(find.text('My listings'), findsOneWidget);
      await tester.tap(
        find.descendant(of: navigation, matching: find.text('Listings')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Owned listing fixture'), findsOneWidget);
      controller.clearLocalSession();
      await tester.pumpAndSettle();
      expect(navigation, findsNothing);
      expect(find.byType(WorkspaceRecords), findsNothing);
      expect(find.text('Owned listing fixture'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'selected role mismatch signs out without a dashboard or role write',
    (tester) async {
      final (controller, transport) = await signIn(tester, 'OWNER', 'USER');
      expect(controller.verified, isFalse);
      expect(transport.signedOut, isTrue);
      expect(find.byType(MarketplaceScreen), findsNothing);
      expect(find.byType(WorkspaceScreen), findsNothing);
      expect(
        find.textContaining('does not match the selected role'),
        findsOneWidget,
      );
      expect(transport.requests.any((r) => r.method == 'PATCH'), isFalse);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
