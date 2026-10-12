import 'package:flutter/material.dart';
import '../../../shared/ui/auth_components.dart';
import '../../../theme/design_tokens.dart';
import '../widgets/buyer_components.dart';

class BuyerProfileScreen extends StatelessWidget {
  const BuyerProfileScreen({super.key});
  @override
  Widget build(BuildContext context) => BuyerPage(
    children: [
      Icon(
        Icons.account_circle_outlined,
        size: 80,
        color: Theme.of(context).colorScheme.primary,
      ),
      const SizedBox(height: Space.lg),
      Text(
        'Welcome, explorer',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.headlineLarge,
      ),
      const SizedBox(height: Space.md),
      const PreviewNotice(
        message:
            'Local buyer preview. You are not authenticated. No account, production session or personal profile is connected.',
      ),
      const SizedBox(height: Space.lg),
      const AppCard(
        child: Text(
          'Explore with confidence. This space will hold your profile once secure backend integration is ready.',
        ),
      ),
      const SizedBox(height: Space.lg),
      FilledButton.icon(
        key: const ValueKey('preview-signout'),
        onPressed: () => Navigator.pushNamedAndRemoveUntil(
          context,
          '/sign-in',
          (route) => false,
        ),
        icon: const Icon(Icons.logout),
        label: const Text('Sign out of preview'),
      ),
      const SizedBox(height: Space.sm),
      const Text(
        'Returns to the sign-in UI and discards local favorites. No real session is ended.',
        textAlign: TextAlign.center,
      ),
    ],
  );
}
