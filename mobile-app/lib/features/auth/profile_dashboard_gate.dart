import 'package:flutter/material.dart';
import '../../core/api/cookie_request_coordinator.dart';
import '../marketplace/marketplace_repository.dart';

/// Profile confirmation is required for dashboard presentation, not authority.
/// Backend authorization and the independently verified session remain mandatory.
class ProfileDashboardGate extends StatefulWidget {
  const ProfileDashboardGate({super.key, required this.repository,
    required this.child});
  final MarketplaceRepository repository;
  final Widget child;

  @override
  State<ProfileDashboardGate> createState() => _ProfileDashboardGateState();
}

class _ProfileDashboardGateState extends State<ProfileDashboardGate> {
  late Future<void> _confirmation = _confirm();
  bool _signingOut = false;

  Future<void> _confirm() async {
    await widget.repository.confirmedProfile();
  }

  Future<void> _signInAgain() async {
    if (_signingOut) return;
    final repository = widget.repository;
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _signingOut = true);
    try {
      final acknowledged = await repository.session.signOut();
      if (!navigator.mounted || !messenger.mounted) return;
      if (repository.session.verified || repository.coordinator.boundary !=
          CookieLifecycleBoundary.locallyInvalidated) {
        messenger.showSnackBar(const SnackBar(content:
          Text('An account operation is still active. Please try again.')));
        return;
      }
      navigator.pushNamedAndRemoveUntil('/sign-in', (_) => false);
      if (!acknowledged || !repository.session.credentialRemovalConfirmed) {
        messenger.showSnackBar(SnackBar(content: Text(
          !repository.session.credentialRemovalConfirmed
              ? 'In-memory access was cleared. Device credential removal could not be confirmed; use website account controls before sharing this device.'
              : 'Local credentials were cleared. Server sign-out could not be confirmed.',
        )));
      }
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
    future: _confirmation,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Scaffold(body: Center(child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [CircularProgressIndicator(), SizedBox(height: 16),
            Text('Loading your HOMEZONE profile...')],
        )));
      }
      if (!snapshot.hasError) return widget.child;
      return Scaffold(appBar: AppBar(title: const Text('Account access')),
        body: Padding(padding: const EdgeInsets.all(24), child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Your current profile could not be confirmed. It may be unavailable, incomplete, or changed. No role was assigned locally.'),
            const SizedBox(height: 16),
            FilledButton(onPressed: _signingOut ? null : () {
              setState(() => _confirmation = _confirm());
            }, child: const Text('Retry profile')),
            TextButton(onPressed: _signingOut ? null : _signInAgain,
              child: const Text('Sign in again')),
          ],
        )));
    },
  );
}
