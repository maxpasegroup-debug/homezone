import '../features/marketplace/account_listing_screen.dart';
import 'package:flutter/material.dart';
import '../features/auth/auth_screens.dart';
import '../features/auth/onboarding_screen.dart';
import '../features/auth/splash_screen.dart';
import '../features/auth/role_screen.dart';
import '../features/auth/recovery_screens.dart';
import '../theme/app_theme.dart';
import '../features/buyer/buyer_shell.dart';
import '../features/auth/sign_in_controller.dart';
import 'session_scope.dart';
import '../features/marketplace/marketplace_repository.dart';
import '../features/marketplace/marketplace_screen.dart';
import '../features/marketplace/account_access_screen.dart';
import '../features/marketplace/registration_screen.dart';
import '../features/workspace/workspace_screen.dart';

class HomezoneApp extends StatefulWidget {
  const HomezoneApp({
    super.key,
    this.initialRoute = '/',
    this.signInController,
    this.marketplace,
  });
  final SignInController? signInController;
  final MarketplaceRepository? marketplace;
  final String initialRoute;
  @override
  State<HomezoneApp> createState() => _HomezoneAppState();
}

class _HomezoneAppState extends State<HomezoneApp> with WidgetsBindingObserver {
  final _routeObserver = SessionRouteObserver();
  ThemeMode _themeMode = ThemeMode.system;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      widget.signInController?.revalidateSession();
    }
  }

  @override
  void didUpdateWidget(HomezoneApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.signInController, widget.signInController)) {
      oldWidget.signInController?.dispose();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.signInController?.dispose();
    super.dispose();
  }

  Widget screen(String route) => switch (route) {
    '/buyer' =>
      widget.marketplace == null
          ? const BuyerShell()
          : ListenableBuilder(
              listenable: widget.marketplace!.session,
              builder: (context, _) {
                final role = widget.marketplace!.session.identity?.role;
                if (role != null && role != 'USER')
                  return WorkspaceScreen(repository: widget.marketplace!);
                return MarketplaceScreen(
                  key: ObjectKey(widget.marketplace),
                  repository: widget.marketplace!,
                  themeMode: _themeMode,
                  onThemeChanged: (value) => setState(() => _themeMode = value),
                );
              },
            ),
    '/discovery' =>
      widget.marketplace == null
          ? const BuyerShell()
          : MarketplaceScreen(
              key: ObjectKey(widget.marketplace),
              repository: widget.marketplace!,
              themeMode: _themeMode,
              onThemeChanged: (value) => setState(() => _themeMode = value),
            ),
    '/property' => Builder(
      builder: (context) {
        final id = ModalRoute.of(context)?.settings.arguments;
        if (widget.marketplace == null ||
            id is! String ||
            !RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(id))
          return const Scaffold(
            body: Center(child: Text('Property unavailable.')),
          );
        return AccountListingScreen(repository: widget.marketplace!, id: id);
      },
    ),
    '/workspace' =>
      widget.marketplace == null
          ? const SignInScreen()
          : WorkspaceScreen(repository: widget.marketplace!),
    '/buyer-preview' => const BuyerShell(),
    '/onboarding' => const OnboardingScreen(),
    '/roles' =>
      widget.marketplace == null
          ? const RoleScreen()
          : RegistrationScreen(repository: widget.marketplace!),
    '/sign-in' => SignInScreen(
      controller: widget.signInController,
      serviceMode: widget.marketplace != null,
    ),
    '/sign-up' =>
      widget.marketplace == null
          ? const SignUpScreen()
          : RegistrationScreen(repository: widget.marketplace!),
    '/forgot-password' =>
      widget.marketplace == null
          ? const ForgotPasswordScreen()
          : AccountAccessScreen(repository: widget.marketplace!),
    '/reset-password' =>
      widget.marketplace == null
          ? const ResetPasswordScreen()
          : AccountAccessScreen(repository: widget.marketplace!, reset: true),
    '/check-email' => const CheckEmailScreen(),
    '/success' => const SuccessScreen(),
    _ => const SplashScreen(),
  };
  @override
  Widget build(BuildContext context) => SessionScope(
    controller: widget.signInController,
    routeObserver: _routeObserver,
    child: MaterialApp(
      title: 'HOMEZONE',
      navigatorObservers: [_routeObserver],
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: _themeMode,
      home: screen(widget.initialRoute),
      routes: {
        for (final route in [
          '/buyer',
          '/buyer-preview',
          '/discovery',
          '/workspace',
          '/property',
          '/onboarding',
          '/roles',
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/check-email',
          '/success',
        ])
          route: (_) => screen(route),
      },
    ),
  );
}
