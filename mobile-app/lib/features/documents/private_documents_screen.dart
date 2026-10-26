import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../marketplace/marketplace_repository.dart';

class PrivateDocumentsScreen extends StatefulWidget {
  const PrivateDocumentsScreen({
    super.key,
    required this.repository,
    required this.scope,
    required this.parent,
  });
  final MarketplaceRepository repository;
  final String scope, parent;
  @override
  State<PrivateDocumentsScreen> createState() => _PrivateDocumentsState();
}

class _PrivateDocumentsState extends State<PrivateDocumentsScreen> {
  final operation = List.generate(
    4,
    (_) =>
        Random.secure().nextInt(0x100000000).toRadixString(16).padLeft(8, '0'),
  ).join();
  static const channel = MethodChannel('homezone/private-documents');
  late final owner = widget.repository.session.identity?.id;
  late final generation = widget.repository.coordinator.generation;
  List<JsonObject> files = [];
  bool busy = false, loading = false, canUpload = false;
  String? error;
  bool get current =>
      mounted &&
      owner != null &&
      widget.repository.session.identity?.id == owner &&
      widget.repository.coordinator.generation == generation;
  @override
  void initState() {
    super.initState();
    widget.repository.session.addListener(sessionChanged);
    load();
  }

  void cancelNative() {
    channel
        .invokeMethod<void>('cancel', {'operation': operation})
        .then<void>((_) {}, onError: (Object _) {});
  }

  void sessionChanged() {
    if (mounted && !current) {
      cancelNative();
      setState(() {
        files.clear();
        canUpload = false;
        error = 'The session changed. Sign in again.';
      });
    }
  }

  @override
  void dispose() {
    widget.repository.session.removeListener(sessionChanged);
    cancelNative();
    super.dispose();
  }

  Future<void> load() async {
    if (!current || loading || busy) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.repository.call(
        'GET',
        '/api/mobile/documents',
        query: {'scope': widget.scope, 'parent': widget.parent},
      );
      final rows = objects(data['files']);
      if (data['canUpload'] is! bool) throw const FormatException();
      if (current)
        setState(() {
          files = rows;
          canUpload = data['canUpload'] == true;
        });
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> upload() async {
    if (!current || busy || !canUpload) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final file = await channel.invokeMapMethod<String, dynamic>('pick', {
        'operation': operation,
      });
      if (file == null || !current) return;
      final data = await widget.repository.call(
        'POST',
        '/api/mobile/documents',
        body: {
          ...file,
          'scope': widget.scope,
          'parent': widget.parent,
          'documentType': 'OTHER',
        },
      );
      if (data['file'] is! Map) throw const FormatException();
    } on MissingPluginException {
      if (current)
        setState(
          () => error =
              'Document selection is unavailable on this platform. Use the authenticated website document controls.',
        );
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e, mutation: true));
    } finally {
      if (mounted) setState(() => busy = false);
    }
    if (current && error == null) await load();
  }

  Future<void> download(JsonObject file) async {
    if (!current || busy) return;
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: const Text('Export private PDF?'),
        content: const Text(
          'Choose a destination you control. An exported copy is outside HOMEZONE and cannot be revoked by signing out. No file is opened automatically.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Choose destination'),
          ),
        ],
      ),
    );
    if (yes != true || !current) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final id = file['id'];
      if (id is! String || !RegExp(r'^[a-f0-9-]{36}$').hasMatch(id))
        throw const FormatException();
      final data = await widget.repository.call(
        'GET',
        '/api/mobile/documents/$id',
      );
      if (!current) return;
      if (data['base64'] is! String || data['fileName'] is! String)
        throw const FormatException();
      final written = await channel.invokeMethod<bool>('export', {
        ...data,
        'operation': operation,
      });
      if (written == true && current)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('The chosen destination confirmed the PDF export.'),
          ),
        );
    } on MissingPluginException {
      if (current)
        setState(
          () => error =
              'Document export is unavailable on this platform. Use the authenticated website download.',
        );
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.repository.session,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: const Text('Private documents'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: busy || loading ? null : load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: !current
          ? const Center(child: Text('Sign in again to access documents.'))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const Text(
                  'Authenticated PDFs up to 512 KiB. Uploads and exports require an available approved safety scanner. No public download links. Larger files and removal await approved storage and retention workflows.',
                ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text(
                      error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                if (loading || busy) const LinearProgressIndicator(),
                if (!loading && error == null && files.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No managed private documents yet. Legacy external files require a separate privacy review.',
                    ),
                  ),
                for (final file in files)
                  Card(
                    child: ListTile(
                      title: Text(textValue(file['fileName'], 'Private PDF')),
                      subtitle: Text('${file['bytes']} bytes'),
                      trailing: const Icon(Icons.download_outlined),
                      onTap: busy ? null : () => download(file),
                    ),
                  ),
                if (canUpload)
                  FilledButton.icon(
                    onPressed: busy || loading ? null : upload,
                    icon: const Icon(Icons.upload_file),
                    label: const Text('Upload private PDF'),
                  ),
              ],
            ),
    ),
  );
}
