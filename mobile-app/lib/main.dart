import 'package:flutter/material.dart';
import 'app/homezone_app.dart';
import 'core/api/api_configuration.dart';
import 'core/api/api_client.dart';
import 'core/api/api_transport.dart';
import 'core/api/cookie_request_coordinator.dart';
import 'core/api/password_auth_protocol.dart';
import 'features/auth/sign_in_controller.dart';
import 'features/marketplace/marketplace_repository.dart';

void main() {
  const enabled = bool.fromEnvironment(
    'HOMEZONE_ENABLE_API',
    defaultValue: false,
  );
  if (!enabled) {
    runApp(const HomezoneApp());
    return;
  }
  try {
    final configuration = ApiConfiguration.fromBuild();
    final client = ApiClient(
      configuration: configuration,
      transport: IoApiTransport(configuration: configuration),
    );
    final coordinator = CookieRequestCoordinator(
      configuration: configuration,
      clock: DateTime.now,
    );
    final controller = SignInController(
      PasswordAuthProtocol(client: client, coordinator: coordinator),
    );
    runApp(
      HomezoneApp(
        signInController: controller,
        marketplace: MarketplaceRepository(
          client: client,
          coordinator: coordinator,
          session: controller,
        ),
      ),
    );
  } on ApiConfigurationException {
    // Never silently substitute a host or expose configuration values.
    runApp(
      const MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'HOMEZONE service configuration is missing or invalid. No connection was started.',
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
