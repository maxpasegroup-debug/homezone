import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/core/api/api_client.dart';
import 'package:homezone_mobile/features/engagement/engagement_repository.dart';

import 'marketplace_test.dart' show Fixture, json;

const _messageId = 'message-0001';
const _secondId = 'message-0002';
const _conversationId = 'conversation-0001';
const _created = '2026-11-05T08:00:00.000Z';
const _delivered = '2026-11-05T08:00:01.000Z';
const _read = '2026-11-05T08:00:02.000Z';

Map<String, dynamic> _message() => {
  'id': _messageId,
  'body': 'Synthetic message',
  'mine': true,
  'createdAt': _created,
};

Map<String, dynamic> _receipt({
  String id = _messageId,
  String? deliveredAt,
  String? readAt,
}) => {'id': id, 'deliveredAt': deliveredAt, 'readAt': readAt};

Map<String, dynamic> _page() => {
  'messages': [_message()],
  'nextCursor': _messageId,
  'hasMore': false,
  'blocked': false,
  'blockedByMe': false,
  'propertyTitle': 'Synthetic property',
};

final _invalid = throwsA(
  isA<ApiException>().having(
    (error) => error.failure,
    'failure',
    ApiFailure.invalidResponse,
  ),
);

void main() {
  test(
    'legacy history and send results never invent delivered/read status',
    () {
      final message = ChatMessage.parse(_message());
      expect(message.deliveredAt, isNull);
      expect(message.readAt, isNull);
      final page = MessagePage.parse(_page());
      expect(page.receiptsSupported, false);
      expect(page.receipts, isEmpty);
      expect(page.messages.single.readAt, isNull);
    },
  );

  test('receipt parsing requires real delivery before read', () {
    for (final invalid in [
      _receipt(readAt: _read),
      _receipt(deliveredAt: _read, readAt: _delivered),
      {..._receipt(), 'deliveredAt': 'invalid date'},
      {..._receipt(), 'readAt': true},
      {..._receipt(), 'id': 'bad'},
    ]) {
      expect(() => MessageReceipt.parse(invalid), _invalid);
    }
    final receipt = MessageReceipt.parse(
      _receipt(deliveredAt: _delivered, readAt: _read),
    );
    expect(receipt.deliveredAt, DateTime.parse(_delivered));
    expect(receipt.readAt, DateTime.parse(_read));
  });

  test('message receipt timestamps cannot precede message creation', () {
    expect(
      () => ChatMessage.parse({
        ..._message(),
        'deliveredAt': '2026-11-05T07:59:59.000Z',
      }),
      _invalid,
    );
    final message = ChatMessage.parse(_message());
    expect(
      () => message.withReceipt(
        MessageReceipt.parse(_receipt(deliveredAt: '2026-11-05T07:59:59.000Z')),
      ),
      _invalid,
    );
  });

  test(
    'out-of-order receipt merging preserves confirmed status and identity',
    () {
      final original = ChatMessage.parse(_message());
      final received = original.withReceipt(
        MessageReceipt.parse(_receipt(deliveredAt: _delivered)),
      );
      final read = received.withReceipt(
        MessageReceipt.parse(_receipt(deliveredAt: _delivered, readAt: _read)),
      );
      final stale = read.withReceipt(MessageReceipt.parse(_receipt()));
      expect(stale.deliveredAt, DateTime.parse(_delivered));
      expect(stale.readAt, DateTime.parse(_read));
      expect(stale.body, original.body);
      expect(stale.mine, original.mine);
      expect(stale.createdAt, original.createdAt);
      final later = stale.withReceipt(
        MessageReceipt.parse(
          _receipt(
            deliveredAt: '2026-11-05T08:00:03.000Z',
            readAt: '2026-11-05T08:00:04.000Z',
          ),
        ),
      );
      expect(later.deliveredAt, DateTime.parse(_delivered));
      expect(later.readAt, DateTime.parse(_read));
      expect(
        () =>
            original.withReceipt(MessageReceipt.parse(_receipt(id: _secondId))),
        _invalid,
      );
    },
  );

  test(
    'history receipt capability is explicit and receipt rows are bounded',
    () {
      final receipt = _receipt(deliveredAt: _delivered, readAt: _read);
      expect(
        () => MessagePage.parse({
          ..._page(),
          'receipts': [receipt],
        }),
        _invalid,
      );
      expect(
        () => MessagePage.parse({
          ..._page(),
          'messages': [
            {..._message(), 'deliveredAt': _delivered},
          ],
        }),
        _invalid,
      );
      final page = MessagePage.parse({
        ..._page(),
        'receiptsSupported': true,
        'receipts': [receipt],
      });
      expect(page.receiptsSupported, true);
      expect(page.receipts.single.readAt, DateTime.parse(_read));
      for (final rows in [
        [receipt, receipt],
        List.generate(51, (index) => _receipt(id: 'message-${1000 + index}')),
      ]) {
        expect(
          () => MessagePage.parse({
            ..._page(),
            'receiptsSupported': true,
            'receipts': rows,
          }),
          _invalid,
        );
      }
    },
  );

  group('receipt repository contracts', () {
    late Fixture fixture;
    late EngagementRepository repository;
    setUp(() async {
      fixture = Fixture();
      await fixture.signIn();
      repository = EngagementRepository(fixture.repository);
    });
    tearDown(() => fixture.controller.dispose());

    test(
      'poll requests exact receipt IDs on the existing authenticated client',
      () async {
        fixture.transport.reply = (_) => json({
          ..._page(),
          'receiptsSupported': true,
          'receipts': [_receipt(deliveredAt: _delivered)],
        });
        final page = await repository.messages(
          _conversationId,
          after: _messageId,
          receiptIds: [_messageId, _secondId],
        );
        expect(page.receipts, hasLength(1));
        final request = fixture.transport.requests.last;
        expect(
          request.uri.path,
          '/api/mobile/conversations/$_conversationId/messages',
        );
        expect(request.uri.queryParameters['after'], _messageId);
        expect(
          request.uri.queryParameters['receiptIds'],
          '$_messageId,$_secondId',
        );
        expect(request.headers.containsKey('cookie'), true);
        await expectLater(
          repository.messages(_conversationId, receiptIds: [_secondId]),
          _invalid,
        );
      },
    );

    test('invalid or duplicated request IDs do not reach transport', () async {
      final count = fixture.transport.requests.length;
      for (final ids in [
        [_messageId, _messageId],
        ['bad'],
        List.generate(51, (index) => 'message-${1000 + index}'),
      ]) {
        await expectLater(
          repository.messages(_conversationId, receiptIds: ids),
          _invalid,
        );
      }
      await expectLater(repository.acknowledge(_conversationId), _invalid);
      expect(fixture.transport.requests.length, count);
    });

    test(
      'ACK posts exact delivered/read IDs and requires matching server acknowledgments',
      () async {
        fixture.transport.reply = (_) => json({
          'receipts': [
            _receipt(deliveredAt: _delivered, readAt: _read),
            _receipt(id: _secondId, deliveredAt: _delivered),
          ],
        });
        final receipts = await repository.acknowledge(
          _conversationId,
          deliveredIds: [_messageId, _secondId],
          readIds: [_messageId],
        );
        expect(receipts, hasLength(2));
        final request = fixture.transport.requests.last;
        expect(request.method, 'POST');
        expect(
          request.uri.path,
          '/api/mobile/conversations/$_conversationId/receipts',
        );
        expect(jsonDecode(request.body!), {
          'deliveredIds': [_messageId, _secondId],
          'readIds': [_messageId],
        });
        expect(request.headers.containsKey('cookie'), true);
        for (final rows in [
          <Map<String, dynamic>>[],
          [_receipt(id: _secondId, deliveredAt: _delivered, readAt: _read)],
          [_receipt(deliveredAt: _delivered)],
          [_receipt(deliveredAt: _delivered, readAt: _read), _receipt()],
        ]) {
          fixture.transport.reply = (_) => json({'receipts': rows});
          await expectLater(
            repository.acknowledge(_conversationId, readIds: [_messageId]),
            _invalid,
          );
        }
      },
    );
  });
}
