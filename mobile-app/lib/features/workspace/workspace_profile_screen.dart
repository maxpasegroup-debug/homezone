import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../shared/ui/loading_skeleton.dart';
import '../marketplace/marketplace_repository.dart';
import '../marketplace/marketplace_screen.dart' show ProfileEditScreen;
import '../engagement/engagement_screens.dart';

/// Common account details, separate from a provider's business profile.
class WorkspaceProfileScreen extends StatefulWidget {
  const WorkspaceProfileScreen({super.key, required this.repository});
  final MarketplaceRepository repository;

  @override
  State<WorkspaceProfileScreen> createState() => _WorkspaceProfileScreenState();
}

class _WorkspaceProfileScreenState extends State<WorkspaceProfileScreen> {
  late final repository = widget.repository;
  late final actor = repository.session.identity?.id;
  late final role = repository.session.identity?.role;
  late final generation = repository.coordinator.generation;
  JsonObject? profile;
  (String, String)? draft;
  String? error;
  bool loading = true, saving = false, refreshNeeded = false;
  int epoch = 0;

  bool get current =>
      mounted &&
      repository.session.verified &&
      repository.session.identity?.id == actor &&
      repository.session.identity?.role == role &&
      repository.coordinator.generation == generation;

  @override
  void initState() {
    super.initState();
    repository.session.addListener(_sessionChanged);
    _load();
  }

  void _sessionChanged() {
    if (!current && mounted) {
      epoch++;
      setState(() {
        profile = null;
        draft = null;
        error = null;
        loading = false;
      });
    }
  }

  @override
  void dispose() {
    epoch++;
    repository.session.removeListener(_sessionChanged);
    super.dispose();
  }

  Future<void> _load() async {
    if (!current || saving) return;
    final request = ++epoch;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await repository.confirmedProfile();
      if (!current || request != epoch) return;
      setState(() {
        profile = result;
        refreshNeeded = false;
      });
    } catch (failure) {
      if (current && request == epoch)
        setState(() => error = marketplaceError(failure));
    } finally {
      if (current && request == epoch) setState(() => loading = false);
    }
  }

  Future<void> _edit() async {
    if (!current || loading || saving || refreshNeeded || profile == null)
      return;
    setState(() {
      saving = true;
      error = null;
    });
    var dispatched = false;
    try {
      final values = await Navigator.push<(String, String)>(
        context,
        MaterialPageRoute(
          builder: (_) => ProfileEditScreen(
            repository: repository,
            profile: {
              ...profile!,
              if (draft != null) 'city': draft!.$1,
              if (draft != null) 'phone': draft!.$2,
            },
          ),
        ),
      );
      if (values == null || !current) return;
      draft = values;
      dispatched = true;
      await repository.updateProfile(values.$1, values.$2);
      if (!current) return;
      // A mutation acknowledgment alone is not proof that the displayed data is
      // current. Independently retrieve this account's authoritative profile.
      final confirmed = await repository.confirmedProfile();
      if (!current) return;
      if (confirmed['city'] != values.$1.trim() ||
          confirmed['phone'] != values.$2.trim()) {
        throw const ApiException(ApiFailure.invalidResponse);
      }
      setState(() {
        profile = confirmed;
        draft = null;
      });
      if (mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Profile updated.')));
    } catch (failure) {
      if (current)
        setState(() {
          refreshNeeded = dispatched;
          error = dispatched
              ? 'Your profile update could not be confirmed. Refresh your profile before trying again; the change may already have been saved.'
              : marketplaceError(failure);
        });
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('My profile'),
      actions: [
        IconButton(
          tooltip: 'Refresh profile',
          onPressed: current && !loading && !saving ? _load : null,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: !current
        ? const Center(child: Text('Sign in again to view your profile.'))
        : loading
        ? const LoadingSkeleton(
            layout: SkeletonLayout.profile,
            padding: EdgeInsets.all(20),
            label: 'Loading your profile',
            scrollable: true,
          )
        : ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (profile != null) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(Icons.account_circle_outlined, size: 48),
                        const SizedBox(height: 16),
                        Text(
                          textValue(profile!['fullName'], 'HomeZone member'),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(switch (role) {
                          'USER' => 'Property buyer',
                          'OWNER' => 'Property owner',
                          'BROKER' => 'Broker',
                          'BUILDER' => 'Builder',
                          'SERVICE_PROVIDER' => 'Service provider',
                          _ => 'Member',
                        }),
                        const Divider(height: 32),
                        Text(
                          'City: ${textValue(profile!['city'], 'Not provided')}',
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Contact phone: ${textValue(profile!['phone'], 'Not provided')}',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: saving || refreshNeeded ? null : _edit,
                  child: Text(
                    saving ? 'Saving…' : 'Edit city and contact phone',
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Your account role is managed by HomeZone. Editing contact details does not change your sign-in identity or permissions.',
                ),
                if ({'OWNER', 'BROKER', 'BUILDER'}.contains(role)) ...[
                  const SizedBox(height: 20),
                  OutlinedButton.icon(
                    onPressed: saving || !current
                        ? null
                        : () => Navigator.push<void>(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  ContactPrivacyScreen(repository: repository),
                            ),
                          ),
                    icon: const Icon(Icons.privacy_tip_outlined),
                    label: const Text('Manage contact sharing'),
                  ),
                  const Text(
                    'Chat is free. Choose separately whether Plus members can unlock your contact number.',
                  ),
                ],
              ],
              if (error != null) ...[
                const SizedBox(height: 16),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: saving ? null : _load,
                  child: const Text('Refresh profile'),
                ),
              ],
            ],
          ),
  );
}
