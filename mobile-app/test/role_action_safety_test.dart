import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_repository.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'create_listing_photos_test.dart' show Fixture;
import 'marketplace_test.dart' show json;

// Synthetic accounts and in-process HTTP fixtures only. No live services.
Future<void> reveal(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      180,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

Future<void> tap(WidgetTester tester, String label) async {
  await reveal(tester, find.text(label));
  await tester.tap(find.text(label));
  await tester.pumpAndSettle();
}

Future<void> open(
  WidgetTester tester,
  Fixture fixture,
  Widget child, {
  String role = 'USER',
}) async {
  fixture.initialize();
  fixture.transport.role = role;
  await fixture.signIn(tester);
  await tester.pumpWidget(MaterialApp(home: child));
  await tester.pumpAndSettle();
}

Future<void> close(WidgetTester tester, Fixture fixture) async {
  await tester.pumpWidget(const SizedBox.shrink());
  fixture.dispose();
}

Widget enquiry(Fixture fixture) => EnquiryForm(
  property: Listing.parse({
    'id': 'property-synthetic1',
    'title': 'Synthetic property',
    'status': 'PUBLISHED',
  }),
  repository: fixture.repository,
);

Future<VoidCallback> fillEnquiry(WidgetTester tester) async {
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Name'),
    'Original contact',
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Phone number'),
    '0000000000',
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Message'),
    'Original message',
  );
  await reveal(tester, find.text('Submit enquiry'));
  return tester
      .widget<FilledButton>(find.widgetWithText(FilledButton, 'Submit enquiry'))
      .onPressed!;
}

