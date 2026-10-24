import 'package:flutter/material.dart';
import '../../../shared/ui/auth_components.dart';
import '../../../theme/design_tokens.dart';
import '../widgets/buyer_components.dart';
import '../../../app/session_scope.dart';

class BuyerProfileScreen extends StatelessWidget {
  const BuyerProfileScreen({
    super.key,
    this.onSaved,
    this.onShortlists,
    this.onRecent,
    this.onCompare,
    this.onEnquiries,
  });
  final VoidCallback? onSaved, onShortlists, onRecent, onCompare, onEnquiries;
  void info(BuildContext context, String title, String message) =>
      showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          scrollable: true,
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final verified = session?.verified ?? false;
    return BuyerPage(
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
        PreviewNotice(
          message: verified
              ? 'Verified in-memory sign-in. Listings and profile remain demo data.'
              : 'Local buyer preview. You are not authenticated. No account, production session or personal profile is connected.',
        ),
        const SizedBox(height: Space.lg),
        const AppCard(
          child: Text(
            'Buyer preview identity. No editable personal account or remotely saved settings are available.',
          ),
        ),
        const SizedBox(height: Space.lg),
        for (final item in <(String, IconData, VoidCallback?)>[
          ('My Enquiries', Icons.chat_bubble_outline, onEnquiries),
          ('Saved properties', Icons.favorite_border, onSaved),
          ('Shortlists', Icons.playlist_add, onShortlists),
          ('Recently Viewed', Icons.history, onRecent),
          ('Compare properties', Icons.compare_arrows, onCompare),
          (
            'Preferences & settings',
            Icons.settings_outlined,
            () => info(
              context,
              'Preview preferences',
              'Appearance follows the app theme. Filters and collections are memory-only. Nothing is saved remotely.',
            ),
          ),
          (
            'Help & support',
            Icons.help_outline,
            () => info(
              context,
              'Preview help',
              'Browse fictional listings, save favorites and compare properties. No enquiries, calls or messages are sent. Live customer support is unavailable in this offline preview.',
            ),
          ),
        ])
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(item.$2),
            title: Text(item.$1),
            trailing: const Icon(Icons.chevron_right),
            onTap: item.$3,
          ),
        const SizedBox(height: Space.lg),
        FilledButton.icon(
          key: const ValueKey('preview-signout'),
          onPressed: () {
            session?.clearLocalSession();
            Navigator.pushNamedAndRemoveUntil(
              context,
              '/sign-in',
              (route) => false,
            );
          },
          icon: const Icon(Icons.logout),
          label: Text(
            verified ? 'Leave verified access' : 'Sign out of preview',
          ),
        ),
        const SizedBox(height: Space.sm),
        Text(
          verified
              ? 'Leaving clears verified in-memory sign-in and preview favorites, shortlists, comparison, Recently Viewed history, and enquiry examples. Local clearing does not revoke a server-side session.'
              : 'Leaving clears memory-only preview favorites, shortlists, comparison, Recently Viewed history, and enquiry examples. No server-side session is revoked.',
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
