import 'package:flutter/material.dart';
import '../data/buyer_collections.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

class BuyerShortlistsScreen extends StatefulWidget {
  const BuyerShortlistsScreen({
    super.key,
    required this.collections,
    required this.onFavorite,
    required this.onOpen,
  });
  final BuyerCollections collections;
  final ValueChanged<String> onFavorite;
  final ValueChanged<DemoProperty> onOpen;
  @override
  State<BuyerShortlistsScreen> createState() => _BuyerShortlistsScreenState();
}

class _BuyerShortlistsScreenState extends State<BuyerShortlistsScreen> {
  int? selected;
  final nameController = TextEditingController();
  @override
  void dispose() {
    nameController.dispose();
    super.dispose();
  }

  Future<void> name({DemoShortlist? shortlist}) async {
    final controller = nameController..text = shortlist?.name ?? '';
    String? error;
    await showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialog) => AlertDialog(
          title: Text(
            shortlist == null ? 'Create shortlist' : 'Rename shortlist',
          ),
          content: TextField(
            controller: controller,
            maxLength: 40,
            decoration: InputDecoration(
              labelText: 'Shortlist name',
              errorText: error,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final result = widget.collections.setName(
                  controller.text,
                  id: shortlist?.id,
                );
                if (result == null) {
                  Navigator.pop(context);
                } else {
                  setDialog(() => error = result);
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    // Dialog transitions may still reference the input during their exit animation.
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.collections,
    builder: (context, _) {
      final lists = widget.collections.shortlists;
      final matches = lists.where((s) => s.id == selected);
      final current = matches.isEmpty ? null : matches.first;
      return Scaffold(
        appBar: AppBar(title: Text(current?.name ?? 'Shortlists')),
        body: SafeArea(
          child: BuyerPage(
            children: [
              const Text(
                'Memory-only demo collections. Removing a favorite also removes it from shortlists. Nothing is synchronized or saved after leaving the preview.',
              ),
              const SizedBox(height: 16),
              if (current == null) ...[
                FilledButton(
                  onPressed: () => name(),
                  child: const Text('Create shortlist'),
                ),
                if (lists.isEmpty)
                  const EmptySection(
                    title: 'No shortlists yet',
                    message:
                        'Create a named collection for your saved demo properties.',
                  ),
                for (final list in lists)
                  ListTile(
                    title: Text(list.name),
                    subtitle: Text('${list.propertyIds.length} properties'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => setState(() => selected = list.id),
                  ),
              ] else ...[
                Wrap(
                  spacing: 8,
                  children: [
                    TextButton(
                      onPressed: () => setState(() => selected = null),
                      child: const Text('All shortlists'),
                    ),
                    TextButton(
                      onPressed: () => name(shortlist: current),
                      child: const Text('Rename'),
                    ),
                    TextButton(
                      onPressed: () {
                        widget.collections.delete(current.id);
                        setState(() => selected = null);
                      },
                      child: const Text('Delete shortlist'),
                    ),
                  ],
                ),
                Text(
                  'Choose saved properties',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                for (final p in demoProperties.where(
                  (p) => widget.collections.favorites.contains(p.id),
                ))
                  CheckboxListTile(
                    title: Text(p.title),
                    value: current.propertyIds.contains(p.id),
                    onChanged: (v) => widget.collections.membership(
                      current.id,
                      p.id,
                      v ?? false,
                    ),
                  ),
                if (current.propertyIds.isEmpty)
                  const EmptySection(
                    title: 'This shortlist is empty',
                    message: 'Save a demo listing, then select it above.',
                  ),
                PropertyResults(
                  properties: demoProperties
                      .where(
                        (p) =>
                            current.propertyIds.contains(p.id) &&
                            widget.collections.favorites.contains(p.id),
                      )
                      .toList(),
                  favorites: widget.collections.favorites,
                  onFavorite: widget.onFavorite,
                  onOpen: widget.onOpen,
                ),
              ],
            ],
          ),
        ),
      );
    },
  );
}
