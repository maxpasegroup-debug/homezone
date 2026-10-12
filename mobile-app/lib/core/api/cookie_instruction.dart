import 'dart:io';
import 'api_client.dart';
import 'api_transport.dart';

/// Metadata only. This is not a cookie jar and never stores credentials on disk.
class CookieInstruction {
  CookieInstruction._(
    this.name,
    this.value,
    this.attributes,
    this.expires,
    this.maxAge,
  );
  final String name;
  final String value;
  final Map<String, String?> attributes;
  final DateTime? expires;
  final int? maxAge;
  String? get domain => attributes['domain'];
  String? get path => attributes['path'];
  String? get sameSite => attributes['samesite'];
  bool get secure => attributes.containsKey('secure');
  bool get httpOnly => attributes.containsKey('httponly');
  bool deletesAt(DateTime now) => maxAge != null
      ? maxAge! <= 0
      : expires != null && !expires!.isAfter(now.toUtc());

  static List<CookieInstruction> fromResponse(ApiResponse response) {
    try {
      return [
        for (final header in response.headerValues('set-cookie'))
          _parse(header),
      ];
    } on ApiException catch (error) {
      throw ApiException(error.failure, responseMetadata: response.metadata());
    }
  }

  static CookieInstruction parse(String header) => _parse(header);

  static CookieInstruction _parse(String header) {
    try {
      if (RegExp(r'[\x00-\x1f\x7f]').hasMatch(header)) {
        throw const FormatException();
      }
      // Split attributes on semicolons only; commas belong to values/Expires.
      final parts = header.split(';');
      final equals = parts.first.indexOf('=');
      if (equals < 1) {
        throw const FormatException();
      }
      final name = parts.first.substring(0, equals);
      final value = parts.first.substring(equals + 1);
      if (!RegExp(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$").hasMatch(name)) {
        throw const FormatException();
      }
      final content =
          value.startsWith('"') && value.endsWith('"') && value.length >= 2
          ? value.substring(1, value.length - 1)
          : value;
      if (!RegExp(
        r'^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*$',
      ).hasMatch(content)) {
        throw const FormatException();
      }
      final attributes = <String, String?>{};
      for (final item in parts.skip(1)) {
        final attribute = item.replaceFirst(RegExp(r'^ +'), '');
        final index = attribute.indexOf('=');
        final key = (index < 0 ? attribute : attribute.substring(0, index))
            .toLowerCase();
        if (!RegExp(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$").hasMatch(key) ||
            attributes.containsKey(key)) {
          throw const FormatException();
        }
        final attributeValue = index < 0
            ? null
            : attribute.substring(index + 1);
        if ((['secure', 'httponly'].contains(key) && index >= 0) ||
            ([
                  'path',
                  'domain',
                  'expires',
                  'max-age',
                  'samesite',
                ].contains(key) &&
                (attributeValue == null || attributeValue.isEmpty)) ||
            (key == 'max-age' &&
                !RegExp(r'^-?[0-9]+$').hasMatch(attributeValue!))) {
          throw const FormatException();
        }
        attributes[key] = attributeValue;
      }
      final expires = attributes['expires'] == null
          ? null
          : HttpDate.parse(attributes['expires']!);
      final maxAge = attributes['max-age'] == null
          ? null
          : int.parse(attributes['max-age']!);
      return CookieInstruction._(
        name,
        value,
        Map.unmodifiable(attributes),
        expires,
        maxAge,
      );
    } catch (_) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
  }
}
