import 'package:flutter/material.dart';
import '../marketplace/marketplace_repository.dart';
import '../marketplace/marketplace_screen.dart' show ListingImage;

/// Edits listing references only; provider objects are never deleted here.
class ListingPhotographsScreen extends StatefulWidget {
  const ListingPhotographsScreen({
    super.key,
    required this.repository,
    required this.id,
  });
  final MarketplaceRepository repository;
  final String id;
  @override
  State<ListingPhotographsScreen> createState() => _PhotosState();
}

class _PhotosState extends State<ListingPhotographsScreen> {
  late final actor = widget.repository.session.identity?.id;
  late final generation = widget.repository.coordinator.generation;
  JsonObject? property;
  bool loading = false, busy = false;
  int epoch = 0;
  String? error;
  bool get current =>
      mounted &&
      actor != null &&
      widget.repository.session.verified &&
      widget.repository.session.identity?.id == actor &&
      widget.repository.coordinator.generation == generation;
  List<String> get photos =>
      (property?['mediaUrls'] as List? ?? []).cast<String>();
  @override
  void initState() {
    super.initState();
    widget.repository.session.addListener(changed);
    load();
  }

  void changed() {
    if (mounted && !current) {
      epoch++;
      setState(() {
        property = null;
        error = 'Your account access changed. Return and sign in again.';
      });
    }
  }

  @override
  void dispose() {
    epoch++;
    widget.repository.session.removeListener(changed);
    super.dispose();
  }

  JsonObject parse(JsonObject data) {
    final next = object(data['property']);
    if (next['id'] != widget.id ||
        (next['videoUrl'] != null && next['videoUrl'] is! String) ||
        (next['virtualTourUrl'] != null && next['virtualTourUrl'] is! String) ||
        next['mediaState'] is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(next['mediaState'] as String) ||
        next['updatedAt'] is! String ||
        DateTime.tryParse(next['updatedAt'] as String) == null ||
        next['mediaUrls'] is! List ||
        (next['mediaUrls'] as List).any((v) => v is! String) ||
        (next['coverImageUrl'] != null && next['coverImageUrl'] is! String))
      throw const FormatException();
    return next;
  }

