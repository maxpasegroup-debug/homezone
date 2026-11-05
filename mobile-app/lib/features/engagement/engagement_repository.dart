import '../../core/api/api_client.dart';
import '../marketplace/marketplace_repository.dart';

/// Feature contract validation over the existing session-owned API client.
class EngagementRepository {
  const EngagementRepository(this.marketplace);
  final MarketplaceRepository marketplace;

  Future<Membership> membership() async =>
      Membership.parse(await marketplace.call('GET', '/api/mobile/membership'));

  Future<ContactPreferences> preferences() async => ContactPreferences.parse(
    await marketplace.call('GET', '/api/mobile/contact-preferences'),
  );

  Future<ContactPreferences> savePreferences({
    required String phone,
    required bool sharingEnabled,
    required bool consentAccepted,
  }) async => ContactPreferences.parse(
    await marketplace.call(
      'PATCH',
      '/api/mobile/contact-preferences',
      body: {
        'phone': phone.trim(),
        'sharingEnabled': sharingEnabled,
        'consentAccepted': consentAccepted,
      },
    ),
  );

  Future<OwnerContact> contact(
    String propertyId, {
    bool unlock = false,
  }) async => OwnerContact.parse(
    await marketplace.call(
      unlock ? 'POST' : 'GET',
      '/api/mobile/properties/${_id(propertyId)}/contact',
    ),
  );

  Future<List<Conversation>> conversations() async {
    final result = await marketplace.call('GET', '/api/mobile/conversations');
    final rows = objects(result['conversations']);
    if (rows.length > 100) _invalid();
    return rows.map(Conversation.parse).toList(growable: false);
  }

  Future<Conversation> startConversation(String propertyId) async =>
      Conversation.parse(
        object(
          (await marketplace.call(
            'POST',
            '/api/mobile/conversations',
            body: {'propertyId': _id(propertyId)},
          ))['conversation'],
        ),
      );

  Future<MessagePage> messages(
    String conversationId, {
    String? after,
    List<String> receiptIds = const [],
  }) async {
    final ids = _receiptIds(receiptIds);
    final page = MessagePage.parse(
      await marketplace.call(
        'GET',
        '/api/mobile/conversations/${_id(conversationId)}/messages',
        query: {
          if (after != null) 'after': _id(after),
          if (ids.isNotEmpty) 'receiptIds': ids.join(','),
        },
      ),
    );
    if (page.receipts.any((receipt) => !ids.contains(receipt.id))) _invalid();
    return page;
  }

  Future<List<MessageReceipt>> acknowledge(
    String conversationId, {
    List<String> deliveredIds = const [],
    List<String> readIds = const [],
  }) async {
    final delivered = _receiptIds(deliveredIds);
    final read = _receiptIds(readIds);
    final expected = {...delivered, ...read};
    if (expected.isEmpty || expected.length > 50) _invalid();
    final result = await marketplace.call(
      'POST',
      '/api/mobile/conversations/${_id(conversationId)}/receipts',
      body: {'deliveredIds': delivered, 'readIds': read},
    );
    final receipts = _receipts(result['receipts']);
    if (receipts.length != expected.length ||
        receipts.any((receipt) => !expected.contains(receipt.id)) ||
        receipts.any(
          (receipt) =>
              (delivered.contains(receipt.id) && receipt.deliveredAt == null) ||
              (read.contains(receipt.id) && receipt.readAt == null),
        )) {
      _invalid();
    }
    return receipts;
  }

  Future<ChatMessage> send(
    String conversationId,
    String body,
    String clientMessageId,
  ) async => ChatMessage.parse(
    object(
      (await marketplace.call(
        'POST',
        '/api/mobile/conversations/${_id(conversationId)}/messages',
        body: {'body': body, 'clientMessageId': clientMessageId},
      ))['message'],
    ),
  );

  Future<void> block(String conversationId, bool blocked) async {
    final result = await marketplace.call(
      'PATCH',
      '/api/mobile/conversations/${_id(conversationId)}',
      body: {'blocked': blocked},
    );
    if (result['ok'] != true) _invalid();
  }

  Future<void> report(String conversationId, String reason) async {
    final result = await marketplace.call(
      'POST',
      '/api/mobile/conversations/${_id(conversationId)}',
      body: {'reason': reason.trim()},
    );
    if (result['ok'] != true) _invalid();
  }
}

