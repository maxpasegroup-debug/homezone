import 'dart:convert';
import '../../core/api/api_client.dart';
import '../../core/api/api_transport.dart';
import '../../core/api/cookie_request_coordinator.dart';
import '../auth/sign_in_controller.dart';

typedef JsonObject = Map<String, dynamic>;

JsonObject object(Object? value) {
  if (value is! JsonObject) {
    throw const ApiException(ApiFailure.invalidResponse);
  }
  return value;
}

String textValue(Object? value, [String fallback = 'Not provided']) =>
    value is String && value.trim().isNotEmpty ? value.trim() : fallback;

List<JsonObject> objects(Object? value) {
  if (value is! List) throw const ApiException(ApiFailure.invalidResponse);
  return value.map(object).toList(growable: false);
}

final class Listing {
  Listing._(this.data, this.id, this.title);
  factory Listing.parse(Object? value) {
    final data = object(value);
    final id = data['id'];
    final title = data['title'];
    if (id is! String ||
        !RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(id) ||
        title is! String ||
        title.trim().isEmpty ||
        data['status'] != 'PUBLISHED') {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    final projection = <String, dynamic>{
      'id': id,
      'title': title,
      'status': 'PUBLISHED',
    };
    for (final key in [
      'description',
      'intent',
      'category',
      'propertyType',
      'coverImageUrl',
      'city',
      'locality',
      'country',
      'currency',
      'areaUnit',
      'videoUrl',
      'virtualTourUrl',
    ]) {
      if (data[key] != null && data[key] is! String) {
        throw const ApiException(ApiFailure.invalidResponse);
      }
      projection[key] = data[key];
    }
    for (final key in [
      'price',
      'areaValue',
      'bedrooms',
      'bathrooms',
      'latitude',
      'longitude',
    ]) {
      final value = data[key];
      if (value != null) {
        final parsed = value is num || value is String
            ? num.tryParse('$value')
            : null;
        if (parsed == null ||
            !parsed.isFinite ||
            (key == 'latitude'
                ? parsed < -90 || parsed > 90
                : key == 'longitude'
                ? parsed < -180 || parsed > 180
                : parsed < 0) ||
            (['bedrooms', 'bathrooms'].contains(key) &&
                parsed != parsed.roundToDouble())) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
      }
      projection[key] = value;
    }
    for (final key in ['mediaUrls', 'amenities']) {
      final value = data[key];
      if (value != null &&
          (value is! List ||
              value.length > 100 ||
              value.any((item) => item is! String))) {
        throw const ApiException(ApiFailure.invalidResponse);
      }
      projection[key] = List<String>.unmodifiable(value as List? ?? const []);
    }
    return Listing._(Map.unmodifiable(projection), id, title);
  }
  final JsonObject data;
  final String id, title;
  String get location => [
    data['locality'],
    data['city'],
    data['country'],
  ].whereType<String>().where((v) => v.isNotEmpty).join(', ');
  String get price => data['price'] == null
      ? 'Price on request'
      : '${textValue(data['currency'], '')} ${data['price']}';
  List<String> get images =>
      <String>{
            if (data['coverImageUrl'] is String)
              data['coverImageUrl'] as String,
            if (data['mediaUrls'] is List)
              ...(data['mediaUrls'] as List).whereType<String>(),
          }
          .where((value) {
            final uri = Uri.tryParse(value);
            return uri != null &&
                uri.scheme == 'https' &&
                uri.host.isNotEmpty &&
                uri.userInfo.isEmpty;
          })
          .toList(growable: false);
  String fact(String key) =>
      data[key] == null ? 'Not provided' : '${data[key]}';
}

final class ListingPage {
  const ListingPage(this.items, this.hasMore);
  final List<Listing> items;
  final bool hasMore;
}

/// Borrows the exclusively protocol-owned client. Never closes or persists it.
/// Every response (including errors) commits cookies through its active ticket.
final class MarketplaceRepository {
  MarketplaceRepository({
    required this.client,
    required this.coordinator,
    required this.session,
  });
  final ApiClient client;
  final CookieRequestCoordinator coordinator;
  final SignInController session;