  Future<void> load() async {
    if (!current || loading || busy) return;
    final request = ++epoch;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final next = parse(
        await widget.repository.call(
          'GET',
          '/api/properties/${widget.id}/media',
        ),
      );
      if (current && request == epoch) setState(() => property = next);
    } catch (failure) {
      if (current && request == epoch)
        setState(() => error = marketplaceError(failure));
    } finally {
      if (mounted && request == epoch) setState(() => loading = false);
    }
  }

  Future<void> change(JsonObject action) async {
    if (!current || loading || busy || property == null) return;
    final version = property!['updatedAt'];
    final state = property!['mediaState'];
    if (action['action'] == 'remove') {
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          scrollable: true,
          title: const Text('Remove photograph from listing?'),
          content: const Text(
            'This removes its listing reference only. It does not erase the provider file or guarantee revocation of a previously public link.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Remove reference'),
            ),
          ],
        ),
      );
      if (yes != true || !current || busy) return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final next = parse(
        await widget.repository.call(
          'PATCH',
          '/api/properties/${widget.id}/media',
          body: {
            ...action,
            'expectedUpdatedAt': version,
            'expectedMediaState': state,
          },
        ),
      );
      if (current) setState(() => property = next);
    } catch (failure) {
      if (current)
        setState(() => error = marketplaceError(failure, mutation: true));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void move(int index, int offset) {
    final ordered = List<String>.from(photos);
    final next = index + offset;
    if (next < 0 || next >= ordered.length) return;
    final item = ordered.removeAt(index);
    ordered.insert(next, item);
    change({'action': 'reorder', 'mediaUrls': ordered});
  }

  bool editingLink = false;
  Future<void> editLink(bool tour) async {
    if (!current || busy || loading || editingLink || property == null) return;
    editingLink = true;
    try {
      final value = await showDialog<String>(
        context: context,
        builder: (_) => _PublicMediaLinkDialog(
          tour: tour,
          initial:
              property![tour ? 'virtualTourUrl' : 'videoUrl'] as String? ?? '',
        ),
      );
      if (value != null && current) {
        await change({
          'action': tour ? 'set-virtual-tour' : 'replace-video',
          if (value.isNotEmpty) (tour ? 'virtualTourUrl' : 'videoUrl'): value,
        });
      }
    } finally {
      editingLink = false;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Listing media'),
      actions: [
        IconButton(
          tooltip: 'Refresh',
          onPressed: current && !loading && !busy ? load : null,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Public listing photography only. Private documents use the protected document workflow. Changes appear only after server confirmation.',
        ),
        if (error != null)
          Text(
            error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        if (!current) const Text('Account access ended.'),
        if (loading || busy) const LinearProgressIndicator(),
        if (current && property != null) ...[
          Text(
            property!['videoUrl'] == null
                ? 'No video link provided.'
                : 'Public video link is on record.',
          ),
          OutlinedButton(
            onPressed: busy || loading ? null : () => editLink(false),
            child: const Text('Edit / remove video link'),
          ),
          Text(
            property!['virtualTourUrl'] == null
                ? 'No tour link provided.'
                : 'Public virtual-tour link is on record.',
          ),
          OutlinedButton(
            onPressed: busy || loading ? null : () => editLink(true),
            child: const Text('Edit / remove tour link'),
          ),
          Text(
            textValue(property!['title'], 'My listing'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          if (property!['coverImageUrl'] is String &&
              !photos.contains(property!['coverImageUrl'])) ...[
            ListingImage(
              url: property!['coverImageUrl'] as String,
              height: 180,
            ),
            const Text('Current cover (outside the gallery)'),
            TextButton(
              onPressed: busy || loading
                  ? null
                  : () => change({
                      'action': 'remove',
                      'mediaUrl': property!['coverImageUrl'],
                    }),
              child: const Text('Remove cover reference'),
            ),
          ],
          if (photos.isEmpty)
            const Text(
              'No gallery photographs. Use the listing upload action to add one.',
            ),
          for (var index = 0; index < photos.length; index++)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ListingImage(url: photos[index], height: 180),
                    Text(
                      'Photograph ${index + 1}${property!['coverImageUrl'] == photos[index] ? ' · Cover' : ''}',
                    ),
                    Wrap(
                      spacing: 8,
                      children: [
                        TextButton(
                          onPressed:
                              busy ||
                                  loading ||
                                  property!['coverImageUrl'] == photos[index]
                              ? null
                              : () => change({
                                  'action': 'add',
                                  'mediaType': 'cover',
                                  'mediaUrl': photos[index],
                                }),
                          child: const Text('Use as cover'),
                        ),
                        IconButton(
                          tooltip: 'Move earlier',
                          onPressed: busy || loading || index == 0
                              ? null
                              : () => move(index, -1),
                          icon: const Icon(Icons.arrow_upward),
                        ),
                        IconButton(
                          tooltip: 'Move later',
                          onPressed:
                              busy || loading || index == photos.length - 1
                              ? null
                              : () => move(index, 1),
                          icon: const Icon(Icons.arrow_downward),
                        ),
                        TextButton(
                          onPressed: busy || loading
                              ? null
                              : () => change({
                                  'action': 'remove',
                                  'mediaUrl': photos[index],
                                }),
                          child: const Text('Remove reference'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
        if (current && error != null && !loading && !busy)
          TextButton(
            onPressed: load,
            child: const Text('Refresh before retrying'),
          ),
      ],
    ),
  );
}

class _PublicMediaLinkDialog extends StatefulWidget {
  const _PublicMediaLinkDialog({required this.tour, required this.initial});
  final bool tour;
  final String initial;
  @override
  State<_PublicMediaLinkDialog> createState() => _LinkDialogState();
}

class _LinkDialogState extends State<_PublicMediaLinkDialog> {
  late final controller = TextEditingController(text: widget.initial);
  final key = GlobalKey<FormState>();
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    scrollable: true,
    title: Text(widget.tour ? 'Public virtual-tour link' : 'Public video link'),
    content: Form(
      key: key,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Use a public HTTPS link you are authorized to publish. Never paste private files, session credentials or signed private-download links. Leave blank to remove the listing link. No media file is uploaded or deleted here.',
          ),
          TextFormField(
            controller: controller,
            maxLength: 2048,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(labelText: 'Public HTTPS URL'),
            validator: (value) {
              if (value == null || value.trim().isEmpty) return null;
              final uri = Uri.tryParse(value.trim());
              return uri == null ||
                      uri.scheme != 'https' ||
                      uri.host.isEmpty ||
                      uri.userInfo.isNotEmpty ||
                      uri.port != 443 ||
                      uri.hasFragment
                  ? 'Use a public HTTPS URL without credentials or a fragment'
                  : null;
            },
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () {
          if (key.currentState!.validate())
            Navigator.pop(context, controller.text.trim());
        },
        child: const Text('Save listing link'),
      ),
    ],
  );
}