void main() {
  testWidgets('Owner can reversibly unpublish without self-archiving', (
    tester,
  ) async {
    final fixture = Fixture()..initialize();
    Map<String, dynamic>? sent;
    try {
      await open(
        tester,
        fixture,
        WorkspaceDetail(
          repository: fixture.repository,
          module: 'properties',
          item: {
            'id': 'property-synthetic1',
            'title': 'Synthetic home',
            'status': 'PUBLISHED',
            'verificationStatus': 'PENDING',
          },
        ),
        role: 'OWNER',
      );
      fixture.transport.reply = (request) {
        if (request.method == 'PATCH') {
          sent = jsonDecode(request.body!) as Map<String, dynamic>;
        }
        return json({
          'property': {'id': 'property-synthetic1', 'status': 'DRAFT'},
        });
      };
      await tap(tester, 'Unpublish listing');
      await tap(tester, 'Continue');
      expect(sent, {'status': 'DRAFT'});
      expect(find.text('ARCHIVED'), findsNothing);
    } finally {
      await close(tester, fixture);
    }
  });

  testWidgets('uncertain enquiry cannot be replayed from captured callback', (
    tester,
  ) async {
    final fixture = Fixture()..initialize();
    try {
      await open(tester, fixture, enquiry(fixture));
      fixture.transport.reply = (_) =>
          throw const ApiException(ApiFailure.timeout);
      final submit = await fillEnquiry(tester);
      submit();
      await tester.pumpAndSettle();
      submit();
      await tester.pumpAndSettle();
      expect(
        fixture.transport.requests
            .where((r) => r.uri.path == '/api/leads')
            .length,
        1,
      );
      expect(
        find.textContaining('Your enquiry may have been submitted'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Submit enquiry'),
            )
            .onPressed,
        isNull,
      );
    } finally {
      await close(tester, fixture);
    }
  });

  testWidgets('positive inventory values reject zero before HTTP submission', (
    tester,
  ) async {
    final fixture = Fixture()..initialize();
    try {
      await open(
        tester,
        fixture,
        WorkspaceForm(
          repository: fixture.repository,
          title: 'Edit inventory',
          path: '/api/mobile/workspace/unit-synthetic1',
          method: 'PATCH',
          fields: const [
            FieldSpec('price', 'Price', number: true, positive: true),
          ],
          initial: const {'price': 0},
        ),
        role: 'BUILDER',
      );
      final before = fixture.transport.requests.length;
      await tap(tester, 'Save');
      expect(fixture.transport.requests.length, before);
      expect(
        find.textContaining('Enter a number within the allowed range'),
        findsWidgets,
      );
    } finally {
      await close(tester, fixture);
    }
  });

  for (final changeRole in [false, true]) {
    testWidgets(
      'enquiry rejects captured submit after ${changeRole ? 'role' : 'account'} change',
      (tester) async {
        final fixture = Fixture()..initialize();
        try {
          await open(tester, fixture, enquiry(fixture));
          final submit = await fillEnquiry(tester);
          if (changeRole) {
            fixture.transport.role = 'OWNER';
          } else {
            fixture.transport.identity = 'user-0002';
          }
          await fixture.signIn(tester);
          await tester.pumpAndSettle();
          final before = fixture.transport.requests.length;
          submit();
          await tester.pumpAndSettle();
          expect(fixture.transport.requests.length, before);
          expect(find.text('Original contact'), findsNothing);
          expect(
            find.textContaining('Your account or session changed'),
            findsOneWidget,
          );
        } finally {
          await close(tester, fixture);
        }
      },
    );
  }

  testWidgets(
    'late enquiry acknowledgment cannot appear under another account',
    (tester) async {
      final fixture = Fixture()..initialize();
      final pending = Completer<ApiResponse>();
      try {
        await open(tester, fixture, enquiry(fixture));
        fixture.transport.reply = (_) => pending.future;
        final submit = await fillEnquiry(tester);
        submit();
        await tester.pump();
        fixture.transport.identity = 'user-0002';
        final next = fixture.controller.beginSignIn(
          'synthetic@example.invalid',
          'SyntheticPassword123',
        );
        await tester.pump();
        pending.complete(
          json({
            'ok': true,
            'lead': {'id': 'lead-synthetic1'},
          }),
        );
        await tester.pump();
        expect((await next.result).verified, true);
        await tester.pumpAndSettle();
        expect(
          find.textContaining('The server confirmed your enquiry'),
          findsNothing,
        );
        expect(find.text('Original message'), findsNothing);
      } finally {
        if (!pending.isCompleted) pending.complete(json({}, 503));
        await close(tester, fixture);
      }
    },
  );

  testWidgets('normal enquiry submits once and shows only confirmed success', (
    tester,
  ) async {
    final fixture = Fixture()..initialize();
    try {
      await open(tester, fixture, enquiry(fixture));
      fixture.transport.reply = (_) => json({
        'ok': true,
        'lead': {'id': 'lead-synthetic1'},
      });
      final submit = await fillEnquiry(tester);
      submit();
      submit();
      await tester.pumpAndSettle();
      expect(
        fixture.transport.requests
            .where((r) => r.uri.path == '/api/leads')
            .length,
        1,
      );
      expect(
        find.textContaining('The server confirmed your enquiry'),
        findsOneWidget,
      );
    } finally {
      await close(tester, fixture);
    }
  });

  for (final status in ['DELIVERED', 'QUALITY_CHECK']) {
    testWidgets('Studio revision action follows $status server policy', (
      tester,
    ) async {
      final fixture = Fixture()..initialize();
      try {
        await open(
          tester,
          fixture,
          WorkspaceDetail(
            repository: fixture.repository,
            module: 'studio',
            item: {'id': 'studio-synthetic1', 'status': status},
          ),
        );
        await tester.drag(find.byType(ListView), const Offset(0, -600));
        await tester.pumpAndSettle();
        expect(
          find.text('Request revision'),
          status == 'DELIVERED' ? findsOneWidget : findsNothing,
        );
      } finally {
        await close(tester, fixture);
      }
    });
  }

  testWidgets(
    'uncertain generic creation blocks duplicate and captured submissions',
    (tester) async {
      final fixture = Fixture()..initialize();
      try {
        await open(
          tester,
          fixture,
          WorkspaceForm(
            repository: fixture.repository,
            title: 'Create contact',
            path: '/api/pro/team',
            fields: const [FieldSpec('name', 'Name', required: true)],
            initial: const {'name': 'Synthetic contact'},
          ),
          role: 'BROKER',
        );
        fixture.transport.reply = (_) =>
            throw const ApiException(ApiFailure.timeout);
        final submit = tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Save'))
            .onPressed!;
        submit();
        await tester.pumpAndSettle();
        submit();
        await tester.pumpAndSettle();
        expect(
          fixture.transport.requests
              .where((r) => r.uri.path == '/api/pro/team')
              .length,
          1,
        );
        expect(
          find.textContaining('This record may already exist'),
          findsOneWidget,
        );
        expect(
          tester
              .widget<FilledButton>(find.widgetWithText(FilledButton, 'Save'))
              .onPressed,
          isNull,
        );
        expect(find.text('Back to records'), findsOneWidget);
      } finally {
        await close(tester, fixture);
      }
    },
  );

  testWidgets('definitely rejected creation remains editable', (tester) async {
    final fixture = Fixture()..initialize();
    try {
      await open(
        tester,
        fixture,
        WorkspaceForm(
          repository: fixture.repository,
          title: 'Create contact',
          path: '/api/pro/team',
          fields: const [FieldSpec('name', 'Name', required: true)],
          initial: const {'name': 'Synthetic contact'},
        ),
        role: 'BROKER',
      );
      fixture.transport.reply = (_) => json({'error': 'Invalid request'}, 400);
      await tap(tester, 'Save');
      expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Save'))
            .onPressed,
        isNotNull,
      );
      expect(find.text('Back to records'), findsNothing);
    } finally {
      await close(tester, fixture);
    }
  });

  testWidgets('customer reviews completed service through existing endpoint', (
    tester,
  ) async {
    final fixture = Fixture()..initialize();
    Map<String, dynamic>? sent;
    try {
      await open(
        tester,
        fixture,
        WorkspaceDetail(
          repository: fixture.repository,
          module: 'serviceBookings',
          item: {
            'id': 'booking-synthetic1',
            'status': 'COMPLETED',
            'canReview': true,
            'currency': 'INR',
            'amount': '125',
          },
        ),
      );
      fixture.transport.reply = (request) {
        expect(
          request.uri.path,
          '/api/service-bookings/booking-synthetic1/reviews',
        );
        sent = jsonDecode(request.body!) as Map<String, dynamic>;
        return json({
          'review': {'id': 'review-synthetic1', 'rating': 5},
        });
      };
      await tap(tester, 'Review completed service');
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Rating (1–5)'),
        '5',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Your review'),
        'Synthetic review',
      );
      await tap(tester, 'Save');
      expect(sent, {'rating': 5, 'comment': 'Synthetic review'});
      expect(tester.takeException(), isNull);
    } finally {
      await close(tester, fixture);
    }
  });

  testWidgets(
    'provider cannot see customer review action without server capability',
    (tester) async {
      final fixture = Fixture()..initialize();
      try {
        await open(
          tester,
          fixture,
          WorkspaceDetail(
            repository: fixture.repository,
            module: 'serviceBookings',
            item: {
              'id': 'booking-synthetic1',
              'status': 'COMPLETED',
              'canReview': false,
            },
          ),
          role: 'SERVICE_PROVIDER',
        );
        expect(find.text('Review completed service'), findsNothing);
      } finally {
        await close(tester, fixture);
      }
    },
  );

  testWidgets(
    'Builder project form can submit publication and existing media fields',
    (tester) async {
      final fixture = Fixture()..initialize();
      Map<String, dynamic>? sent;
      try {
        await open(
          tester,
          fixture,
          WorkspaceDetail(
            repository: fixture.repository,
            module: 'projects',
            item: {
              'id': 'project-synthetic1',
              'name': 'Synthetic project',
              'city': 'Kochi',
              'description': 'Synthetic project description',
              'status': 'DRAFT',
              'mediaUrls': ['https://images.example.invalid/existing.jpg'],
            },
          ),
          role: 'BUILDER',
        );
        fixture.transport.reply = (request) {
          sent = jsonDecode(request.body!) as Map<String, dynamic>;
          return json({
            'project': {'id': 'project-synthetic1', ...sent!},
          });
        };
        await tap(tester, 'Edit project');
        final status = find.byWidgetPredicate(
          (w) =>
              w is DropdownButtonFormField<String> &&
              w.decoration.labelText == 'Project status',
        );
        await reveal(tester, status);
        await tester.tap(status);
        await tester.pumpAndSettle();
        await tester.tap(find.text('PUBLISHED').last);
        await tester.pumpAndSettle();
        await tap(tester, 'Save');
        expect(sent?['status'], 'PUBLISHED');
        expect(sent?['mediaUrls'], [
          'https://images.example.invalid/existing.jpg',
        ]);
        expect(sent?['name'], 'Synthetic project');
      } finally {
        await close(tester, fixture);
      }
    },
  );

  testWidgets(
    'provider access error explains business verification without fake records',
    (tester) async {
      final fixture = Fixture()..initialize();
      fixture.transport.reply = (_) => json({'error': 'Forbidden'}, 403);
      try {
        await open(
          tester,
          fixture,
          WorkspaceRecords(
            repository: fixture.repository,
            module: 'providerRequests',
            title: 'Incoming work',
          ),
          role: 'SERVICE_PROVIDER',
        );
        expect(
          find.textContaining('active, verified service business'),
          findsOneWidget,
        );
        expect(find.textContaining('No records yet'), findsNothing);
      } finally {
        await close(tester, fixture);
      }
    },
  );
}
