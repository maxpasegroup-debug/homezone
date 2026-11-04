import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart'
    show ListingImage;
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';
import 'package:homezone_mobile/theme/app_theme.dart';

import 'create_listing_photos_test.dart' show Fixture;
import 'marketplace_test.dart' show json;

// In-process authentication and API fixtures only; no backend or device calls.
const _totals = {
  'MY_LISTINGS': 71,
  'ACTIVE_LEADS': 37,
  'PENDING_TASKS': 41,
  'MY_PROJECTS': 23,
  'ACTIVE_JOBS': 19,
  'UNREAD_NOTIFICATIONS': 13,
};

ApiResponse _reply(Fixture fixture, ApiRequest request) {
  if (request.uri.path == '/api/mobile/summary') {
    return json({'source': 'database', 'metrics': _totals});
  }
  if (request.uri.path == '/api/mobile/workspace') {
    return json({
      'source': 'database',
      'module': request.uri.queryParameters['module'],
      'role': fixture.transport.role,
      'mode': 'cursor',
      'items': [],
      'hasMore': false,
      'nextCursor': null,
    });
  }
  return json({}, 404);
}

Future<void> _open(
  WidgetTester tester,
  Fixture fixture,
  String role, {
  double textScale = 1,
  FutureOr<ApiResponse> Function(ApiRequest)? reply,
  bool settle = true,
}) async {
  fixture.initialize();
  fixture.transport.role = role;
  fixture.transport.reply = reply ?? (request) => _reply(fixture, request);
  await fixture.signIn(tester);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: WorkspaceScreen(repository: fixture.repository),
      routes: {
        '/sign-in': (_) => const Scaffold(body: Text('Sign-in fixture')),
        '/discovery': (_) => const Scaffold(body: Text('Discovery fixture')),
      },
    ),
  );
  if (settle) await tester.pumpAndSettle();
}

ApiResponse _records(
  Fixture fixture,
  String module,
  List<Map<String, dynamic>> records,
) => json({
  'source': 'database',
  'module': module,
  'role': fixture.transport.role,
  'mode': 'cursor',
  'items': records,
  'hasMore': false,
  'nextCursor': null,
});

Finder _destination(String label) => find.byWidgetPredicate(
  (widget) => widget is NavigationDestination && widget.label == label,
);

Future<void> _tapDestination(WidgetTester tester, String label) async {
  await tester.tap(_destination(label));
  await tester.pumpAndSettle();
}

