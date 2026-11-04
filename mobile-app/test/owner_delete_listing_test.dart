import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/workspace/workspace_screen.dart';

import 'create_listing_photos_test.dart' show Fixture;
import 'marketplace_test.dart' show json;

const _id = 'property-0001';
const _path = '/api/properties/$_id';
const _item = {
  'id': _id,
  'title': 'Deletion fixture listing',
  'status': 'DRAFT',
  'verificationStatus': 'PENDING',
};

Finder get _deleteButton =>
    find.widgetWithText(OutlinedButton, 'Delete listing');

Future<void> _revealDelete(WidgetTester tester) async {
  await tester.scrollUntilVisible(_deleteButton, 250);
  await tester.pumpAndSettle();
}

List<ApiRequest> _deletes(Fixture fixture) => fixture.transport.requests
    .where((request) => request.method == 'DELETE')
    .toList();

Future<void> _open(WidgetTester tester, Fixture fixture) async {
  final navigator = GlobalKey<NavigatorState>();
  await tester.pumpWidget(
    MaterialApp(
      navigatorKey: navigator,
      home: const Scaffold(body: Text('Items fixture')),
    ),
  );
  unawaited(
    navigator.currentState!.push<void>(
      MaterialPageRoute(
        builder: (_) => WorkspaceDetail(
          repository: fixture.repository,
          module: 'properties',
          item: _item,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  await _revealDelete(tester);
}

void main() {
  late Fixture fixture;
  setUp(() => fixture = Fixture());
  tearDown(() => fixture.dispose());
  void deletionTest(String description, WidgetTesterCallback body) {
    testWidgets(description, (tester) async {
      try {
        await body(tester);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
        await tester.pump();
      }
    });
  }

  deletionTest('cancel never deletes; confirm sends one authenticated DELETE', (
    tester,
  ) async {
    await fixture.signIn(tester);
    fixture.transport.reply = (request) =>
        request.method == 'DELETE' ? json({'deleted': true}) : json({}, 404);
    await _open(tester, fixture);
    await tester.tap(_deleteButton);
    await tester.pumpAndSettle();
    expect(find.textContaining('This cannot be undone.'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(_deletes(fixture), isEmpty);
    expect(find.byType(WorkspaceDetail), findsOneWidget);

    await tester.tap(_deleteButton);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
    await tester.pumpAndSettle();
    final sent = _deletes(fixture);
    expect(sent, hasLength(1));
    expect(sent.single.uri.path, _path);
    expect(sent.single.body, isNull);
    expect(
      sent.single.headers['cookie'],
      contains('__Secure-authjs.session-token='),
    );
    expect(fixture.repository.listingChanges.value, 1);
    expect(find.byType(WorkspaceDetail), findsNothing);
    expect(find.text('Listing deleted.'), findsOneWidget);
  });

  for (final reply in [
    <String, Object>{},
    {'deleted': false},
    {'deleted': 'true'},
  ]) {
    deletionTest(
      'missing or invalid acknowledgement stays on details: $reply',
      (tester) async {
        await fixture.signIn(tester);
        fixture.transport.reply = (request) =>
            request.method == 'DELETE' ? json(reply) : json({}, 404);
        await _open(tester, fixture);
        await tester.tap(_deleteButton);
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
        await tester.pumpAndSettle();
        expect(find.byType(WorkspaceDetail), findsOneWidget);
        expect(find.text('Listing deleted.'), findsNothing);
        expect(
          find.textContaining('Deletion could not be confirmed.'),
          findsWidgets,
        );
        expect(tester.widget<OutlinedButton>(_deleteButton).onPressed, isNull);
        expect(fixture.repository.listingChanges.value, 0);
        expect(_deletes(fixture), hasLength(1));
      },
    );
  }

  for (final failure in [ApiFailure.timeout, ApiFailure.server]) {
    deletionTest('uncertain $failure never retries or claims deletion', (
      tester,
    ) async {
      await fixture.signIn(tester);
      fixture.transport.reply = (request) {
        if (request.method == 'DELETE') throw ApiException(failure);
        return json({}, 404);
      };
      await _open(tester, fixture);
      final captured = tester.widget<OutlinedButton>(_deleteButton).onPressed!;
      captured();
      captured();
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
      await tester.pumpAndSettle();
      captured(); // An old callback cannot bypass the uncertain-result guard.
      await tester.pumpAndSettle();
      expect(_deletes(fixture), hasLength(1));
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.byType(WorkspaceDetail), findsOneWidget);
      expect(tester.widget<OutlinedButton>(_deleteButton).onPressed, isNull);
      expect(fixture.repository.listingChanges.value, 0);
    });
  }

  deletionTest('logout during confirmation prevents deletion', (tester) async {
    await fixture.signIn(tester);
    fixture.transport.reply = (_) => json({}, 404);
    await _open(tester, fixture);
    await tester.tap(_deleteButton);
    await tester.pumpAndSettle();
    fixture.controller.clearLocalSession();
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
    await tester.pumpAndSettle();
    expect(_deletes(fixture), isEmpty);
    expect(find.text('Sign in again to access this record.'), findsOneWidget);
  });

  deletionTest(
    'rapid confirmation taps cannot pop details or repeat deletion',
    (tester) async {
      await fixture.signIn(tester);
      final pending = Completer<ApiResponse>();
      fixture.transport.reply = (request) =>
          request.method == 'DELETE' ? pending.future : json({}, 404);
      await _open(tester, fixture);
      await tester.tap(_deleteButton);
      await tester.pumpAndSettle();
      final confirm = tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Delete'))
          .onPressed!;
      confirm();
      confirm();
      await tester.pumpAndSettle();
      expect(_deletes(fixture), hasLength(1));
      expect(find.byType(WorkspaceDetail), findsOneWidget);
      expect(find.text('Listing deleted.'), findsNothing);
      expect(tester.widget<OutlinedButton>(_deleteButton).onPressed, isNull);
      pending.complete(json({'deleted': true}));
      await tester.pumpAndSettle();
      expect(find.byType(WorkspaceDetail), findsNothing);
      expect(find.text('Listing deleted.'), findsOneWidget);
    },
  );

  deletionTest(
    'authorization rejection keeps the listing and shows the error',
    (tester) async {
      await fixture.signIn(tester);
      fixture.transport.reply = (request) =>
          json({}, request.method == 'DELETE' ? 403 : 404);
      await _open(tester, fixture);
      await tester.tap(_deleteButton);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
      await tester.pumpAndSettle();
      expect(find.byType(WorkspaceDetail), findsOneWidget);
      expect(
        find.text('This action is not available for your account.'),
        findsWidgets,
      );
      expect(find.text('Listing deleted.'), findsNothing);
      expect(fixture.repository.listingChanges.value, 0);
    },
  );

  deletionTest('successful deletion reloads Items from the backend', (
    tester,
  ) async {
    await fixture.signIn(tester);
    var deleted = false;
    var reads = 0;
    fixture.transport.reply = (request) {
      if (request.uri.path == '/api/mobile/workspace') {
        reads++;
        return json({
          'source': 'database',
          'module': 'properties',
          'role': 'OWNER',
          'mode': 'cursor',
          'hasMore': false,
          'nextCursor': null,
          'items': deleted ? [] : [_item],
        });
      }
      if (request.method == 'DELETE') {
        deleted = true;
        return json({'deleted': true});
      }
      return json({}, 404);
    };
    await tester.pumpWidget(
      MaterialApp(
        home: WorkspaceRecords(
          repository: fixture.repository,
          module: 'properties',
          title: 'My listings',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(reads, 1);
    await tester.tap(find.text('Deletion fixture listing'));
    await tester.pumpAndSettle();
    await _revealDelete(tester);
    await tester.tap(_deleteButton);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
    await tester.pumpAndSettle();
    expect(reads, 2);
    expect(find.byType(WorkspaceDetail), findsNothing);
    expect(find.text('Deletion fixture listing'), findsNothing);
    expect(_deletes(fixture), hasLength(1));
  });

  deletionTest('Broker details do not expose the new Owner delete action', (
    tester,
  ) async {
    fixture.transport.role = 'BROKER';
    await fixture.signIn(tester);
    fixture.transport.reply = (_) => json({}, 404);
    await tester.pumpWidget(
      MaterialApp(
        home: WorkspaceDetail(
          repository: fixture.repository,
          module: 'properties',
          item: _item,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, -1600));
    await tester.pumpAndSettle();
    expect(_deleteButton, findsNothing);
    expect(_deletes(fixture), isEmpty);
  });
}
