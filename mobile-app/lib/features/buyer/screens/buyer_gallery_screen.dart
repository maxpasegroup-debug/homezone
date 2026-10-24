import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

enum PropertyMedia { photos, videos, floorPlan }

class BuyerGalleryScreen extends StatefulWidget {
  const BuyerGalleryScreen({
    super.key,
    required this.property,
    this.initial = PropertyMedia.photos,
  });
  final DemoProperty property;
  final PropertyMedia initial;
  @override
  State<BuyerGalleryScreen> createState() => _BuyerGalleryScreenState();
}

class _BuyerGalleryScreenState extends State<BuyerGalleryScreen> {
  late PropertyMedia selected = widget.initial;
  @override
  Widget build(BuildContext context) {
    final property = widget.property;
    final available = property.image.trim().isNotEmpty;
    return Scaffold(
      appBar: AppBar(title: const Text('Property gallery')),
      body: SafeArea(
        child: BuyerPage(
          children: [
            Text(
              property.title.trim().isEmpty
                  ? 'Untitled demo property'
                  : property.title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: Space.md),
            Wrap(
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [
                for (final media in PropertyMedia.values)
                  ChoiceChip(
                    label: Text(switch (media) {
                      PropertyMedia.photos => 'Photos',
                      PropertyMedia.videos => 'Videos',
                      PropertyMedia.floorPlan => 'Floor Plan',
                    }),
                    selected: selected == media,
                    onSelected: (_) => setState(() => selected = media),
                  ),
              ],
            ),
            const SizedBox(height: Space.lg),
            if (selected != PropertyMedia.photos)
              EmptySection(
                title: selected == PropertyMedia.videos
                    ? 'Videos unavailable'
                    : 'Floor plan unavailable',
                message:
                    'No ${selected == PropertyMedia.videos ? 'video' : 'floor-plan'} media has been supplied for this fictional demo listing.',
                icon: Icons.perm_media_outlined,
              )
            else if (!available)
              const EmptySection(
                title: 'No photos available',
                message: 'This demo listing has no bundled photography.',
                icon: Icons.image_not_supported_outlined,
              )
            else ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(AppShape.radius),
                child: AspectRatio(
                  aspectRatio: 3 / 4,
                  child: InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: Image.asset(
                      property.image,
                      fit: BoxFit.contain,
                      semanticLabel: 'Representative demo property photograph',
                      errorBuilder: (_, _, _) => const EmptySection(
                        title: 'Photo unavailable',
                        message: 'The bundled image could not be loaded.',
                        icon: Icons.broken_image_outlined,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: Space.sm),
              const Text('One representative photo · Pinch to zoom'),
            ],
            const SizedBox(height: Space.lg),
            const Text(
              'Fictional demo media. No live gallery, video or floor-plan service is connected.',
            ),
          ],
        ),
      ),
    );
  }
}