  Future<JsonObject> call(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
    bool protected = true,
  }) async {
    if (protected && !session.verified) {
      throw const ApiException(ApiFailure.unauthorized);
    }
    final generation = coordinator.generation;
    try {
      // Public discovery must still work after logout or rejected restoration.
      // A locally invalidated cookie coordinator intentionally blocks credential
      // workflows; these read-only endpoints neither send nor accept cookies.
      final publicCatalog = !protected &&
          method == 'GET' &&
          (path == '/api/mobile/properties' ||
              RegExp(r'^/api/mobile/properties/[A-Za-z0-9_-]{8,128}$')
                  .hasMatch(path));
      if (publicCatalog) {
        final result = await client.request(method, path, query: query);
        if (coordinator.generation != generation) {
          throw const CookieLifecycleInvalidated();
        }
        return object(result);
      }
      return await coordinator.coordinate(
        path,
        (ticket) async {
          if (protected && !session.verified) {
            throw const ApiException(ApiFailure.unauthorized);
          }
          ApiResponse response;
          try {
            response = await client.exchange(
              method,
              path,
              query: query,
              body: body,
              auth: ticket.snapshot.requestOptions(),
            );
          } on ApiException catch (error) {
            if (error.responseMetadata != null &&
                !coordinator.acceptMetadata(ticket, error.responseMetadata!)) {
              throw const CookieLifecycleInvalidated();
            }
            rethrow;
          }
          if (!coordinator.acceptMetadata(ticket, response.metadata())) {
            throw const CookieLifecycleInvalidated();
          }
          ApiClient.checkStatus(response);
          if (protected && !session.verified) {
            throw const CookieLifecycleInvalidated();
          }
          try {
            return object(jsonDecode(response.body));
          } on FormatException {
            throw const ApiException(ApiFailure.invalidResponse);
          }
        },
        query: query,
        expectedGeneration: generation,
      );
    } on ApiException catch (error) {
      if (error.failure == ApiFailure.unauthorized &&
          coordinator.generation == generation) {
        session.clearLocalSession();
      }
      // Strip all raw response metadata at the feature boundary.
      throw ApiException(
        error.failure,
        status: error.status,
        retryAfterSeconds: error.retryAfterSeconds,
      );
    }
  }

  Future<ListingPage> listings(Map<String, String> filters, int page) async {
    if (page < 1 || page > 1000) {
      throw const ApiException(ApiFailure.validation);
    }
    final data = await call(
      'GET',
      '/api/mobile/properties',
      protected: false,
      query: {...filters, 'page': '$page', 'pageSize': '12'},
    );
    if (data['source'] != 'database' ||
        data['hasMore'] is! bool ||
        data['page'] != page) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    final rows = objects(data['properties']);
    // Enforce the requested page size before exposing catalog data to widgets.
    if (rows.length > 12 || (data['hasMore'] == true && rows.length != 12)) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    return ListingPage(
      rows.map(Listing.parse).toList(),
      data['hasMore'] as bool,
    );
  }

  Future<Listing> detail(String id) async {
    final data = await call(
      'GET',
      '/api/mobile/properties/${_id(id)}',
      protected: false,
    );
    if (data['source'] != 'database') {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    final listing = Listing.parse(data['property']);
    if (listing.id != id) throw const ApiException(ApiFailure.invalidResponse);
    return listing;
  }

  /// A session snapshot alone does not confirm the current dashboard profile.
  Future<JsonObject> confirmedProfile() async {
    final identity = session.identity;
    final generation = coordinator.generation;
    if (identity == null) throw const ApiException(ApiFailure.unauthorized);
    final response = await call('GET', '/api/mobile/account',
      query: {'view': 'profile'});
    if (generation != coordinator.generation ||
        session.identity?.id != identity.id || session.identity?.role != identity.role) {
      throw const CookieLifecycleInvalidated();
    }
    final profile = object(response['profile']);
    const roles = {'USER', 'OWNER', 'BROKER', 'BUILDER',
      'SERVICE_PROVIDER', 'ADMIN', 'SUPER_ADMIN'};
    if (!roles.contains(identity.role) || profile['role'] != identity.role ||
        !{'PENDING', 'VERIFIED', 'REJECTED'}.contains(profile['verificationStatus'])) {
      throw const ApiException(ApiFailure.forbidden);
    }
    return profile;
  }

  Future<JsonObject> account() async {
    final generation = coordinator.generation;
    final actor = session.identity?.id;
    void checkOwner() {
      if (!session.verified ||
          session.identity?.id != actor ||
          coordinator.generation != generation) {
        throw const ApiException(ApiFailure.unauthorized);
      }
    }

    final profile = await call(
      'GET',
      '/api/mobile/account',
      query: {'view': 'profile'},
    );
    checkOwner();
    final result = <String, dynamic>{'profile': object(profile['profile'])};
    final pagination = <String, dynamic>{};
    for (final collection in ['saved', 'shortlists', 'enquiries']) {
      final page = await accountCollection(collection);
      checkOwner();
      result[collection] = page['items'];
      pagination[collection] = page['nextCursor'];
    }
    result['pagination'] = pagination;
    return result;
  }

  Future<JsonObject> accountCollection(
    String collection, {
    String? cursor,
    String? parent,
  }) async {
    final data = await call(
      'GET',
      '/api/mobile/account/collections',
      query: {
        'collection': collection,
        if (cursor != null) 'cursor': cursor,
        if (parent != null) 'parent': _id(parent),
      },
    );
    final rows = objects(data['items']);
    final next = data['nextCursor'];
    if (!data.containsKey('nextCursor') ||
        data['collection'] != collection ||
        data['parent'] != parent ||
        rows.length > 25 ||
        (next != null &&
            (next is! String || next.length > 512 || next == cursor))) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    for (final row in rows) {
      if (collection == 'saved') Listing.parse(row);
      if (collection == 'shortlistItems') Listing.parse(row['property']);
      if (collection == 'shortlists' &&
          (row['id'] is! String ||
              row['name'] is! String ||
              row['itemsLoaded'] != false)) {
        throw const ApiException(ApiFailure.invalidResponse);
      }
      if (collection == 'enquiries' && row['id'] is! String)
        throw const ApiException(ApiFailure.invalidResponse);
    }
    return {...data, 'items': rows};
  }

  Future<JsonObject> workspacePage(
    String module, {
    String? parent,
    String? after,
  }) async {
    final data = await call(
      'GET',
      '/api/mobile/workspace',
      query: {
        'module': module,
        'mode': 'cursor',
        if (parent != null) 'parent': _id(parent),
        if (after != null) 'after': after,
      },
    );
    final rows = objects(data['items']);
    final next = data['nextCursor'];
    if (data['source'] != 'database' ||
        data['module'] != module ||
        data['role'] != session.identity?.role ||
        data['mode'] != 'cursor' ||
        rows.length > 20 ||
        !data.containsKey('nextCursor') ||
        data['hasMore'] is! bool ||
        data['hasMore'] != (next != null) ||
        (next != null &&
            (next is! String ||
                next.length > 512 ||
                !RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(next) ||
                next == after))) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    return {...data, 'items': rows};
  }

  Future<bool> savedStatus(String id) async {
    final data = await call(
      'GET',
      '/api/mobile/saved-status',
      query: {'propertyId': _id(id)},
    );
    if (data['propertyId'] != id || data['saved'] is! bool) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    return data['saved'] as bool;
  }

  Future<List<Listing>> history() async {
    final data = await call(
      'GET',
      '/api/mobile/workspace',
      query: {'module': 'history'},
    );
    if (data['source'] != 'database' || data['module'] != 'history')
      throw const FormatException();
    return objects(
      data['items'],
    ).map((row) => Listing.parse(row['property'])).take(10).toList();
  }

  Future<void> save(String id, bool saved) async {
    final data = await call(
      saved ? 'POST' : 'DELETE',
      '/api/properties/${_id(id)}/save',
    );
    if (data['saved'] != saved) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }

  Future<void> shortlist(String? id, String name) async {
    final trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw const ApiException(ApiFailure.validation);
    }
    final result = await call(
      id == null ? 'POST' : 'PATCH',
      id == null ? '/api/shortlists' : '/api/shortlists/${_id(id)}',
      body: {'name': trimmed},
    );
    if (object(result['shortlist'])['id'] is! String) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }

