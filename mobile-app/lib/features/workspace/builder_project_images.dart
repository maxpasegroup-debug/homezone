import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../marketplace/marketplace_repository.dart';
import '../marketplace/marketplace_screen.dart' show ListingImage;
import 'listing_photo_picker.dart';

/// Device selections only. The project form owns upload and server confirmation.
class BuilderProjectImages extends StatefulWidget {
  const BuilderProjectImages({
    super.key,
    required this.selections,
    required this.existing,
    required this.enabled,
    required this.isCurrent,
    required this.onChanged,
    required this.onPickingChanged,
  });

  static const fields = [
    'mediaUrls',
    'floorPlanUrls',
    'masterPlanUrl',
    'brochureUrl',
  ];

  final Map<String, List<SelectedListingPhoto>> selections;
  final JsonObject existing;
  final bool enabled;
  final bool Function() isCurrent;
  final ValueChanged<Map<String, List<SelectedListingPhoto>>> onChanged;
  final ValueChanged<bool> onPickingChanged;

  @override
  State<BuilderProjectImages> createState() => _BuilderProjectImagesState();
}

class _BuilderProjectImagesState extends State<BuilderProjectImages> {
  bool _picking = false;
  String? _error;
  String? _errorField;
  final _errorKey = GlobalKey();

