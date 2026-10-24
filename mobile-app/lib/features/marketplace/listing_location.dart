import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Opens a listing's supplied coordinates. Never reads the device's location.
abstract final class ListingLocation {
  static const _channel = MethodChannel('homezone/listing-location');
  static Future<bool> open(Object? latitude, Object? longitude) async {
    final lat = double.tryParse('$latitude');
    final lng = double.tryParse('$longitude');
    if (kIsWeb ||
        defaultTargetPlatform != TargetPlatform.android ||
        lat == null ||
        lng == null ||
        !lat.isFinite ||
        !lng.isFinite ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180) {
      return false;
    }
    try {
      return await _channel.invokeMethod<bool>('open', {
            'latitude': lat,
            'longitude': lng,
          }) ??
          false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }
}
