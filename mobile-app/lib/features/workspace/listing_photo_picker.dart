import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A device-selected photo stays in memory until the listing is saved.
class SelectedListingPhoto {
  SelectedListingPhoto._(this.bytes);

  static const maxBytes = 6 * 1024 * 1024;
  final Uint8List bytes;

  factory SelectedListingPhoto.fromPicker(Map<String, dynamic> result) {
    final encoded = result['base64'];
    if (encoded is! String ||
        encoded.isEmpty ||
        encoded.length > ((maxBytes + 2) ~/ 3) * 4 ||
        !RegExp(r'^[A-Za-z0-9+/]*={0,2}$').hasMatch(encoded)) {
      throw const FormatException('Invalid photograph');
    }
    final bytes = base64Decode(encoded);
    final jpeg =
        bytes.length >= 3 &&
        bytes[0] == 0xff &&
        bytes[1] == 0xd8 &&
        bytes[2] == 0xff;
    final png =
        bytes.length >= 8 &&
        listEquals(bytes.sublist(0, 8), [137, 80, 78, 71, 13, 10, 26, 10]);
    final webp =
        bytes.length >= 12 &&
        ascii.decode(bytes.sublist(0, 4), allowInvalid: true) == 'RIFF' &&
        ascii.decode(bytes.sublist(8, 12), allowInvalid: true) == 'WEBP';
    if (bytes.isEmpty ||
        bytes.length > maxBytes ||
        base64Encode(bytes) != encoded ||
        !(jpeg || png || webp)) {
      throw const FormatException('Unsupported photograph');
    }
    return SelectedListingPhoto._(bytes.asUnmodifiableView());
  }
}

class ListingPhotoPicker extends StatefulWidget {
  const ListingPhotoPicker({
    super.key,
    required this.photos,
    required this.enabled,
    required this.isCurrent,
    required this.onChanged,
    required this.onPickingChanged,
    this.minimumPhotos = 0,
  });

  static const maxPhotos = 6;
  static const minimumPublicationPhotos = 2;
  static const maxTotalBytes = 24 * 1024 * 1024;
  final List<SelectedListingPhoto> photos;
  final bool enabled;
  final bool Function() isCurrent;
  final ValueChanged<List<SelectedListingPhoto>> onChanged;
  final ValueChanged<bool> onPickingChanged;
  final int minimumPhotos;

  @override
  State<ListingPhotoPicker> createState() => _ListingPhotoPickerState();
}

class _ListingPhotoPickerState extends State<ListingPhotoPicker> {
  bool picking = false;
  String? error;

  Future<void> add() async {
    if (!widget.enabled ||
        picking ||
        !widget.isCurrent() ||
        widget.photos.length >= ListingPhotoPicker.maxPhotos) {
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      picking = true;
      error = null;
    });
    widget.onPickingChanged(true);
    try {
      const channel = MethodChannel('homezone/media-picker');
      final result = await channel.invokeMapMethod<String, dynamic>('image');
      if (!mounted || !widget.isCurrent() || result == null) return;
      final photo = SelectedListingPhoto.fromPicker(result);
      final total = widget.photos.fold<int>(
        0,
        (sum, item) => sum + item.bytes.length,
      );
      if (total + photo.bytes.length > ListingPhotoPicker.maxTotalBytes) {
        setState(() => error = 'Choose photos totalling no more than 24 MB.');
        return;
      }
      if (widget.photos.any((item) => listEquals(item.bytes, photo.bytes))) {
        setState(() => error = 'That photo is already selected.');
        return;
      }
      // Validate the local preview before creating a draft or uploading bytes.
      final codec = await ui.instantiateImageCodec(
        photo.bytes,
        targetWidth: 360,
        targetHeight: 360,
        allowUpscaling: false,
      );
      try {
        final frame = await codec.getNextFrame();
        frame.image.dispose();
      } finally {
        codec.dispose();
      }
      if (!mounted || !widget.isCurrent()) return;
      widget.onChanged(List.unmodifiable([...widget.photos, photo]));
    } catch (_) {
      if (mounted && widget.isCurrent()) {
        setState(
          () => error = 'Choose a readable JPEG, PNG or WebP photo up to 6 MB.',
        );
      }
    } finally {
      if (mounted) {
        setState(() => picking = false);
        widget.onPickingChanged(false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final enabled = widget.enabled && !picking && widget.isCurrent();
    return Card(
      margin: const EdgeInsets.only(bottom: 24),
      color: colors.surfaceContainerLowest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.photo_library_outlined),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Property photos',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Text('${widget.photos.length}/${ListingPhotoPicker.maxPhotos}'),
              ],
            ),
            const SizedBox(height: 8),
            if (widget.minimumPhotos > 0)
              Text(
                'At least ${widget.minimumPhotos} different property photos are required to publish (${widget.photos.length} selected).',
              ),
            const Text(
              'Choose up to 6 photos before saving. JPEG, PNG or WebP, up to 6 MB each and 24 MB in total.',
            ),
            const SizedBox(height: 12),
            if (widget.photos.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'Add photos of your property. They upload when you save the listing.',
                ),
              )
            else
              SizedBox(
                height: 146,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: widget.photos.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, index) => SizedBox(
                    width: 128,
                    child: Column(
                      children: [
                        Expanded(
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image(
                                  image: ResizeImage(
                                    MemoryImage(widget.photos[index].bytes),
                                    width: 360,
                                    height: 360,
                                    policy: ResizeImagePolicy.fit,
                                    allowUpscaling: false,
                                  ),
                                  fit: BoxFit.cover,
                                  semanticLabel:
                                      'Selected property photo ${index + 1}',
                                  errorBuilder: (_, _, _) => const Center(
                                    child: Icon(Icons.broken_image_outlined),
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 2,
                                right: 2,
                                child: IconButton.filledTonal(
                                  tooltip: 'Remove photo ${index + 1}',
                                  onPressed: !enabled
                                      ? null
                                      : () {
                                          final next = [...widget.photos]
                                            ..removeAt(index);
                                          widget.onChanged(
                                            List.unmodifiable(next),
                                          );
                                        },
                                  icon: const Icon(Icons.close, size: 18),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text('Photo ${index + 1}'),
                      ],
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed:
                  enabled && widget.photos.length < ListingPhotoPicker.maxPhotos
                  ? add
                  : null,
              icon: picking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add_photo_alternate_outlined),
              label: Text(picking ? 'Opening photos...' : 'Add photo'),
            ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(error!, style: TextStyle(color: colors.error)),
              ),
          ],
        ),
      ),
    );
  }
}
