import '../../core/api/api_client.dart';

Never _invalidProject() => throw const ApiException(ApiFailure.invalidResponse);

Map<String, dynamic> _map(Object? value) =>
    value is Map<String, dynamic> ? value : _invalidProject();

String _id(Object? value) =>
    value is String && RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(value)
    ? value
    : _invalidProject();

String? _text(Object? value, {bool required = false}) {
  if (value == null && !required) return null;
  if (value is! String || value.length > 20000) return _invalidProject();
  final text = value.trim();
  if (required && text.isEmpty) return _invalidProject();
  return text.isEmpty ? null : text;
}

List<String> _strings(Object? value) {
  if (value == null) return const [];
  if (value is! List || value.length > 100) return _invalidProject();
  return List.unmodifiable(value.map((item) => _text(item, required: true)!));
}

int _count(Object? value) =>
    value is int && value >= 0 ? value : _invalidProject();

num? _number(Object? value, {bool integer = false}) {
  if (value == null) return null;
  final parsed = value is num || value is String
      ? num.tryParse('$value')
      : null;
  if (parsed == null ||
      !parsed.isFinite ||
      parsed < 0 ||
      (integer && parsed != parsed.roundToDouble())) {
    return _invalidProject();
  }
  return parsed;
}

List<String> _images(List<String> values) => List.unmodifiable(
  values.where((value) {
    final uri = Uri.tryParse(value);
    return uri != null &&
        uri.scheme == 'https' &&
        uri.host.isNotEmpty &&
        uri.userInfo.isEmpty;
  }).toSet(),
);

/// Public projection only. Never retains owner, contact, team or booking data.
final class PublicProject {
  const PublicProject._({
    required this.id,
    required this.name,
    required this.city,
    required this.locality,
    required this.address,
    required this.description,
    required this.amenities,
    required this.constructionStatus,
    required this.completionDate,
    required this.images,
    required this.unitsCount,
    required this.availableUnits,
  });

  factory PublicProject.parse(Object? value) {
    final data = _map(value);
    if (data['status'] != 'PUBLISHED') return _invalidProject();
    final completion = _text(data['completionDate']);
    if (completion != null && DateTime.tryParse(completion) == null) {
      return _invalidProject();
    }
    return PublicProject._(
      id: _id(data['id']),
      name: _text(data['name'], required: true)!,
      city: _text(data['city'], required: true)!,
      locality: _text(data['locality']),
      address: _text(data['address']),
      description: _text(data['description']),
      amenities: _strings(data['amenities']),
      constructionStatus: _text(data['constructionStatus']),
      completionDate: completion == null ? null : DateTime.parse(completion),
      images: _images(_strings(data['mediaUrls'])),
      unitsCount: data['unitsCount'] == null
          ? null
          : _count(data['unitsCount']),
      availableUnits: data['availableUnits'] == null
          ? null
          : _count(data['availableUnits']),
    );
  }

  final String id, name, city;
  final String? locality, address, description, constructionStatus;
  final DateTime? completionDate;
  final List<String> amenities, images;
  final int? unitsCount, availableUnits;
  String get location => [locality, city].whereType<String>().join(', ');
}

final class PublicProjectPage {
  const PublicProjectPage({
    required this.items,
    required this.hasMore,
    required this.page,
  });
  factory PublicProjectPage.parse(Object? value) {
    final data = _map(value);
    final rows = data['projects'];
    final page = data['page'];
    if (data['source'] != 'database' ||
        data['hasMore'] is! bool ||
        page is! int ||
        page < 1 ||
        page > 1000 ||
        rows is! List ||
        rows.length > 12 ||
        (data['hasMore'] == true && rows.length != 12)) {
      return _invalidProject();
    }
    final items = rows.map(PublicProject.parse).toList(growable: false);
    if (items.map((item) => item.id).toSet().length != items.length) {
      return _invalidProject();
    }
    return PublicProjectPage(
      items: List.unmodifiable(items),
      hasMore: data['hasMore'] as bool,
      page: page,
    );
  }
  final List<PublicProject> items;
  final bool hasMore;
  final int page;
}

final class PublicProjectUnit {
  const PublicProjectUnit._({
    required this.id,
    required this.unitType,
    required this.areaValue,
    required this.areaUnit,
    required this.bedrooms,
    required this.bathrooms,
    required this.price,
    required this.images,
  });
  factory PublicProjectUnit.parse(Object? value) {
    final data = _map(value);
    if (data['status'] != 'AVAILABLE') return _invalidProject();
    return PublicProjectUnit._(
      id: _id(data['id']),
      unitType: _text(data['unitType']),
      areaValue: _number(data['areaValue']),
      areaUnit: _text(data['areaUnit']),
      bedrooms: _number(data['bedrooms'], integer: true)?.toInt(),
      bathrooms: _number(data['bathrooms'], integer: true)?.toInt(),
      price: _number(data['price']),
      images: _images(_strings(data['imageUrls'])),
    );
  }
  final String id;
  final String? unitType, areaUnit;
  final num? areaValue, price;
  final int? bedrooms, bathrooms;
  final List<String> images;
}

final class PublicProjectDetail {
  const PublicProjectDetail._({
    required this.project,
    required this.units,
    required this.unitsHasMore,
    required this.unitsPage,
    required this.floorPlans,
    required this.masterPlan,
  });
  factory PublicProjectDetail.parse(Object? value) {
    final envelope = _map(value);
    if (envelope['source'] != 'database') return _invalidProject();
    final data = _map(envelope['project']);
    final rows = data['units'];
    final page = data['unitsPage'];
    if (rows is! List ||
        rows.length > 24 ||
        data['unitsHasMore'] is! bool ||
        (data['unitsHasMore'] == true && rows.length != 24) ||
        page is! int ||
        page < 1 ||
        page > 1000) {
      return _invalidProject();
    }
    final units = rows.map(PublicProjectUnit.parse).toList(growable: false);
    if (units.map((unit) => unit.id).toSet().length != units.length) {
      return _invalidProject();
    }
    final master = _text(data['masterPlanUrl']);
    return PublicProjectDetail._(
      project: PublicProject.parse(data),
      units: List.unmodifiable(units),
      unitsHasMore: data['unitsHasMore'] as bool,
      unitsPage: page,
      floorPlans: _images(_strings(data['floorPlanUrls'])),
      masterPlan: master == null ? null : _images([master]).firstOrNull,
    );
  }
  final PublicProject project;
  final List<PublicProjectUnit> units;
  final bool unitsHasMore;
  final int unitsPage;
  final List<String> floorPlans;
  final String? masterPlan;
}