void main() {
  const roles = {
    'OWNER': ['Home', 'Listings', 'Enquiries', 'More'],
    'BROKER': ['Home', 'Leads', 'Listings', 'Follow-ups', 'More'],
    'BUILDER': ['Home', 'Projects', 'More'],
    'SERVICE_PROVIDER': ['Home', 'Requests', 'Bookings', 'Profile', 'More'],
    'USER': ['Home', 'Services', 'More'],
  };
  const modules = {
    'OWNER': ['properties', 'ownerEnquiries'],
    'BROKER': ['crm', 'properties', 'calendar'],
    'BUILDER': ['projects'],
    'SERVICE_PROVIDER': [
      'providerRequests',
      'serviceBookings',
      'providerProfile',
    ],
    'USER': ['requests'],
  };

  for (final entry in roles.entries) {
    testWidgets('${entry.key} navigation opens only its primary modules', (
      tester,
    ) async {
      final fixture = Fixture();
      try {
        await _open(tester, fixture, entry.key);
        final navigation = tester.widget<NavigationBar>(
          find.byType(NavigationBar),
        );
        expect(
          navigation.destinations.cast<NavigationDestination>().map(
            (item) => item.label,
          ),
          entry.value,
        );
        expect(find.text('HOMEZONE'), findsOneWidget);
        expect(find.text('Sign out'), findsNothing);
        expect(find.text('Request account-deletion review'), findsNothing);
        expect(find.byTooltip('Notifications'), findsOneWidget);

        fixture.transport.requests.clear();
        for (var index = 1; index < entry.value.length - 1; index++) {
          await _tapDestination(tester, entry.value[index]);
          expect(
            tester
                .widget<NavigationBar>(find.byType(NavigationBar))
                .selectedIndex,
            index,
          );
          expect(
            fixture.transport.requests.last.uri.path,
            '/api/mobile/workspace',
          );
          expect(
            fixture.transport.requests.last.uri.queryParameters['module'],
            modules[entry.key]![index - 1],
          );
        }
        await _tapDestination(tester, 'More');
        expect(find.text('More'), findsWidgets);
        await tester.scrollUntilVisible(find.text('Sign out'), 220);
        expect(find.text('Request account-deletion review'), findsOneWidget);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    });

    testWidgets(
      '${entry.key} home and More fit narrow screens with large text',
      (tester) async {
        tester.view.physicalSize = const Size(320, 720);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final fixture = Fixture();
        try {
          await _open(tester, fixture, entry.key, textScale: 2);
          expect(tester.takeException(), isNull);
          await tester.scrollUntilVisible(find.text('HOMEZONE Studio'), 220);
          expect(tester.takeException(), isNull);
          await _tapDestination(tester, 'More');
          await tester.scrollUntilVisible(find.text('Sign out'), 220);
          expect(tester.takeException(), isNull);
        } finally {
          await tester.pumpWidget(const SizedBox.shrink());
          fixture.dispose();
        }
      },
    );
  }

  testWidgets(
    'Owner home uses server totals and opens the guided creation flow',
    (tester) async {
      final fixture = Fixture();
      try {
        await _open(tester, fixture, 'OWNER');
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('workspace-total-MY_LISTINGS')),
          160,
        );
        expect(
          tester
              .widget<Text>(
                find.byKey(const ValueKey('workspace-total-MY_LISTINGS')),
              )
              .data,
          '71',
        );
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('workspace-primary-action')),
          -200,
        );
        await tester.tap(
          find.byKey(const ValueKey('workspace-primary-action')),
        );
        await tester.pumpAndSettle();
        final form = tester.widget<WorkspaceForm>(find.byType(WorkspaceForm));
        expect(form.path, '/api/properties');
        expect(form.fixed['status'], 'PUBLISHED');
        expect(form.guidedListing, isTrue);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    },
  );

  testWidgets(
    'account switches reset navigation and discard prior role totals and callbacks',
    (tester) async {
      final fixture = Fixture();
      try {
        await _open(tester, fixture, 'OWNER');
        final oldAction = tester
            .widget<FilledButton>(
              find.byKey(const ValueKey('workspace-primary-action')),
            )
            .onPressed!;
        await _tapDestination(tester, 'Enquiries');
        fixture.controller.clearLocalSession();
        fixture.transport.identity = 'provider-0002';
        fixture.transport.role = 'SERVICE_PROVIDER';
        await fixture.signIn(tester);
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<NavigationBar>(find.byType(NavigationBar))
              .selectedIndex,
          0,
        );
        expect(_destination('Profile'), findsOneWidget);
        expect(
          find.byKey(const ValueKey('workspace-total-MY_LISTINGS')),
          findsNothing,
        );
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('workspace-total-ACTIVE_JOBS')),
          160,
        );
        expect(
          tester
              .widget<Text>(
                find.byKey(const ValueKey('workspace-total-ACTIVE_JOBS')),
              )
              .data,
          '19',
        );
        oldAction();
        await tester.pumpAndSettle();
        expect(find.byType(WorkspaceForm), findsNothing);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    },
  );

  testWidgets('late summary data cannot appear after logout', (tester) async {
    final fixture = Fixture();
    final pending = Completer<ApiResponse>();
    try {
      fixture.initialize();
      fixture.transport.role = 'BROKER';
      fixture.transport.reply = (request) =>
          request.uri.path == '/api/mobile/summary'
          ? pending.future
          : _reply(fixture, request);
      await fixture.signIn(tester);
      await tester.pumpWidget(
        MaterialApp(home: WorkspaceScreen(repository: fixture.repository)),
      );
      await tester.pump();
      fixture.controller.clearLocalSession();
      await tester.pump();
      pending.complete(json({'source': 'database', 'metrics': _totals}));
      await tester.pumpAndSettle();
      expect(find.text('Sign in to continue'), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(
        find.byKey(const ValueKey('workspace-total-ACTIVE_LEADS')),
        findsNothing,
      );
      expect(find.text('37'), findsNothing);
      expect(tester.takeException(), isNull);
    } finally {
      if (!pending.isCompleted) pending.complete(json({}, 503));
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.dispose();
    }
  });

  testWidgets('an opened secondary module loses its account data on logout', (
    tester,
  ) async {
    final fixture = Fixture();
    try {
      await _open(tester, fixture, 'BROKER');
      fixture.transport.reply = (request) =>
          request.uri.path == '/api/mobile/workspace'
          ? json({
              'source': 'database',
              'module': 'team',
              'role': 'BROKER',
              'mode': 'cursor',
              'hasMore': false,
              'nextCursor': null,
              'items': [
                {'id': 'teammate-0001', 'name': 'Previous account teammate'},
              ],
            })
          : _reply(fixture, request);
      await tester.scrollUntilVisible(find.text('My team'), 200);
      await tester.tap(find.text('My team'));
      await tester.pumpAndSettle();
      expect(find.text('Previous account teammate'), findsOneWidget);
      fixture.controller.clearLocalSession();
      await tester.pumpAndSettle();
      expect(find.text('Previous account teammate'), findsNothing);
      expect(find.text('Sign in again to continue.'), findsOneWidget);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.dispose();
    }
  });

  testWidgets(
    'invalid summary is unavailable rather than showing invented zeroes',
    (tester) async {
      final fixture = Fixture();
      try {
        await _open(tester, fixture, 'BUILDER');
        fixture.transport.reply = (request) =>
            request.uri.path == '/api/mobile/summary'
            ? json({
                'source': 'database',
                'metrics': {'MY_PROJECTS': '23'},
              })
            : _reply(fixture, request);
        await tester.tap(find.byTooltip('Refresh overview'));
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.text('Your overview is unavailable.'),
          160,
        );
        expect(
          find.byKey(const ValueKey('workspace-total-MY_PROJECTS')),
          findsNothing,
        );
        expect(find.text('0'), findsNothing);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    },
  );

  testWidgets(
    'Owner preview uses stored image URLs and opens the selected record',
    (tester) async {
      final fixture = Fixture();
      try {
        await _open(
          tester,
          fixture,
          'OWNER',
          reply: (request) => request.uri.path == '/api/mobile/workspace'
              ? _records(fixture, 'properties', [
                  for (var index = 1; index <= 4; index++)
                    {
                      'id': 'property-000$index',
                      'title': 'Actual owner property $index',
                      'mediaUrls': [
                        'https://photos.example.invalid/property-$index.png',
                      ],
                      'city': 'Kochi',
                      'status': 'DRAFT',
                      'currency': 'INR',
                      'price': 3500000,
                    },
                ])
              : _reply(fixture, request),
        );
        await tester.scrollUntilVisible(
          find.text('Actual owner property 1'),
          180,
        );
        final image = tester.widget<ListingImage>(
          find.byKey(const ValueKey('workspace-property-image-property-0001')),
        );
        expect(image.url, 'https://photos.example.invalid/property-1.png');
        expect(
          find.byKey(const ValueKey('workspace-preview-property-0003')),
          findsOneWidget,
        );
        expect(
          find.byKey(const ValueKey('workspace-preview-property-0004')),
          findsNothing,
        );
        expect(find.textContaining('Recent'), findsNothing);
        final firstPage = fixture.transport.requests
            .where((request) => request.uri.path == '/api/mobile/workspace')
            .single;
        expect(firstPage.uri.queryParameters['module'], 'properties');
        expect(firstPage.uri.queryParameters['mode'], 'cursor');
        expect(firstPage.uri.queryParameters.containsKey('after'), isFalse);
        await tester.ensureVisible(find.text('Actual owner property 1'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Actual owner property 1'));
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<WorkspaceDetail>(find.byType(WorkspaceDetail))
              .item['id'],
          'property-0001',
        );
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    },
  );

  for (final entry in {
    'BROKER': (
      'crm',
      <String, dynamic>{
        'id': 'lead-00001',
        'name': 'Actual pipeline client',
        'message': 'Looking for a two-bedroom home',
        'stage': 'QUALIFIED',
        'nextAction': 'Send the floor plan',
        'followUpAt': '2030-06-20T10:30:00.000Z',
      },
      'Actual pipeline client',
    ),
    'BUILDER': (
      'projects',
      <String, dynamic>{
        'id': 'project-0001',
        'name': 'Actual project',
        'city': 'Kochi',
        'constructionStatus': 'STRUCTURE',
        'unitsCount': 20,
        'availableUnits': 7,
      },
      'Actual project',
    ),
    'SERVICE_PROVIDER': (
      'providerRequests',
      <String, dynamic>{
        'id': 'request-0001',
        'category': 'Interior design',
        'city': 'Kochi',
        'message': 'Design the living room',
        'status': 'requested',
        'budget': '25000',
      },
      'Interior design',
    ),
  }.entries) {
    testWidgets('${entry.key} previews its scoped server records', (
      tester,
    ) async {
      final fixture = Fixture();
      final (module, record, title) = entry.value;
      try {
        await _open(
          tester,
          fixture,
          entry.key,
          reply: (request) => request.uri.path == '/api/mobile/workspace'
              ? _records(fixture, module, [record])
              : _reply(fixture, request),
        );
        await tester.scrollUntilVisible(find.text(title), 200);
        expect(find.text(title), findsOneWidget);
        if (entry.key == 'BROKER') {
          expect(find.text('Next action: Send the floor plan'), findsOneWidget);
          expect(find.textContaining('Follow-up:'), findsOneWidget);
        }
        if (entry.key == 'BUILDER') {
          expect(find.text('7 available of 20 units'), findsOneWidget);
        }
        if (entry.key == 'SERVICE_PROVIDER') {
          expect(find.text('Budget: 25000'), findsOneWidget);
        }
        expect(find.byType(ListingImage), findsNothing);
        expect(
          fixture.transport.requests
              .where((request) => request.uri.path == '/api/mobile/workspace')
              .single
              .uri
              .queryParameters['module'],
          module,
        );
        await tester.ensureVisible(find.text(title));
        await tester.pumpAndSettle();
        await tester.tap(find.text(title));
        await tester.pumpAndSettle();
        final detail = tester.widget<WorkspaceDetail>(
          find.byType(WorkspaceDetail),
        );
        expect(detail.module, module);
        expect(detail.item['id'], record['id']);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    });
  }

  testWidgets('empty records show an honest state with a view-all route', (
    tester,
  ) async {
    final fixture = Fixture();
    try {
      await _open(tester, fixture, 'OWNER');
      await tester.scrollUntilVisible(
        find.text('No properties yet. Add your first property to get started.'),
        180,
      );
      expect(find.byType(ListingImage), findsNothing);
      await tester.ensureVisible(find.text('View all'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('View all'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        1,
      );
      expect(find.byType(WorkspaceRecords), findsOneWidget);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.dispose();
    }
  });

  testWidgets(
    'record failure and retry do not clear or refetch valid summary totals',
    (tester) async {
      final fixture = Fixture();
      var failing = true;
      try {
        await _open(
          tester,
          fixture,
          'BUILDER',
          reply: (request) => request.uri.path == '/api/mobile/workspace'
              ? failing
                    ? json({}, 503)
                    : _records(fixture, 'projects', [
                        {'id': 'project-0001', 'name': 'Recovered project'},
                      ])
              : _reply(fixture, request),
        );
        await tester.scrollUntilVisible(
          find.text('Your records are unavailable.'),
          180,
        );
        final summaryReads = fixture.transport.requests
            .where((request) => request.uri.path == '/api/mobile/summary')
            .length;
        failing = false;
        await tester.ensureVisible(find.text('Retry records'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Retry records'));
        await tester.pumpAndSettle();
        expect(find.text('Recovered project'), findsOneWidget);
        expect(find.text('Your records are unavailable.'), findsNothing);
        expect(
          fixture.transport.requests
              .where((request) => request.uri.path == '/api/mobile/summary')
              .length,
          summaryReads,
        );
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('workspace-total-MY_PROJECTS')),
          -180,
        );
        expect(
          tester
              .widget<Text>(
                find.byKey(const ValueKey('workspace-total-MY_PROJECTS')),
              )
              .data,
          '23',
        );
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    },
  );

  testWidgets('summary failure leaves actual records usable', (tester) async {
    final fixture = Fixture();
    try {
      await _open(
        tester,
        fixture,
        'BUILDER',
        reply: (request) => request.uri.path == '/api/mobile/summary'
            ? json({}, 503)
            : request.uri.path == '/api/mobile/workspace'
            ? _records(fixture, 'projects', [
                {
                  'id': 'project-0001',
                  'name': 'Visible despite summary failure',
                },
              ])
            : _reply(fixture, request),
      );
      await tester.scrollUntilVisible(
        find.text('Visible despite summary failure'),
        180,
      );
      expect(find.text('Visible despite summary failure'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('workspace-total-MY_PROJECTS')),
        findsNothing,
      );
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.dispose();
    }
  });

  testWidgets('late record page cannot appear after the home session ends', (
    tester,
  ) async {
    final fixture = Fixture();
    final pending = Completer<ApiResponse>();
    try {
      await _open(
        tester,
        fixture,
        'BROKER',
        settle: false,
        reply: (request) => request.uri.path == '/api/mobile/workspace'
            ? pending.future
            : _reply(fixture, request),
      );
      await tester.pump();
      await tester.pump();
      fixture.controller.clearLocalSession();
      await tester.pump();
      pending.complete(
        _records(fixture, 'crm', [
          {'id': 'lead-00001', 'name': 'Must never cross the session boundary'},
        ]),
      );
      await tester.pumpAndSettle();
      expect(find.text('Must never cross the session boundary'), findsNothing);
      expect(find.text('Sign in to continue'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('workspace-record-preview')),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    } finally {
      if (!pending.isCompleted) pending.complete(json({}, 503));
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.dispose();
    }
  });

  for (final role in ['ADMIN', 'SUPER_ADMIN']) {
    testWidgets('$role remains in the web administration handoff', (
      tester,
    ) async {
      final fixture = Fixture();
      try {
        await _open(tester, fixture, role);
        expect(find.text('Administration'), findsOneWidget);
        expect(find.byType(NavigationBar), findsNothing);
        expect(
          fixture.transport.requests.where(
            (request) => request.uri.path == '/api/mobile/summary',
          ),
          isEmpty,
        );
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
      }
    });
  }
}