Never _invalid() => throw const ApiException(ApiFailure.invalidResponse);
String _id(Object? value) {
  if (value is! String || !RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(value)) {
    _invalid();
  }
  return value;
}

String _string(Object? value, {int max = 2000, bool empty = false}) {
  if (value is! String ||
      value.length > max ||
      (!empty && value.trim().isEmpty)) {
    _invalid();
  }
  return value;
}

bool _bool(Object? value) => value is bool ? value : _invalid();
int _count(Object? value) => value is int && value >= 0 ? value : _invalid();
DateTime _date(Object? value) {
  final date = value is String ? DateTime.tryParse(value) : null;
  return date ?? _invalid();
}

List<String> _receiptIds(List<String> values) {
  if (values.length > 50 || values.toSet().length != values.length) _invalid();
  return values.map(_id).toList(growable: false);
}

List<MessageReceipt> _receipts(Object? value) {
  if (value is! List || value.length > 50) _invalid();
  final receipts = value
      .map((row) => MessageReceipt.parse(object(row)))
      .toList(growable: false);
  if (receipts.map((row) => row.id).toSet().length != receipts.length) {
    _invalid();
  }
  return receipts;
}

class Membership {
  Membership._(this.eligible, this.active, this.checkoutAvailable, this.notice);
  factory Membership.parse(JsonObject json) {
    final plan = object(json['plan']);
    if (plan['code'] != 'BUYER_PLUS' ||
        plan['amount'] != 29900 ||
        plan['currency'] != 'INR' ||
        plan['durationDays'] != 30 ||
        plan['contactLimit'] != 10) {
      _invalid();
    }
    return Membership._(
      _bool(json['eligible']),
      json['active'] == null
          ? null
          : ActiveMembership.parse(object(json['active'])),
      _bool(json['mobileCheckoutAvailable']),
      _string(json['checkoutNotice'], max: 500, empty: true),
    );
  }
  final bool eligible, checkoutAvailable;
  final ActiveMembership? active;
  final String notice;
}

class ActiveMembership {
  ActiveMembership._(this.expiresAt, this.limit, this.used, this.remaining);
  factory ActiveMembership.parse(JsonObject json) {
    final limit = _count(json['contactLimit']);
    final used = _count(json['used']);
    final remaining = _count(json['remaining']);
    if (used > limit || used + remaining != limit) _invalid();
    return ActiveMembership._(_date(json['expiresAt']), limit, used, remaining);
  }
  final DateTime expiresAt;
  final int limit, used, remaining;
}

class ContactPreferences {
  ContactPreferences._(this.phone, this.sharingEnabled);
  factory ContactPreferences.parse(JsonObject json) {
    final phone = json['phone'];
    if (phone != null) _string(phone, max: 32);
    final enabled = _bool(json['sharingEnabled']);
    if (enabled && phone == null) _invalid();
    return ContactPreferences._(phone as String?, enabled);
  }
  final String? phone;
  final bool sharingEnabled;
}

class OwnerContact {
  OwnerContact._(this.status, this.phone, this.alreadyUnlocked, this.remaining);
  factory OwnerContact.parse(JsonObject json) {
    final status = json['status'];
    if (!{
      'available',
      'plan_required',
      'limit_reached',
      'unavailable',
      'self',
    }.contains(status)) {
      _invalid();
    }
    final phone = json['phone'];
    if (status == 'available' && phone != null) {
      _string(phone, max: 32);
    } else if (phone != null) {
      _invalid();
    }
    return OwnerContact._(
      status as String,
      phone as String?,
      json['alreadyUnlocked'] == null ? false : _bool(json['alreadyUnlocked']),
      json['remaining'] == null ? null : _count(json['remaining']),
    );
  }
  final String status;
  final String? phone;
  final bool alreadyUnlocked;
  final int? remaining;
}

class Conversation {
  Conversation._(
    this.id,
    this.propertyId,
    this.propertyTitle,
    this.peerName,
    this.blockedByMe,
    this.blocked,
    this.updatedAt,
  );
  factory Conversation.parse(JsonObject json) => Conversation._(
    _id(json['id']),
    _id(json['propertyId']),
    _string(json['propertyTitle'], max: 160),
    _string(json['peerName'], max: 160),
    _bool(json['blockedByMe']),
    _bool(json['blocked']),
    _date(json['updatedAt']),
  );
  final String id, propertyId, propertyTitle, peerName;
  final bool blockedByMe, blocked;
  final DateTime updatedAt;
}

