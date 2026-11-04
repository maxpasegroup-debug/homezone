import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/workspace/workspace_profile_screen.dart';

import 'create_listing_photos_test.dart' show Fixture;
import 'marketplace_test.dart' show json;

void main() {
  late Fixture fixture;
  Map<String, dynamic> profile() => {
    'fullName': 'Synthetic owner',
    'role': 'OWNER',
    'verificationStatus': 'PENDING',
    'city': 'Original city',
    'phone': '+910000000000',
  };
  void profileTest(String name, WidgetTesterCallback body) {
    testWidgets(name, (tester) async {
      fixture = Fixture();
      try {
        await body(tester);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.dispose();
        await tester.pump();
      }
    });
  }

  Future<void> open(WidgetTester tester) async {
    await fixture.signIn(tester);
    await tester.pumpWidget(
      MaterialApp(home: WorkspaceProfileScreen(repository: fixture.repository)),
    );
    await tester.pumpAndSettle();
  }

  Future<void> edit(WidgetTester tester) async {
    await tester.tap(find.text('Edit city and contact phone'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextFormField, 'City'),
      'Updated city',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Phone'),
      '+910000000001',
    );
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();
  }

  profileTest(
    'contact update uses existing API and requires independent readback',
    (tester) async {
      var current = profile();
      fixture.initialize();
      fixture.transport.reply = (request) {
        if (request.method == 'PATCH') {
          final body = jsonDecode(request.body!) as Map;
          expect(body.keys.toSet(), {'city', 'phone'});
          current = {...current, ...Map<String, dynamic>.from(body)};
        }
        return json({'profile': current});
      };
      await open(tester);
      expect(find.text('Synthetic owner'), findsOneWidget);
      expect(find.text('Property owner'), findsOneWidget);
      await edit(tester);
      final calls = fixture.transport.requests
          .where((r) => r.uri.path == '/api/mobile/account')
          .toList();
      expect(calls.map((r) => r.method), ['GET', 'PATCH', 'GET']);
      expect(find.text('City: Updated city'), findsOneWidget);
      expect(find.text('Contact phone: +910000000001'), findsOneWidget);
      expect(find.text('Profile updated.'), findsOneWidget);
    },
  );

  profileTest('unconfirmed update cannot claim success or repeat the write', (
    tester,
  ) async {
    fixture.initialize();
    fixture.transport.reply = (_) => json({'profile': profile()});
    await open(tester);
    await edit(tester);
    expect(find.text('Profile updated.'), findsNothing);
    expect(find.textContaining('could not be confirmed'), findsOneWidget);
    final editButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Edit city and contact phone'),
    );
    expect(editButton.onPressed, isNull);
    expect(
      fixture.transport.requests.where((r) => r.method == 'PATCH'),
      hasLength(1),
    );
    await tester.tap(find.byTooltip('Refresh profile'));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where((r) => r.method == 'PATCH'),
      hasLength(1),
    );
    expect(find.text('City: Original city'), findsOneWidget);
  });

  profileTest('logout discards a delayed profile response', (tester) async {
    final delayed = Completer<ApiResponse>();
    fixture.initialize();
    fixture.transport.reply = (_) => delayed.future;
    await fixture.signIn(tester);
    await tester.pumpWidget(
      MaterialApp(home: WorkspaceProfileScreen(repository: fixture.repository)),
    );
    await tester.pump();
    fixture.controller.clearLocalSession();
    delayed.complete(json({'profile': profile()}));
    await tester.pumpAndSettle();
    expect(find.text('Synthetic owner'), findsNothing);
    expect(find.text('Sign in again to view your profile.'), findsOneWidget);
  });
  for (final switchAccount in [false, true]) {
    profileTest(
      'open contact editor clears prior account on switch=$switchAccount',
      (tester) async {
        fixture.initialize();
        fixture.transport.reply = (_) => json({'profile': profile()});
        await open(tester);
        await tester.tap(find.text('Edit city and contact phone'));
        await tester.pumpAndSettle();
        expect(find.text('Original city'), findsOneWidget);
        final staleSave = tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Save changes'),
            )
            .onPressed!;
        if (switchAccount) {
          fixture.transport.identity = 'user-0002';
          await fixture.signIn(tester);
        } else {
          fixture.controller.clearLocalSession();
        }
        await tester.pumpAndSettle();
        expect(find.text('Original city'), findsNothing);
        expect(find.byType(TextFormField), findsNothing);
        staleSave();
        await tester.pumpAndSettle();
        expect(
          find.text('Your session ended. Sign in again to edit your profile.'),
          findsOneWidget,
        );
        expect(
          fixture.transport.requests.where((r) => r.method == 'PATCH'),
          isEmpty,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
