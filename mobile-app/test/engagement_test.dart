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
  bool receiptsSupported = false,
  List<Map<String, dynamic>> receipts = const [],
}) => {
  'messages': messages,
  'nextCursor': messages.isEmpty ? null : messages.last['id'],
  'hasMore': false,
  'blocked': false,
  'blockedByMe': false,
  'propertyTitle': 'Synthetic property',
  if (receiptsSupported) ...{'receiptsSupported': true, 'receipts': receipts},
};
Map<String, dynamic> _receipt(
  String id, {
  bool delivered = false,
  bool read = false,
}) => {
  'id': id,
  'deliveredAt': delivered || read ? '2026-11-05T08:00:01.000Z' : null,
  'readAt': read ? '2026-11-05T08:00:02.000Z' : null,
};
ApiResponse _acknowledge(ApiRequest request) {
  final payload = jsonDecode(request.body!) as Map<String, dynamic>;
  final delivered = (payload['deliveredIds'] as List).cast<String>().toSet();
  final read = (payload['readIds'] as List).cast<String>().toSet();
  return json({
    'receipts': [
      for (final id in {...delivered, ...read})
        _receipt(
          id,
          delivered: delivered.contains(id),
          read: read.contains(id),
        ),
    ],
  });
}

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
      await tester.tap(find.byTooltip('Send message'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Retry same message'), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(attempts, hasLength(1));
      await tester.tap(find.byTooltip('Retry same message'));
      await tester.pumpAndSettle();
      expect(attempts, hasLength(2));
      expect(attempts[1], attempts[0]);
      expect(
        attempts[0]['clientMessageId'],
        matches(RegExp(r'^[A-Za-z0-9_-]{8,128}$')),
      );
      expect(find.text('Is this property available?'), findsOneWidget);
      expect(find.byTooltip('Retry same message'), findsNothing);
      await close(tester);
    },
  );

  scenario('property chat starts once and opens the returned conversation', (
    tester,
  ) async {
    final started = Completer<ApiResponse>();
    fixture.transport.reply = (request) {
      if (request.method == 'POST') return started.future;
      return json(_messages());
    };
    await show(
      tester,
      PropertyContactActions(
        repository: fixture.repository,
        propertyId: 'property-0001',
      ),
    );
    await tester.tap(find.text('Chat with Owner'));
    await tester.pump();
    final posts = fixture.transport.requests
        .where(
          (r) =>
              r.method == 'POST' && r.uri.path == '/api/mobile/conversations',
        )
        .toList();
    expect(posts, hasLength(1));
    expect(posts.single.uri.path, '/api/mobile/conversations');
    expect(jsonDecode(posts.single.body!), {'propertyId': 'property-0001'});
    expect(posts.single.headers.containsKey('cookie'), true);
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    started.complete(json({'conversation': _conversation()}));
    await tester.pumpAndSettle();
    expect(find.text('Property chat'), findsOneWidget);
    expect(find.text('Synthetic property'), findsOneWidget);
    expect(
      fixture.transport.requests.where(
        (r) =>
            r.uri.path == '/api/mobile/conversations/$_conversationId/messages',
      ),
      hasLength(1),
    );
    await close(tester);
  });

  scenario('inbox opens received messages and displays a confirmed reply', (
    tester,
  ) async {
    final incoming = _message(
      'message-0001',
      'Is a visit possible?',
      mine: false,
    );
    final reply = _message('message-0002', 'Yes, please suggest a time.');
    fixture.transport.reply = (request) {
      if (request.uri.path == '/api/mobile/conversations') {
        return json({
          'conversations': [_conversation()],
        });
      }
      if (request.method == 'POST') return json({'message': reply});
      return json(_messages(messages: [incoming]));
    };
    await show(tester, ConversationListScreen(repository: fixture.repository));
    await tester.tap(find.text('Synthetic owner'));
    await tester.pumpAndSettle();
    expect(find.text('Is a visit possible?'), findsOneWidget);
    await tester.enterText(
      find.byType(TextField),
      '  Yes, please suggest a time.  ',
    );
    await tester.tap(find.byTooltip('Send message'));
    await tester.pumpAndSettle();
    final post = fixture.transport.requests.singleWhere(
      (r) => r.method == 'POST' && r.uri.path.endsWith('/messages'),
    );
    final payload = jsonDecode(post.body!) as Map<String, dynamic>;
    expect(payload['body'], 'Yes, please suggest a time.');
    expect(payload.keys.toSet(), {'body', 'clientMessageId'});
    expect(post.headers.containsKey('cookie'), true);
    expect(find.text('Yes, please suggest a time.'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '',
    );
    await close(tester);
  });

  scenario('only message-read responses can advance the history cursor', (
    tester,
  ) async {
    var reads = 0;
    fixture.transport.reply = (request) {
      if (request.method == 'POST') {
        return json({'message': _message('message-0003', 'My sent message')});
      }
      reads++;
      if (reads <= 2) return json(_messages());
      return json(
        _messages(
          messages: [
            _message('message-0002', 'Earlier unseen reply', mine: false),
            _message('message-0003', 'My sent message'),
          ],
        ),
      );
    };
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    await tester.enterText(find.byType(TextField), 'My sent message');
    await tester.tap(find.byTooltip('Send message'));
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
    final readRequests = fixture.transport.requests
        .where((r) => r.method == 'GET' && r.uri.path.endsWith('/messages'))
        .toList();
    expect(readRequests, hasLength(3));
    // A send receipt confirms one message, not a complete history read.
    expect(readRequests.last.uri.queryParameters.containsKey('after'), false);
    expect(find.text('Earlier unseen reply'), findsOneWidget);
    expect(find.text('My sent message'), findsOneWidget);
    await close(tester);
  });

  scenario('composer keeps an accessible send button beside multiline input', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    tester.view.viewInsets = const FakeViewPadding(bottom: 260);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetViewInsets);
    final sent = Completer<ApiResponse>();
    fixture.transport.reply = (request) =>
        request.method == 'POST' ? sent.future : json(_messages());
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    const body =
        'A question about this property.\nLine two.\nLine three.\nLine four.';
    await tester.enterText(find.byType(TextField), body);
    await tester.pumpAndSettle();
    final fieldRect = tester.getRect(find.byType(TextField));
    final sendRect = tester.getRect(find.byTooltip('Send message'));
    expect(sendRect.left, greaterThan(fieldRect.right));
    expect(
      sendRect.center.dy,
      inInclusiveRange(fieldRect.top, fieldRect.bottom),
    );
    expect(sendRect.width, greaterThanOrEqualTo(48));
    expect(sendRect.height, greaterThanOrEqualTo(48));
    expect(sendRect.bottom, lessThanOrEqualTo(380));
    expect(tester.takeException(), isNull);

    await tester.tap(find.byTooltip('Send message'));
    await tester.pump();
    final sendingButton = find.ancestor(
      of: find.byTooltip('Sending…'),
      matching: find.byType(IconButton),
    );
    expect(tester.widget<IconButton>(sendingButton).onPressed, isNull);
    expect(tester.widget<TextField>(find.byType(TextField)).readOnly, true);
    sent.complete(json({'message': _message('message-0001', body)}));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where(
        (r) => r.method == 'POST' && r.uri.path.endsWith('/messages'),
      ),
      hasLength(1),
    );
    expect(find.byTooltip('Send message'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await close(tester);
  });

  scenario('empty polls advance server-confirmed ticks without regression', (
    tester,
  ) async {
    var reads = 0;
    fixture.transport.reply = (request) {
      expect(request.method, 'GET');
      reads++;
      return json(
        _messages(
          messages: reads == 1 || reads == 4
              ? [
                  {
                    ..._message('message-0001', 'A saved outgoing message'),
                    if (reads == 4) 'deliveredAt': '2026-11-05T08:00:01.000Z',
                  },
                ]
              : [],
          receiptsSupported: true,
          receipts: request.uri.queryParameters.containsKey('receiptIds')
              ? [_receipt('message-0001', delivered: true, read: reads == 3)]
              : [],
        ),
      );
    };
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    expect(find.byTooltip('Sent'), findsOneWidget);
    expect(find.byIcon(Icons.check), findsOneWidget);
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Delivered'), findsOneWidget);
    expect(find.byIcon(Icons.done_all), findsOneWidget);
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Read'), findsOneWidget);
    expect(
      tester.widget<Icon>(find.byIcon(Icons.done_all)).color,
      const Color(0xFF168AC0),
    );
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Read'), findsOneWidget);
    expect(find.byTooltip('Delivered'), findsNothing);
    final refresh = fixture.transport.requests.firstWhere(
      (request) => request.uri.queryParameters.containsKey('receiptIds'),
    );
    expect(refresh.uri.queryParameters['receiptIds'], 'message-0001');
    expect(find.text('A saved outgoing message'), findsOneWidget);
    await close(tester);
  });

  scenario(
    'incoming visible messages receive explicit authenticated receipts',
    (tester) async {
      fixture.transport.reply = (request) {
        if (request.uri.path.endsWith('/receipts')) {
          return _acknowledge(request);
        }
        return json(
          _messages(
            messages: [
              _message('message-0001', 'An incoming message', mine: false),
            ],
            receiptsSupported: true,
          ),
        );
      };
      await show(
        tester,
        ConversationScreen(
          repository: fixture.repository,
          conversation: Conversation.parse(_conversation()),
        ),
      );
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();
      final acknowledgments = fixture.transport.requests
          .where((request) => request.uri.path.endsWith('/receipts'))
          .toList();
      expect(acknowledgments, isNotEmpty);
      final delivered = <String>{}, read = <String>{};
      for (final request in acknowledgments) {
        expect(request.method, 'POST');
        expect(request.headers.containsKey('cookie'), true);
        final payload = jsonDecode(request.body!) as Map<String, dynamic>;
        expect(payload.keys.toSet(), {'deliveredIds', 'readIds'});
        delivered.addAll((payload['deliveredIds'] as List).cast<String>());
        read.addAll((payload['readIds'] as List).cast<String>());
      }
      expect({...delivered, ...read}, {'message-0001'});
      expect(read, {'message-0001'});
      expect(find.byTooltip('Sent'), findsNothing);
      expect(find.byTooltip('Delivered'), findsNothing);
      expect(find.byTooltip('Read'), findsNothing);
      await close(tester);
    },
  );

  scenario(
    'offscreen messages are delivered without falsely marking them read',
    (tester) async {
      final incoming = [
        for (var index = 1; index <= 30; index++)
          _message(
            'message-${index.toString().padLeft(4, '0')}',
            'Incoming $index. ${List.filled(70, 'Synthetic').join(' ')}',
            mine: false,
          ),
      ];
      fixture.transport.reply = (request) {
        if (request.uri.path.endsWith('/receipts')) {
          return _acknowledge(request);
        }
        return json(_messages(messages: incoming, receiptsSupported: true));
      };
      await show(
        tester,
        ConversationScreen(
          repository: fixture.repository,
          conversation: Conversation.parse(_conversation()),
        ),
      );
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();
      final delivered = <String>{}, read = <String>{};
      for (final request in fixture.transport.requests.where(
        (request) => request.uri.path.endsWith('/receipts'),
      )) {
        final payload = jsonDecode(request.body!) as Map<String, dynamic>;
        final sentDelivered = (payload['deliveredIds'] as List).cast<String>();
        final sentRead = (payload['readIds'] as List).cast<String>();
        expect({...sentDelivered, ...sentRead}.length, lessThanOrEqualTo(50));
        delivered.addAll(sentDelivered);
        read.addAll(sentRead);
      }
      expect({
        ...delivered,
        ...read,
      }, incoming.map((message) => message['id']).toSet());
      expect(read, isNotEmpty);
      expect(read.length, lessThan(incoming.length));
      expect(read, contains('message-0030'));
      expect(read, isNot(contains('message-0001')));
      await close(tester);
    },
  );

  scenario('background response cannot acknowledge delivery or read', (
    tester,
  ) async {
    var reads = 0;
    final delayed = Completer<ApiResponse>();
    final incoming = _messages(
      messages: [
        _message('message-0001', 'Private background reply', mine: false),
      ],
      receiptsSupported: true,
    );
    fixture.transport.reply = (request) {
      if (request.uri.path.endsWith('/receipts')) return _acknowledge(request);
      reads++;
      if (reads == 1) return json(_messages(receiptsSupported: true));
      if (reads == 2) return delayed.future;
      return json(incoming);
    };
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    await tester.pump(const Duration(seconds: 4));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    delayed.complete(json(incoming));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where((r) => r.uri.path.endsWith('/receipts')),
      isEmpty,
    );
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where((r) => r.uri.path.endsWith('/receipts')),
      isNotEmpty,
    );
    await close(tester);
  });

  scenario('covered route cannot acknowledge a delayed incoming message', (
    tester,
  ) async {
    final observer = SessionRouteObserver();
    final navigator = GlobalKey<NavigatorState>();
    final delayed = Completer<ApiResponse>();
    var reads = 0;
    final incoming = _messages(
      messages: [_message('message-0001', 'Covered reply', mine: false)],
      receiptsSupported: true,
    );
    fixture.transport.reply = (request) {
      if (request.uri.path.endsWith('/receipts')) return _acknowledge(request);
      reads++;
      if (reads == 1) return json(_messages(receiptsSupported: true));
      if (reads == 2) return delayed.future;
      return json(incoming);
    };
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
    await tester.pump(const Duration(seconds: 4));
    unawaited(
      navigator.currentState!.push<void>(
        MaterialPageRoute(
          builder: (_) => const Scaffold(body: Text('Covered')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    delayed.complete(json(incoming));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where((r) => r.uri.path.endsWith('/receipts')),
      isEmpty,
    );
    navigator.currentState!.pop();
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where((r) => r.uri.path.endsWith('/receipts')),
      isNotEmpty,
    );
    await close(tester);
  });

  scenario('delayed receipt cannot restore private messages after logout', (
    tester,
  ) async {
    final delayed = Completer<ApiResponse>();
    fixture.transport.reply = (request) {
      if (request.uri.path.endsWith('/receipts')) return delayed.future;
      return json(
        _messages(
          messages: [
            _message('message-0001', 'Private pending receipt', mine: false),
          ],
          receiptsSupported: true,
        ),
      );
    };
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(
      fixture.transport.requests.where((r) => r.uri.path.endsWith('/receipts')),
      isNotEmpty,
    );
    fixture.controller.clearLocalSession();
    delayed.complete(
      json({
        'receipts': [_receipt('message-0001', read: true)],
      }),
    );
    await tester.pumpAndSettle();
    expect(find.text('Private pending receipt'), findsNothing);
    expect(find.byTooltip('Read'), findsNothing);
    expect(find.text('Your session changed. Sign in again.'), findsOneWidget);
    await close(tester);
  });

  scenario(
    'legacy responses never infer delivery or acknowledge incoming reads',
    (tester) async {
      fixture.transport.reply = (_) => json(
        _messages(
          messages: [
            _message('message-0001', 'Saved legacy outgoing message'),
            _message('message-0002', 'Legacy incoming message', mine: false),
          ],
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
      expect(find.byTooltip('Sent'), findsOneWidget);
      expect(find.byTooltip('Delivered'), findsNothing);
      expect(find.byTooltip('Read'), findsNothing);
      expect(
        fixture.transport.requests.where(
          (r) => r.uri.path.endsWith('/receipts'),
        ),
        isEmpty,
      );
      await close(tester);
    },
  );

  scenario('revoked session clears messages when the next read returns 401', (
    tester,
  ) async {
    var revoked = false;
    fixture.transport.reply = (_) => revoked
        ? json({'error': 'Unauthorized'}, 401)
        : json(
            _messages(messages: [_message('message-0001', 'Private history')]),
          );
    await show(
      tester,
      ConversationScreen(
        repository: fixture.repository,
        conversation: Conversation.parse(_conversation()),
      ),
    );
    expect(find.text('Private history'), findsOneWidget);
    revoked = true;
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
    expect(fixture.controller.verified, false);
    expect(find.text('Private history'), findsNothing);
    expect(find.byType(TextField), findsNothing);
    expect(find.text('Your session changed. Sign in again.'), findsOneWidget);
    await close(tester);
  });

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
