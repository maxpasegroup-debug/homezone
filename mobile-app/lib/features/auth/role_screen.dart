import 'package:flutter/material.dart';
import '../../shared/ui/auth_components.dart';
import '../../theme/design_tokens.dart';

class RoleScreen extends StatefulWidget {
  const RoleScreen({super.key, this.onSelected});
  final ValueChanged<String>? onSelected;
  @override
  State<RoleScreen> createState() => _RoleScreenState();
}

class _RoleScreenState extends State<RoleScreen> {
  String? selected;
  static const roles = [
    ('Property Buyer', 'Find your dream home', Icons.person_search_outlined),
    ('Property Owner', 'List and manage properties', Icons.home_outlined),
    ('Broker', 'Manage leads and clients', Icons.handshake_outlined),
    ('Builder', 'Showcase your projects', Icons.apartment_outlined),
    (
      'Service Provider',
      'Offer home services',
      Icons.home_repair_service_outlined,
    ),
  ];
  @override
  Widget build(BuildContext context) => AuthLayout(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          widget.onSelected == null ? 'Choose Your Role' : 'Who are you?',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: Space.sm),
        const Text(
          'Get a personalised experience',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: Space.lg),
        for (final role in roles)
          Padding(
            padding: const EdgeInsets.only(bottom: Space.md),
            child: Semantics(
              selected: selected == role.$1,
              child: Material(
                color: selected == role.$1
                    ? Theme.of(context).colorScheme.primaryContainer
                    : Theme.of(context).colorScheme.surfaceContainerLowest,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(
                    color: selected == role.$1
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
                child: ListTile(
                  minVerticalPadding: 12,
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: BrandColors.gold.withValues(alpha: .18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      role.$3,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  title: Text(
                    role.$1,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(role.$2),
                  trailing: Icon(
                    selected == role.$1
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                  ),
                  onTap: () => setState(() => selected = role.$1),
                ),
              ),
            ),
          ),
        PrimaryButton(
          label: 'Continue',
          onPressed: selected == null
              ? null
              : () => widget.onSelected != null
                    ? widget.onSelected!(
                        [
                          'USER',
                          'OWNER',
                          'BROKER',
                          'BUILDER',
                          'SERVICE_PROVIDER',
                        ][roles.indexWhere((role) => role.$1 == selected)],
                      )
                    : Navigator.pushNamed(
                        context,
                        '/sign-up',
                        arguments: selected,
                      ),
        ),
        const SizedBox(height: Space.md),
        if (widget.onSelected == null)
          Center(
            child: TextButton(
              onPressed: () => Navigator.pushNamed(context, '/sign-in'),
              child: const Text('Already have an account? Sign In'),
            ),
          ),
        if (widget.onSelected == null)
          const PreviewNotice(
            message: 'Role selection is local only and is not stored.',
          ),
      ],
    ),
  );
}
