import 'package:flutter/material.dart';
import '../../shared/ui/auth_components.dart';
import '../../theme/design_tokens.dart';

class CheckEmailScreen extends StatelessWidget {
  const CheckEmailScreen({super.key});
  void notice(BuildContext context, String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));
  @override
  Widget build(BuildContext context) {
    final email = ModalRoute.of(context)?.settings.arguments;
    return AuthLayout(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: Space.xxl),
          Icon(
            Icons.mark_email_unread_outlined,
            size: 100,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: Space.xl),
          Text(
            'Check Your Email',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: Space.md),
          Text(
            email is String
                ? 'Recovery preview for $email. No reset link was sent.'
                : 'This is an email confirmation preview. No email was sent.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: Space.xl),
          PrimaryButton(
            label: 'Open Email App',
            onPressed: () =>
                notice(context, 'Local preview only. No email app was opened.'),
          ),
          const SizedBox(height: Space.md),
          TextButton(
            onPressed: () =>
                notice(context, 'Local preview only. No email was resent.'),
            child: const Text('Resend'),
          ),
          TextButton(
            onPressed: () => Navigator.pushNamed(context, '/reset-password'),
            child: const Text('Preview Set New Password'),
          ),
          TextButton(
            onPressed: () => Navigator.pushNamedAndRemoveUntil(
              context,
              '/sign-in',
              (route) => false,
            ),
            child: const Text('Back to Sign In'),
          ),
          const PreviewNotice(
            message:
                'No email service or reset-link verification is connected.',
          ),
        ],
      ),
    );
  }
}

class SuccessScreen extends StatelessWidget {
  const SuccessScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final password = ModalRoute.of(context)?.settings.arguments == 'password';
    return AuthLayout(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: Space.xxl),
          Center(
            child: Container(
              padding: const EdgeInsets.all(Space.lg),
              decoration: const BoxDecoration(
                color: BrandColors.forest,
                shape: BoxShape.circle,
                boxShadow: [AppShape.shadow],
              ),
              child: const Icon(
                Icons.check_rounded,
                color: Colors.white,
                size: 72,
              ),
            ),
          ),
          const SizedBox(height: Space.xl),
          Text(
            'All Set!',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: Space.md),
          Text(
            password
                ? 'Local preview complete. No password was changed.'
                : 'Local preview complete. No account was created.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: Space.xl),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: BrandColors.gold,
              foregroundColor: const Color(0xFF243126),
            ),
            onPressed: () => Navigator.pushNamedAndRemoveUntil(
              context,
              '/onboarding',
              (route) => false,
            ),
            child: const Text('Continue to Home'),
          ),
          const SizedBox(height: Space.md),
          TextButton(
            onPressed: () => Navigator.pushNamedAndRemoveUntil(
              context,
              '/sign-in',
              (route) => false,
            ),
            child: const Text('Back to Sign In'),
          ),
          const PreviewNotice(
            message:
                'Success screen preview only. Continue returns to onboarding; no dashboard or authenticated session exists.',
          ),
        ],
      ),
    );
  }
}
