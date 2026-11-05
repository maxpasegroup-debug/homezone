import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/session_scope.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/core/api/api_transport.dart';
import 'package:homezone_mobile/features/engagement/engagement_repository.dart';
import 'package:homezone_mobile/features/engagement/engagement_screens.dart';

import 'marketplace_test.dart' show Fixture, json;

const _conversationId = 'conversation-0001';
Map<String, dynamic> _conversation() => {
  'id': _conversationId,
  'propertyId': 'property-0001',
  'propertyTitle': 'Synthetic property',
  'peerName': 'Synthetic owner',
  'blocked': false,
  'blockedByMe': false,
  'updatedAt': '2026-11-05T08:00:00.000Z',
};
Map<String, dynamic> _message(String id, String body, {bool mine = true}) => {
  'id': id,
  'body': body,
  'mine': mine,
  'createdAt': '2026-11-05T08:00:00.000Z',
};
Map<String, dynamic> _messages({
  List<Map<String, dynamic>> messages = const [],
}) => {
  'messages': messages,
  'nextCursor': messages.isEmpty ? null : messages.last['id'],
  'hasMore': false,
  'blocked': false,
  'blockedByMe': false,
  'propertyTitle': 'Synthetic property',
};
Map<String, dynamic> _membership() => {
  'plan': {
    'code': 'BUYER_PLUS',
    'name': 'HomeZone Plus',
    'amount': 29900,
    'currency': 'INR',
    'durationDays': 30,
    'contactLimit': 10,
  },
  'eligible': true,
  'active': null,
  'mobileCheckoutAvailable': false,
  'checkoutNotice': 'Purchases are not available in this app yet.',
};

