import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart';

import 'marketplace_test.dart' show Fixture, json;

// Synthetic credentials and an in-process transport only; no live requests.
void main() {
  for (final systemBack in [false, true]) {
    testWidgets(
      '${systemBack ? 'System' : 'App-bar'} Back leaves pending Buyer enquiries and ignores its late account result',
      (tester) async {
        // The fixture clock and coordinator must share the widget-test zone.
        final fixture = Fixture();
        final pending = Completer<ApiResponse>();
        var holdProfile = false;
        var pendingReads = 0;
        fixture.transport.reply = (request) {
          if (request.uri.path == '/api/mobile/properties') {
            return json({
              'source': 'database',
              'page': 1,
              'hasMore': false,
              'properties': [],
            });
          }
          if (request.uri.path == '/api/mobile/account') {
            if (holdProfile) {
              pendingReads++;
              return pending.future;
            }
            return json({
              'profile': {'fullName': 'Synthetic Buyer', 'role': 'USER'},
            });
          }
          if (request.uri.path == '/api/mobile/account/collections') {
            return json({
              'collection': request.uri.queryParameters['collection'],
              'parent': null,
              'items': [],
              'nextCursor': null,
            });
          }
          return json({'items': []});
        };
        try {
          final operation = fixture.controller.beginSignIn(
            'synthetic@example.invalid',
            'SyntheticPassword123',
          );
          await tester.pump();
          expect((await operation.result).verified, isTrue);
          await tester.pumpWidget(
            MaterialApp(
              home: MarketplaceScreen(repository: fixture.repository),
            ),
          );
          await tester.pumpAndSettle();
          final profileTab = find.byWidgetPredicate(
            (widget) =>
                widget is NavigationDestination && widget.label == 'Profile',
          );
          await tester.tap(profileTab);
          await tester.pumpAndSettle();
          expect(find.text('Synthetic Buyer'), findsOneWidget);
          final enquiries = find.text('My Enquiries').hitTestable();
          await tester.scrollUntilVisible(enquiries, 220);
          await tester.pumpAndSettle();
          holdProfile = true;
          await tester.tap(enquiries);
          await tester.pump();
          expect(pendingReads, 1);
          expect(pending.isCompleted, isFalse);
          expect(find.byType(BackButton), findsOneWidget);

          if (systemBack) {
            await tester.binding.handlePopRoute();
          } else {
            await tester.tap(find.byType(BackButton));
          }
          await tester.pumpAndSettle();
          expect(pending.isCompleted, isFalse);
          expect(find.byType(BackButton), findsNothing);
          expect(find.widgetWithText(AppBar, 'Profile'), findsOneWidget);
          await tester.drag(
            find.byKey(const PageStorageKey('marketplace-4')),
            const Offset(0, 1400),
          );
          await tester.pumpAndSettle();
          expect(find.text('My Profile'), findsOneWidget);
          expect(find.text('Synthetic Buyer'), findsOneWidget);
          expect(
            tester
                .widget<NavigationBar>(find.byType(NavigationBar))
                .selectedIndex,
            4,
          );

          holdProfile = false;
          pending.complete(
            json({
              'profile': {'fullName': 'Late stale profile', 'role': 'USER'},
            }),
          );
          await tester.pumpAndSettle();
          expect(find.text('Late stale profile'), findsNothing);
          expect(find.text('My Profile'), findsOneWidget);
          expect(find.text('Synthetic Buyer'), findsOneWidget);
          expect(
            tester
                .widget<NavigationBar>(find.byType(NavigationBar))
                .selectedIndex,
            4,
          );
          expect(tester.takeException(), isNull);
        } finally {
          if (!pending.isCompleted) pending.complete(json({}, 503));
          await tester.pumpWidget(const SizedBox.shrink());
          fixture.controller.dispose();
        }
      },
    );
  }
}
