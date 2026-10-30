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
import '../features/auth/profile_dashboard_gate.dart';
import 'session_scope.dart';
import '../features/marketplace/marketplace_repository.dart';
import '../features/marketplace/marketplace_screen.dart';
import '../features/auth/role_first_auth_screen.dart';
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
                final repository = widget.marketplace!;
                final identity = repository.session.identity;
                if (identity == null) {
                  return RoleFirstAuthScreen(repository: repository);
                }
                final dashboard = identity.role != 'USER'
                    ? WorkspaceScreen(repository: repository)
                    : MarketplaceScreen(
                        key: ObjectKey(widget.marketplace),
                        repository: repository,
                        themeMode: _themeMode,
                        onThemeChanged: (value) =>
                            setState(() => _themeMode = value),
                      );
                return ProfileDashboardGate(
                  key: ValueKey(
                    '${repository.coordinator.generation}:${identity.id}:${identity.role}',
                  ),
                  repository: repository,
                  child: dashboard,
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
      widget.marketplace == null ? const SignInScreen() : screen('/buyer'),
    '/buyer-preview' => const BuyerShell(),
    '/onboarding' => OnboardingScreen(serviceMode: widget.marketplace != null),
    '/roles' =>
      widget.marketplace == null
          ? const RoleScreen()
          : widget.marketplace!.session.verified
          ? screen('/buyer')
          : RoleFirstAuthScreen(repository: widget.marketplace!),
    '/sign-in' =>
      widget.marketplace?.session.verified == true
          ? screen('/buyer')
          : SignInScreen(
              controller: widget.signInController,
              repository: widget.marketplace,
              serviceMode: widget.marketplace != null,
            ),
    '/sign-up' =>
      widget.marketplace == null
          ? const SignUpScreen()
          : widget.marketplace!.session.verified
          ? screen('/buyer')
          : RoleFirstAuthScreen(repository: widget.marketplace!),
    '/forgot-password' => ForgotPasswordScreen(serviceMode: widget.marketplace != null),
    '/reset-password' => ResetPasswordScreen(serviceMode: widget.marketplace != null),
    '/check-email' => const CheckEmailScreen(),
    '/success' => const SuccessScreen(),
    _ => SplashScreen(serviceMode: widget.marketplace != null),
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
