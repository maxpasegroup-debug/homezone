import 'package:flutter/material.dart';
import '../features/auth/auth_screens.dart';
import '../features/auth/onboarding_screen.dart';
import '../features/auth/splash_screen.dart';
import '../features/auth/role_screen.dart';
import '../features/auth/recovery_screens.dart';
import '../theme/app_theme.dart';
import '../features/buyer/buyer_shell.dart';

class HomezoneApp extends StatelessWidget {
  const HomezoneApp({super.key, this.initialRoute = '/'});
  final String initialRoute;
  Widget screen(String route) => switch (route) {
    '/buyer' => const BuyerShell(),
    '/onboarding' => const OnboardingScreen(),
    '/roles' => const RoleScreen(),
    '/sign-in' => const SignInScreen(),
    '/sign-up' => const SignUpScreen(),
    '/forgot-password' => const ForgotPasswordScreen(),
    '/reset-password' => const ResetPasswordScreen(),
    '/check-email' => const CheckEmailScreen(),
    '/success' => const SuccessScreen(),
    _ => const SplashScreen(),
  };
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'HOMEZONE',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    darkTheme: AppTheme.dark,
    themeMode: ThemeMode.system,
    home: screen(initialRoute),
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
  );
}