  Future<void> deleteShortlist(String id) async {
    final result = await call('DELETE', '/api/shortlists/${_id(id)}');
    if (result['ok'] != true) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }

  Future<void> membership(String shortlist, String property, bool add) async {
    final result = await call(
      add ? 'POST' : 'DELETE',
      '/api/shortlists/${_id(shortlist)}/properties',
      body: {'propertyId': _id(property)},
    );
    if (result['added'] != add) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }

  Future<void> enquire(
    String id,
    String name,
    String phone,
    String message,
  ) async {
    final result = await call(
      'POST',
      '/api/leads',
      body: {
        'propertyId': _id(id),
        'name': name.trim(),
        'phone': phone.trim(),
        'message': message.trim(),
        'source': 'PROPERTY',
        'contactAction': 'INQUIRY',
      },
    );
    if (result['ok'] != true || object(result['lead'])['id'] is! String) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }

  Future<void> updateProfile(String city, String phone) async {
    final result = await call(
      'PATCH',
      '/api/mobile/account',
      body: {'city': city.trim(), 'phone': phone.trim()},
    );
    object(result['profile']);
  }

  static String _id(String value) {
    if (!RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(value)) {
      throw const ApiException(ApiFailure.invalidRequest);
    }
    return value;
  }
}

String marketplaceError(Object error, {bool mutation = false}) {
  if (error is CookieLifecycleInvalidated) {
    return 'This session changed. Sign in again.';
  }
  if (error is ApiException) {
    return switch (error.failure) {
      ApiFailure.unauthorized => 'Your session ended. Please sign in again.',
      ApiFailure.forbidden => 'This action is not available for your account.',
      ApiFailure.validation => 'Check the information entered and try again.',
      ApiFailure.notFound =>
        'This listing or collection is no longer available.',
      ApiFailure.rateLimited => 'Too many requests. Wait before trying again.',
      ApiFailure.timeout || ApiFailure.network || ApiFailure.server =>
        mutation
            ? 'Confirmation was not received. Refresh your account before retrying; the change may have reached the server.'
            : 'Unable to connect. Check your connection and retry.',
      _ => 'Unable to complete the request. Please try again.',
    };
  }
  return 'Unable to complete the request. Please try again.';
}