class ChatMessage {
  ChatMessage._(
    this.id,
    this.body,
    this.mine,
    this.createdAt,
    this.deliveredAt,
    this.readAt,
  );
  factory ChatMessage.parse(JsonObject json) {
    final receipt = MessageReceipt.parse(json);
    final createdAt = _date(json['createdAt']);
    _validateReceiptCreation(receipt, createdAt);
    return ChatMessage._(
      receipt.id,
      _string(json['body']),
      _bool(json['mine']),
      createdAt,
      receipt.deliveredAt,
      receipt.readAt,
    );
  }
  final String id, body;
  final bool mine;
  final DateTime createdAt;
  final DateTime? deliveredAt, readAt;

  /// Receipts may arrive out of order. Never erase an acknowledged status;
  /// retain the earliest server-confirmed timestamp for each first receipt.
  ChatMessage withReceipt(MessageReceipt receipt) {
    if (receipt.id != id) _invalid();
    _validateReceiptCreation(receipt, createdAt);
    DateTime? first(DateTime? current, DateTime? incoming) {
      if (current == null) return incoming;
      if (incoming == null || current.isBefore(incoming)) return current;
      return incoming;
    }

    return ChatMessage._(
      id,
      body,
      mine,
      createdAt,
      first(deliveredAt, receipt.deliveredAt),
      first(readAt, receipt.readAt),
    );
  }
}

class MessageReceipt {
  MessageReceipt._(this.id, this.deliveredAt, this.readAt);
  factory MessageReceipt.parse(JsonObject json) {
    final delivered = json['deliveredAt'] == null
        ? null
        : _date(json['deliveredAt']);
    final read = json['readAt'] == null ? null : _date(json['readAt']);
    if (read != null && (delivered == null || read.isBefore(delivered))) {
      _invalid();
    }
    return MessageReceipt._(_id(json['id']), delivered, read);
  }
  final String id;
  final DateTime? deliveredAt, readAt;
}

void _validateReceiptCreation(MessageReceipt receipt, DateTime createdAt) {
  if ((receipt.deliveredAt?.isBefore(createdAt) ?? false) ||
      (receipt.readAt?.isBefore(createdAt) ?? false)) {
    _invalid();
  }
}

class MessagePage {
  MessagePage._(
    this.messages,
    this.cursor,
    this.hasMore,
    this.blocked,
    this.blockedByMe,
    this.propertyTitle,
    this.receiptsSupported,
    this.receipts,
  );
  factory MessagePage.parse(JsonObject json) {
    final rows = objects(json['messages']);
    if (rows.length > 50) _invalid();
    final messages = rows.map(ChatMessage.parse).toList(growable: false);
    if (messages.map((message) => message.id).toSet().length !=
        messages.length) {
      _invalid();
    }
    final supported = json['receiptsSupported'] == null
        ? false
        : _bool(json['receiptsSupported']);
    final receipts = json['receipts'] == null
        ? <MessageReceipt>[]
        : _receipts(json['receipts']);
    if (!supported &&
        (receipts.isNotEmpty ||
            messages.any(
              (message) =>
                  message.deliveredAt != null || message.readAt != null,
            ))) {
      _invalid();
    }
    final cursor = json['nextCursor'];
    final more = _bool(json['hasMore']);
    if (cursor != null) _id(cursor);
    if (more && cursor == null) _invalid();
    return MessagePage._(
      messages,
      cursor as String?,
      more,
      _bool(json['blocked']),
      _bool(json['blockedByMe']),
      _string(json['propertyTitle'], max: 160),
      supported,
      receipts,
    );
  }
  final List<ChatMessage> messages;
  final String? cursor;
  final bool hasMore, blocked, blockedByMe, receiptsSupported;
  final String propertyTitle;
  final List<MessageReceipt> receipts;
}

String engagementError(Object error, {bool mutation = false}) {
  if (error is ApiException && error.failure == ApiFailure.server) {
    return mutation
        ? 'Confirmation was not received. Refresh before trying again; your change may have been saved.'
        : 'Messaging and membership are temporarily unavailable. Please try again later.';
  }
  return marketplaceError(error, mutation: mutation);
}