void main() {
  late Fixture fixture;
  void scenario(String name, WidgetTesterCallback body) {
    testWidgets(name, (tester) async {
      fixture = Fixture();
      try {
        await body(tester);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.controller.dispose();
        await tester.pump();
      }
    });
  }

  Future<void> signIn(WidgetTester tester) async {
    final operation = fixture.controller.beginSignIn(
      'synthetic@example.invalid',
      'SyntheticPassword123',
    );
    await tester.pump();
    expect((await operation.result).verified, true);
  }

  Future<void> show(WidgetTester tester, Widget screen) async {
    await signIn(tester);
    await tester.pumpWidget(MaterialApp(home: screen));
    await tester.pumpAndSettle();
  }

  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  }

  scenario('plans use authenticated API and cannot grant a fake subscription', (
    tester,
  ) async {
    fixture.transport.reply = (_) => json(_membership());
    await show(tester, MembershipScreen(repository: fixture.repository));
    expect(find.text('HomeZone Plus'), findsOneWidget);
    expect(find.text('₹299 · 30 days'), findsOneWidget);
    final purchase = find.widgetWithText(
      FilledButton,
      'Purchases unavailable in this build',
    );
    await tester.ensureVisible(purchase);
    expect(tester.widget<FilledButton>(purchase).onPressed, isNull);
    final calls = fixture.transport.requests
        .where((r) => r.uri.path == '/api/mobile/membership')
        .toList();
    expect(calls.single.method, 'GET');
    expect(calls.single.headers.containsKey('cookie'), true);
    expect(
      fixture.transport.requests.where((r) => r.uri.path.contains('checkout')),
      isEmpty,
    );
    await close(tester);
  });

  scenario('delayed membership cannot restore content after logout', (
    tester,
  ) async {
    final response = Completer<ApiResponse>();
    fixture.transport.reply = (_) => response.future;
    await signIn(tester);
    await tester.pumpWidget(
      MaterialApp(home: MembershipScreen(repository: fixture.repository)),
    );
    await tester.pump();
    fixture.controller.clearLocalSession();
    response.complete(json(_membership()));
    await tester.pumpAndSettle();
    expect(find.text('HomeZone Plus'), findsNothing);
    expect(find.text('Your session changed. Sign in again.'), findsOneWidget);
    await close(tester);
  });

  scenario(
    'contact eligibility read never spends credit; unlock requires confirmation',
    (tester) async {
      fixture.transport.reply = (request) => json(
        request.method == 'GET'
            ? {'status': 'available', 'alreadyUnlocked': false, 'remaining': 10}
            : {
                'status': 'available',
                'phone': '+910000000000',
                'alreadyUnlocked': false,
                'remaining': 9,
              },
      );
      await show(
        tester,
        PropertyContactActions(
          repository: fixture.repository,
          propertyId: 'property-0001',
        ),
      );
      await tester.tap(find.text('View Owner’s Number'));
      await tester.pumpAndSettle();
      expect(find.text('Unlock owner contact?'), findsOneWidget);
      expect(
        fixture.transport.requests.where(
          (r) => r.uri.path.endsWith('/contact') && r.method == 'POST',
        ),
        isEmpty,
      );
      await tester.tap(find.text('Unlock contact'));
      await tester.pumpAndSettle();
      expect(find.text('+910000000000'), findsOneWidget);
      final posts = fixture.transport.requests
          .where((r) => r.uri.path.endsWith('/contact') && r.method == 'POST')
          .toList();
      expect(posts, hasLength(1));
      expect(posts.single.body, isNull);
      fixture.controller.clearLocalSession();
      await tester.pumpAndSettle();
      expect(find.text('+910000000000'), findsNothing);
      await close(tester);
    },
  );

  scenario(
    'free account sees plan requirement without spending or fabricating a number',
    (tester) async {
      fixture.transport.reply = (_) => json({'status': 'plan_required'});
      await show(
        tester,
        PropertyContactActions(
          repository: fixture.repository,
          propertyId: 'property-0001',
        ),
      );
      await tester.tap(find.text('View Owner’s Number'));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Plus membership is required to unlock owner contact numbers.',
        ),
        findsOneWidget,
      );
      expect(find.text('View plans'), findsOneWidget);
      expect(
        fixture.transport.requests.where(
          (r) => r.uri.path.endsWith('/contact') && r.method == 'POST',
        ),
        isEmpty,
      );
      await close(tester);
    },
  );

  scenario(
    'uncertain message requires explicit idempotent retry and no automatic POST',
    (tester) async {
      final attempts = <Map<String, dynamic>>[];
      fixture.transport.reply = (request) {
        if (request.method == 'POST') {
          attempts.add(jsonDecode(request.body!) as Map<String, dynamic>);
          if (attempts.length == 1) {
            throw const SocketException('Synthetic transport failure');
          }
          return json({
            'message': _message('message-0001', 'Is this property available?'),
          });
        }
        return json(_messages());
      };
      await show(
        tester,
        ConversationScreen(
          repository: fixture.repository,
          conversation: Conversation.parse(_conversation()),
        ),
      );
      await tester.enterText(
        find.byType(TextField),
        'Is this property available?',
      );
      await tester.tap(find.text('Send message'));
      await tester.pumpAndSettle();
      expect(find.text('Retry same message'), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(attempts, hasLength(1));
      await tester.tap(find.text('Retry same message'));
      await tester.pumpAndSettle();
      expect(attempts, hasLength(2));
      expect(attempts[1], attempts[0]);
      expect(
        attempts[0]['clientMessageId'],
        matches(RegExp(r'^[A-Za-z0-9_-]{8,128}$')),
      );
      expect(find.text('Is this property available?'), findsOneWidget);
      expect(find.text('Retry same message'), findsNothing);
      await close(tester);
    },
  );

  scenario('private messages deduplicate polling and clear on account change', (
    tester,
  ) async {
    fixture.transport.reply = (_) => json(
      _messages(
        messages: [_message('message-0001', 'Private synthetic message')],
      ),
    );
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.text('Private synthetic message'), findsOneWidget);
    fixture.controller.clearLocalSession();
    await tester.pumpAndSettle();
    expect(find.text('Private synthetic message'), findsNothing);
    expect(find.byType(TextField), findsNothing);
    await close(tester);
  });

  scenario(
    'chat polling stops while covered and resumes when its route is visible',
    (tester) async {
      final observer = SessionRouteObserver();
      final navigator = GlobalKey<NavigatorState>();
      fixture.transport.reply = (_) => json(_messages());
      await signIn(tester);
      await tester.pumpWidget(
        SessionScope(
          controller: fixture.controller,
          routeObserver: observer,
          child: MaterialApp(
            navigatorKey: navigator,
            navigatorObservers: [observer],
            home: ConversationScreen(
              repository: fixture.repository,
              conversation: Conversation.parse(_conversation()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      int reads() => fixture.transport.requests
          .where((r) => r.uri.path.endsWith('/messages'))
          .length;
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => const Scaffold(body: Text('Other screen')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final before = reads();
      await tester.pump(const Duration(seconds: 10));
      await tester.pumpAndSettle();
      expect(reads(), before);
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(reads(), greaterThan(before));
      await close(tester);
    },
  );

  scenario(
    'contact preference starts chat-only and never copies profile phone',
    (tester) async {
      var preference = <String, dynamic>{
        'phone': null,
        'sharingEnabled': false,
        'consentVersion': null,
      };
      Map<String, dynamic>? patch;
      fixture.transport.reply = (request) {
        if (request.method == 'PATCH') {
          patch = jsonDecode(request.body!) as Map<String, dynamic>;
          preference = {
            'phone': patch!['phone'],
            'sharingEnabled': patch!['sharingEnabled'],
            'consentVersion': 'owner-contact-sharing-v1',
          };
        }
        return json(preference);
      };
      await show(tester, ContactPrivacyScreen(repository: fixture.repository));
      final phone = tester.widget<TextFormField>(find.byType(TextFormField));
      expect(phone.controller!.text, '');
      await tester.enterText(find.byType(TextFormField), '+910000000000');
      await tester.tap(find.byType(SwitchListTile));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Save preferences'));
      await tester.tap(find.text('Save preferences'));
      await tester.pumpAndSettle();
      expect(patch, isNull);
      expect(
        find.text('Please confirm permission to share this contact number.'),
        findsOneWidget,
      );
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Save preferences'));
      await tester.tap(find.text('Save preferences'));
      await tester.pumpAndSettle();
      expect(patch, {
        'phone': '+910000000000',
        'sharingEnabled': true,
        'consentAccepted': true,
      });
      expect(find.text('Contact sharing preferences saved.'), findsOneWidget);
      await close(tester);
    },
  );

  scenario('private polling pauses in background and resumes in foreground', (
    tester,
  ) async {
    fixture.transport.reply = (_) => json(_messages());
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    int reads() => fixture.transport.requests
        .where((r) => r.uri.path.endsWith('/messages'))
        .length;
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump();
    final before = reads();
    await tester.pump(const Duration(seconds: 10));
    expect(reads(), before);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(reads(), greaterThan(before));
    await close(tester);
  });

  scenario('message refresh respects Retry-After including manual retry', (
    tester,
  ) async {
    fixture.transport.reply = (_) =>
        const ApiResponse(429, '{}', retryAfter: '60');
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    int reads() => fixture.transport.requests
        .where((r) => r.uri.path.endsWith('/messages'))
        .length;
    final before = reads();
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 10));
    await tester.pumpAndSettle();
    expect(reads(), before);
    await close(tester);
  });

  scenario('report form clears private draft on logout and cannot submit', (
    tester,
  ) async {
    fixture.transport.reply = (_) => json(_messages());
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Report conversation'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'What happened?'),
      'Private synthetic report draft',
    );
    fixture.controller.clearLocalSession();
    await tester.pumpAndSettle();
    expect(find.text('Private synthetic report draft'), findsNothing);
    expect(find.text('Submit report'), findsNothing);
    expect(
      fixture.transport.requests.where(
        (r) =>
            r.uri.path == '/api/mobile/conversations/$_conversationId' &&
            r.method == 'POST',
      ),
      isEmpty,
    );
    await close(tester);
  });

  test('malformed contact and membership responses are rejected', () {
    expect(
      () => OwnerContact.parse({
        'status': 'plan_required',
        'phone': '+910000000000',
      }),
      throwsA(isA<ApiException>()),
    );
    final invalid = _membership();
    invalid['active'] = {
      'expiresAt': '2026-12-05T08:00:00Z',
      'contactLimit': 10,
      'used': 8,
      'remaining': 10,
    };
    expect(() => Membership.parse(invalid), throwsA(isA<ApiException>()));
  });
}
