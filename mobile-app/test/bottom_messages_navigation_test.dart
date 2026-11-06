import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/engagement/engagement_screens.dart';
import 'package:homezone_mobile/features/marketplace/marketplace_screen.dart';

import 'marketplace_test.dart' show Fixture, json;

const _conversation = {
  'id': 'conversation-0001',
  'propertyId': 'property-0001',
  'propertyTitle': 'Synthetic property',
  'peerName': 'Synthetic owner',
  'blocked': false,
  'blockedByMe': false,
  'updatedAt': '2026-11-05T08:00:00.000Z',
};

ApiResponse _catalogue() =>
    json({'source': 'database', 'page': 1, 'hasMore': false, 'properties': []});

Finder _tab(String label) => find.byWidgetPredicate(
  (widget) => widget is NavigationDestination && widget.label == label,
);

void main() {
  late Fixture fixture;
  tearDown(() => fixture.controller.dispose());

  Future<void> signIn(WidgetTester tester) async {
    final operation = fixture.controller.beginSignIn(
      'synthetic@example.invalid',
      'SyntheticPassword123',
    );
    await tester.pump();
    expect((await operation.result).verified, isTrue);
  }

  Future<void> show(WidgetTester tester, {bool authenticated = true}) async {
    if (authenticated) await signIn(tester);
    await tester.pumpWidget(
      MaterialApp(home: MarketplaceScreen(repository: fixture.repository)),
    );
    await tester.pumpAndSettle();
  }

  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    fixture.controller.dispose();
    await tester.pump();
  }

  testWidgets(
    'Buyer bottom Messages opens the existing inbox and restores its tab after chat',
    (tester) async {
      fixture = Fixture();
      fixture.transport.reply = (request) {
        if (request.uri.path == '/api/mobile/properties') return _catalogue();
        if (request.uri.path == '/api/mobile/conversations') {
          return json({
            'conversations': [_conversation],
          });
        }
        if (request.uri.path.endsWith('/messages')) {
          return json({
            'messages': [],
            'nextCursor': null,
            'hasMore': false,
            'blocked': false,
            'blockedByMe': false,
            'propertyTitle': 'Synthetic property',
          });
        }
        return json({'items': []});
      };
      await show(tester);
      await tester.tap(_tab('Messages'));
      await tester.pumpAndSettle();
      expect(find.byType(ConversationListScreen), findsOneWidget);
      expect(find.text('Synthetic owner'), findsOneWidget);
      final navigation = tester.widget<NavigationBar>(
        find.byType(NavigationBar),
      );
      expect(
        navigation.destinations.cast<NavigationDestination>().map(
          (item) => item.label,
        ),
        ['Home', 'Search', 'Saved', 'Messages', 'Profile'],
      );
      expect(navigation.selectedIndex, 3);
      expect(
        fixture.transport.requests
            .singleWhere((r) => r.uri.path == '/api/mobile/conversations')
            .headers
            .containsKey('cookie'),
        isTrue,
      );

      await tester.tap(find.text('Synthetic owner'));
      await tester.pumpAndSettle();
      expect(find.byType(ConversationScreen), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byType(ConversationListScreen), findsOneWidget);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        3,
      );

      await tester.tap(_tab('Home'));
      await tester.pumpAndSettle();
      final inboxCalls = fixture.transport.requests
          .where((r) => r.uri.path == '/api/mobile/conversations')
          .length;
      await tester.pump(const Duration(seconds: 5));
      expect(
        fixture.transport.requests
            .where((r) => r.uri.path == '/api/mobile/conversations')
            .length,
        inboxCalls,
      );
      expect(find.byType(ConversationListScreen), findsNothing);
      await close(tester);
    },
  );

  testWidgets('Buyer can open Messages while the public catalogue is pending', (
    tester,
  ) async {
    fixture = Fixture();
    final pending = Completer<ApiResponse>();
    fixture.transport.reply = (request) {
      if (request.uri.path == '/api/mobile/properties') return pending.future;
      if (request.uri.path == '/api/mobile/conversations') {
        return json({'conversations': []});
      }
      return json({'items': []});
    };
    await signIn(tester);
    await tester.pumpWidget(
      MaterialApp(home: MarketplaceScreen(repository: fixture.repository)),
    );
    await tester.pump();
    await tester.tap(_tab('Messages'));
    await tester.pumpAndSettle();
    expect(find.text('No conversations yet'), findsOneWidget);
    pending.complete(json({'error': 'Synthetic catalogue unavailable'}, 503));
    await tester.pumpAndSettle();
    expect(find.byType(ConversationListScreen), findsOneWidget);
    expect(find.text('No conversations yet'), findsOneWidget);
    expect(
      find.textContaining('Synthetic catalogue unavailable'),
      findsNothing,
    );
    await close(tester);
  });

  testWidgets(
    'Buyer Messages rejects a late inbox after logout and never fetches private data anonymously',
    (tester) async {
      fixture = Fixture();
      final pending = Completer<ApiResponse>();
      fixture.transport.reply = (request) {
        if (request.uri.path == '/api/mobile/properties') return _catalogue();
        if (request.uri.path == '/api/mobile/conversations') {
          return pending.future;
        }
        return json({'items': []});
      };
      await show(tester);
      await tester.tap(_tab('Messages'));
      await tester.pump();
      fixture.controller.clearLocalSession();
      pending.complete(
        json({
          'conversations': [_conversation],
        }),
      );
      await tester.pumpAndSettle();
      expect(find.text('Synthetic owner'), findsNothing);
      expect(find.byType(ConversationListScreen), findsNothing);
      expect(
        find.text(
          'Sign in to access your account. Offline preview data is separate.',
        ),
        findsOneWidget,
      );
      final calls = fixture.transport.requests
          .where((r) => r.uri.path == '/api/mobile/conversations')
          .length;
      await tester.tap(_tab('Home'));
      await tester.pumpAndSettle();
      await tester.tap(_tab('Messages'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));
      expect(
        fixture.transport.requests
            .where((r) => r.uri.path == '/api/mobile/conversations')
            .length,
        calls,
      );
      await close(tester);
    },
  );
}
