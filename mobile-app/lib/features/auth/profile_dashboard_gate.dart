import 'package:flutter/material.dart';
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

  Future<void> _confirm() async {
    final repository = widget.repository;
    final identity = repository.session.identity;
    final generation = repository.coordinator.generation;
    if (identity == null) throw const FormatException();
    const roles = {'USER', 'OWNER', 'BROKER', 'BUILDER',
      'SERVICE_PROVIDER', 'ADMIN', 'SUPER_ADMIN'};
    final response = await repository.call('GET', '/api/mobile/account',
      query: {'view': 'profile'});
    final profile = object(response['profile']);
    if (repository.coordinator.generation != generation ||
        repository.session.identity?.id != identity.id ||
        repository.session.identity?.role != identity.role ||
        !roles.contains(identity.role) || profile['role'] != identity.role ||
        !{'PENDING', 'VERIFIED', 'REJECTED'}.contains(profile['verificationStatus'])) {
      throw const FormatException();
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
            FilledButton(onPressed: () {
              setState(() => _confirmation = _confirm());
            }, child: const Text('Retry profile')),
            TextButton(onPressed: () => Navigator.pushNamedAndRemoveUntil(
              context, '/sign-in', (_) => false),
              child: const Text('Sign in again')),
          ],
        )));
    },
  );
}
