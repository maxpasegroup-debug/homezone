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

class HomezoneApp extends StatefulWidget {
  const HomezoneApp({
    super.key,
    this.initialRoute = '/',
    this.signInController,
  });
  final SignInController? signInController;
  final String initialRoute;
  @override
  State<HomezoneApp> createState() => _HomezoneAppState();
}

class _HomezoneAppState extends State<HomezoneApp> {
  final _routeObserver = SessionRouteObserver();
  @override
  void didUpdateWidget(HomezoneApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.signInController, widget.signInController)) {
      oldWidget.signInController?.dispose();
    }
  }

  @override
  void dispose() {
    widget.signInController?.dispose();
    super.dispose();
  }

  Widget screen(String route) => switch (route) {
    '/buyer' => const BuyerShell(),
    '/onboarding' => const OnboardingScreen(),
    '/roles' => const RoleScreen(),
    '/sign-in' => SignInScreen(controller: widget.signInController),
    '/sign-up' => const SignUpScreen(),
    '/forgot-password' => const ForgotPasswordScreen(),
    '/reset-password' => const ResetPasswordScreen(),
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
      themeMode: ThemeMode.system,
      home: screen(widget.initialRoute),
      routes: {
        for (final route in [
          '/buyer',
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
