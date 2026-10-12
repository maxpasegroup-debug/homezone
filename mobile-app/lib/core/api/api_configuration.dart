enum ApiEnvironment { development, staging }

class ApiConfigurationException implements Exception {
  const ApiConfigurationException();
  @override
  String toString() =>
      'API configuration is missing or invalid. Supply an approved origin and environment.';
}

class ApiConfiguration {
  ApiConfiguration(String baseUrl, {required this.environment}) {
    final uri = Uri.tryParse(baseUrl);
    final local =
        uri != null &&
        ['localhost', '127.0.0.1', '::1', '10.0.2.2'].contains(uri.host);
    if (baseUrl.isEmpty ||
        baseUrl.trim() != baseUrl ||
        baseUrl.contains(RegExp(r'[\\\s]')) ||
        uri == null ||
        !uri.hasAuthority ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        (uri.path.isNotEmpty && uri.path != '/') ||
        (uri.scheme != 'https' &&
            !(environment == ApiEnvironment.development &&
                local &&
                uri.scheme == 'http')) ||
        (baseUrl != uri.origin && baseUrl != '${uri.origin}/')) {
      throw const ApiConfigurationException();
    }
    baseUri = uri.replace(path: '');
  }

  factory ApiConfiguration.fromBuild() {
    const name = String.fromEnvironment('HOMEZONE_API_ENV');
    final environment = switch (name) {
      'development' => ApiEnvironment.development,
      'staging' => ApiEnvironment.staging,
      _ => throw const ApiConfigurationException(),
    };
    return ApiConfiguration(
      const String.fromEnvironment('HOMEZONE_API_BASE_URL'),
      environment: environment,
    );
  }

  final ApiEnvironment environment;
  late final Uri baseUri;

  Uri endpoint(String path, Map<String, String>? query) {
    final uri = Uri.tryParse(path);
    String decoded;
    try {
      decoded = Uri.decodeComponent(path);
    } on FormatException {
      throw const ApiConfigurationException();
    }
    if (uri == null ||
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.contains(RegExp(r'[\\\s]')) ||
        uri.hasScheme ||
        uri.hasAuthority ||
        uri.hasQuery ||
        uri.hasFragment ||
        decoded
            .split('/')
            .any((segment) => segment == '.' || segment == '..') ||
        uri.pathSegments.any(
          (segment) =>
              segment == '.' ||
              segment == '..' ||
              segment.contains('/') ||
              segment.contains('\\'),
        )) {
      throw const ApiConfigurationException();
    }
    return baseUri.replace(path: uri.path, queryParameters: query);
  }
}
