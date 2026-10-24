import 'package:flutter/material.dart';
import '../data/buyer_collections.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

class BuyerCompareScreen extends StatelessWidget {
  const BuyerCompareScreen({super.key, required this.collections});
  final BuyerCollections collections;
  String fact(String? value) =>
      value == null || value.trim().isEmpty ? 'Not provided' : value;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: collections,
    builder: (context, _) {
      final selected = demoProperties
          .where((p) => collections.comparison.contains(p.id))
          .toList();
      return Scaffold(
        appBar: AppBar(title: const Text('Compare Properties')),
        body: SafeArea(
          child: BuyerPage(
            children: [
              const Text(
                'Compare up to two fictional demo listings. No live pricing or recommendations.',
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final p in demoProperties)
                    FilterChip(
                      label: Text(p.title),
                      selected: collections.comparison.contains(p.id),
                      onSelected:
                          collections.comparison.length < 2 ||
                              collections.comparison.contains(p.id)
                          ? (v) => collections.compare(p.id, v)
                          : null,
                    ),
                ],
              ),
              const SizedBox(height: 24),
              if (selected.isEmpty)
                const EmptySection(
                  title: 'Choose properties to compare',
                  message: 'Select up to two demo listings above.',
                )
              else
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final p in selected)
                        Container(
                          width: 220,
                          margin: const EdgeInsets.only(right: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Theme.of(
                              context,
                            ).colorScheme.surfaceContainerLowest,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Theme.of(
                                context,
                              ).colorScheme.outlineVariant,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                p.title,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              for (final entry in <String, String>{
                                'Price': fact(p.price),
                                'Property type': fact(p.type),
                                'Location': fact(p.location),
                                'Area': fact(p.area),
                                'Bedrooms':
                                    p.bedrooms?.toString() ?? 'Not provided',
                                'Bathrooms':
                                    p.bathrooms?.toString() ?? 'Not provided',
                              }.entries)
                                Padding(
                                  padding: const EdgeInsets.only(top: 16),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        entry.key,
                                        style: Theme.of(
                                          context,
                                        ).textTheme.labelLarge,
                                      ),
                                      Text(entry.value),
                                    ],
                                  ),
                                ),
                              TextButton(
                                onPressed: () =>
                                    collections.compare(p.id, false),
                                child: const Text('Remove'),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back to browsing'),
              ),
            ],
          ),
        ),
      );
    },
  );
}
