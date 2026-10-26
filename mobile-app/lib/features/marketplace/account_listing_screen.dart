import 'package:flutter/material.dart';
import 'marketplace_repository.dart';
import 'marketplace_screen.dart';

/// An account entry point uses server favorites; it never owns another collection.
class AccountListingScreen extends StatefulWidget {
  const AccountListingScreen({
    super.key,
    required this.repository,
    required this.id,
  });
  final MarketplaceRepository repository;
  final String id;
  @override
  State<AccountListingScreen> createState() => _AccountListingState();
}

class _AccountListingState extends State<AccountListingScreen> {
  bool saved = false, ready = false;
  late final owner = widget.repository.session.identity?.id;
  late final generation = widget.repository.coordinator.generation;
  bool get current =>
      mounted &&
      widget.repository.session.identity?.id == owner &&
      widget.repository.coordinator.generation == generation;
  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    if (!current || !widget.repository.session.verified) return;
    try {
      final next = await widget.repository.savedStatus(widget.id);
      if (current)
        setState(() {
          saved = next;
          ready = true;
        });
    } catch (_) {
      /* Detail remains public; an unavailable favorite is never fabricated. */
    }
  }

  Future<void> toggle() async {
    if (!current || !widget.repository.session.verified) return;
    try {
      final previous = await widget.repository.savedStatus(widget.id);
      if (!current) return;
      await widget.repository.save(widget.id, !previous);
      if (current) setState(() => saved = !previous);
    } catch (e) {
      if (current)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(marketplaceError(e, mutation: true))),
        );
    }
  }

  @override
  Widget build(BuildContext context) => LivePropertyScreen(
    id: widget.id,
    repository: widget.repository,
    saved: () => current && saved,
    favoriteReady: () => current && ready,
    onFavoriteRefresh: refresh,
    onSave: toggle,
    onOpenListing: (item) =>
        Navigator.pushNamed<void>(context, '/property', arguments: item.id),
  );
}