  void _reject(String field, String message) {
    setState(() {
      _error = message;
      _errorField = field;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted ||
          !widget.isCurrent() ||
          _errorField != field ||
          _error != message) {
        return;
      }
      final errorContext = _errorKey.currentContext;
      if (errorContext != null) {
        unawaited(
          Scrollable.ensureVisible(
            errorContext,
            alignment: .8,
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
          ),
        );
      }
    });
  }

  List<String> _stored(String field) {
    final value = widget.existing[field];
    if (field == 'mediaUrls' || field == 'floorPlanUrls') {
      return value is List
          ? value.whereType<String>().where((url) => url.isNotEmpty).toList()
          : const [];
    }
    return value is String && value.isNotEmpty ? [value] : const [];
  }

  void _change(String field, List<SelectedListingPhoto> photos) {
    if (!widget.enabled || !widget.isCurrent()) return;
    if (widget.selections.keys.any(
      (key) => !BuilderProjectImages.fields.contains(key),
    )) {
      _reject(field, 'Image selection is unavailable. Return to the project.');
      return;
    }
    final next = <String, List<SelectedListingPhoto>>{
      for (final key in BuilderProjectImages.fields)
        key: key == field ? photos : widget.selections[key] ?? const [],
    };
    final all = next.values.expand((items) => items).toList(growable: false);
    if (all.fold<int>(0, (sum, photo) => sum + photo.bytes.length) >
        ListingPhotoPicker.maxTotalBytes) {
      _reject(
        field,
        'Choose project images totalling no more than 24 MB across all sections.',
      );
      return;
    }
    for (var index = 0; index < all.length; index++) {
      if (all
          .skip(index + 1)
          .any((other) => listEquals(all[index].bytes, other.bytes))) {
        _reject(
          field,
          'That image is already selected in another project section. Choose a different image.',
        );
        return;
      }
    }
    final limit = field == 'mediaUrls'
        ? 40
        : field == 'floorPlanUrls'
        ? 30
        : 1;
    if (photos.length > (limit == 1 ? 1 : 6) ||
        (limit > 1 && _stored(field).length + photos.length > limit)) {
      _reject(field, 'This project section has reached its image limit.');
      return;
    }
    setState(() {
      _error = null;
      _errorField = null;
    });
    widget.onChanged(
      Map<String, List<SelectedListingPhoto>>.unmodifiable({
        for (final entry in next.entries)
          entry.key: List<SelectedListingPhoto>.unmodifiable(entry.value),
      }),
    );
  }

  void _pickingChanged(bool picking) {
    if (!mounted) return;
    setState(() => _picking = picking);
    widget.onPickingChanged(picking);
  }

  bool _previewable(String field, String value) {
    final uri = Uri.tryParse(value);
    if (uri == null) return false;
    final path = uri.path.toLowerCase();
    if (path.endsWith('.pdf')) return false;
    return field == 'mediaUrls' ||
        const ['.jpg', '.jpeg', '.png', '.webp'].any(path.endsWith);
  }

  Widget _existing(String field, String imageName) {
    final urls = _stored(field);
    if (urls.isEmpty) return const SizedBox.shrink();
    final previews = urls.where((url) => _previewable(field, url)).toList();
    final unavailable = urls.length - previews.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            field == 'brochureUrl' && unavailable > 0
                ? 'Existing brochure saved'
                : '${urls.length} existing ${imageName.toLowerCase()}${urls.length == 1 ? '' : 's'} saved',
            style: Theme.of(context).textTheme.labelLarge,
          ),
          if (previews.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 110,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: previews.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, index) => SizedBox(
                  width: 140,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Semantics(
                      label: 'Saved ${imageName.toLowerCase()} ${index + 1}',
                      child: ListingImage(url: previews[index], height: 110),
                    ),
                  ),
                ),
              ),
            ),
          ],
          if (unavailable > 0)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text(
                'Saved document links are retained. Document previews are not loaded here.',
              ),
            ),
          if (field == 'masterPlanUrl' || field == 'brochureUrl')
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text(
                'Choosing a new image replaces this saved reference only after server confirmation.',
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isCurrent()) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.only(bottom: 16),
          child: Text(
            'Add project images from your device. JPEG, PNG or WebP, up to 6 MB each and 24 MB across all sections. Images upload when you save and can be viewed by anyone with their link. Brochure uploads currently support images only.',
          ),
        ),
        for (final field in BuilderProjectImages.fields) ...[
          _existing(field, _imageName(field)),
          ListingPhotoPicker(
            key: ValueKey('builder-project-images-$field'),
            photos: widget.selections[field] ?? const [],
            enabled: widget.enabled && !_picking && _hasRoom(field),
            isCurrent: widget.isCurrent,
            onChanged: (photos) => _change(field, photos),
            onPickingChanged: _pickingChanged,
            title: _title(field),
            addLabel: _addLabel(field),
            emptyHint:
                'Select ${_imageName(field).toLowerCase()} images before saving the project.',
            imageName: _imageName(field),
            maximumPhotos: _maximum(field),
            hintText: field == 'masterPlanUrl' || field == 'brochureUrl'
                ? 'Choose one image up to 6 MB. JPEG, PNG or WebP; PDF uploads are not supported here.'
                : 'Choose up to ${_maximum(field)} new images. JPEG, PNG or WebP, up to 6 MB each.',
          ),
          if (_error != null && _errorField == field)
            Padding(
              key: _errorKey,
              padding: const EdgeInsets.fromLTRB(4, 0, 4, 20),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ),
        ],
      ],
    );
  }

  bool _hasRoom(String field) => switch (field) {
    'mediaUrls' => _stored(field).length < 40,
    'floorPlanUrls' => _stored(field).length < 30,
    _ => true,
  };

  int _maximum(String field) => switch (field) {
    'mediaUrls' => min(6, max(1, 40 - _stored(field).length)),
    'floorPlanUrls' => min(6, max(1, 30 - _stored(field).length)),
    _ => 1,
  };

  String _title(String field) => switch (field) {
    'mediaUrls' => 'Project photos',
    'floorPlanUrls' => 'Floor plans',
    'masterPlanUrl' => 'Master plan',
    _ => 'Brochure image',
  };

  String _imageName(String field) => switch (field) {
    'mediaUrls' => 'Project photo',
    'floorPlanUrls' => 'Floor plan',
    'masterPlanUrl' => 'Master plan',
    _ => 'Brochure image',
  };

  String _addLabel(String field) => switch (field) {
    'mediaUrls' => 'Add project photo',
    'floorPlanUrls' => 'Add floor plan',
    'masterPlanUrl' => 'Add master plan',
    _ => 'Add brochure image',
  };
}
