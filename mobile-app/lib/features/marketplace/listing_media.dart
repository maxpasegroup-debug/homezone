import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

/// Separate, credential-free media transport. Redirects must not bypass the host policy.
abstract final class ListingMedia {
  static bool allowed(String value, String configuredHosts) {
    final uri = Uri.tryParse(value);
    final hosts = configuredHosts
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .where((host) => host.isNotEmpty);
    return uri != null &&
        uri.scheme == 'https' &&
        uri.userInfo.isEmpty &&
        !uri.hasFragment &&
        uri.port == 443 &&
        hosts.contains(uri.host.toLowerCase());
  }

  static Future<Uint8List> load(String url, String hosts) async {
    if (!allowed(url, hosts)) throw const FormatException('Media unavailable');
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      return await (() async {
        final request = await client.getUrl(Uri.parse(url));
        request.followRedirects = false;
        final response = await request.close();
        if (response.statusCode != 200 ||
            !(response.headers.contentType?.mimeType.startsWith('image/') ??
                false)) {
          throw const FormatException('Media unavailable');
        }
        final bytes = BytesBuilder(copy: false);
        await for (final chunk in response) {
          if (bytes.length + chunk.length > 8 * 1024 * 1024) {
            throw const FormatException('Media unavailable');
          }
          bytes.add(chunk);
        }
        return bytes.takeBytes();
      })().timeout(const Duration(seconds: 20));
    } finally {
      client.close(force: true);
    }
  }
}
