import 'package:flutter/material.dart';
import 'app/homezone_app.dart';
import 'theme/app_theme.dart';
import 'core/api/api_configuration.dart';
import 'core/api/api_client.dart';
import 'core/api/api_transport.dart';
import 'core/api/cookie_request_coordinator.dart';
import 'core/api/password_auth_protocol.dart';
import 'core/api/session_vault.dart';
import 'features/auth/sign_in_controller.dart';
import 'features/marketplace/marketplace_repository.dart';

Future<void> main() async {
  const enabled = bool.fromEnvironment(
    'HOMEZONE_ENABLE_API',
    defaultValue: false,
  );
  if (!enabled) {
    runApp(const HomezoneApp());
    return;
  }
  try {
    WidgetsFlutterBinding.ensureInitialized();
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
      vault: SessionVault(
        '${configuration.environment.name}:${configuration.baseUri.origin}',
      ),
    );
    runApp(
      _ServiceStartup(
        controller: controller,
        repository: MarketplaceRepository(
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

/// Show a Flutter frame while the stored credential is independently verified.
/// The startup screen has no authority to create an authenticated identity.
class _ServiceStartup extends StatefulWidget {
  const _ServiceStartup({required this.controller, required this.repository});
  final SignInController controller;
  final MarketplaceRepository repository;
  @override
  State<_ServiceStartup> createState() => _ServiceStartupState();
}

class _ServiceStartupState extends State<_ServiceStartup> {
  late final Future<void> restoration = widget.controller.restoreSession();
  @override
  void dispose() {
    widget.controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
    future: restoration,
    builder: (context, snapshot) {
      if (snapshot.connectionState == ConnectionState.done)
        return HomezoneApp(
          initialRoute: widget.controller.verified ? '/buyer' : '/',
          signInController: widget.controller,
          marketplace: widget.repository,
        );
      return MaterialApp(
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        home: const Scaffold(
          body: SafeArea(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 24),
                    Text('Checking your saved HOMEZONE session…'),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    },
  );
}
