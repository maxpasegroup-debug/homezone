import 'package:flutter/material.dart';
import '../marketplace/marketplace_repository.dart';

/// A selection borrows the account; it owns no credentials or collections.
class WorkspaceRecordPicker extends StatefulWidget {
  const WorkspaceRecordPicker({
    super.key,
    required this.repository,
    required this.title,
    required this.empty,
    required this.read,
    required this.label,
    this.eligible,
  });
  final MarketplaceRepository repository;
  final String title, empty;
  final Future<JsonObject> Function(String? cursor) read;
  final String Function(JsonObject row) label;
  final bool Function(JsonObject row)? eligible;
  @override
  State<WorkspaceRecordPicker> createState() => _PickerState();
}

class _PickerState extends State<WorkspaceRecordPicker> {
  late final owner = widget.repository.session.identity?.id;
  late final generation = widget.repository.coordinator.generation;
  final rows = <JsonObject>[];
  String? cursor, error;
  bool loading = false, started = false, retryReset = false;
  int epoch = 0;
  bool get current =>
      mounted &&
      owner != null &&
      widget.repository.session.verified &&
      widget.repository.session.identity?.id == owner &&
      widget.repository.coordinator.generation == generation;
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
        rows.clear();
        cursor = null;
        loading = false;
        error = 'Your session changed. Return and sign in again.';
      });
    }
  }

  @override
  void dispose() {
    epoch++;
    widget.repository.session.removeListener(changed);
    super.dispose();
  }

  Future<void> load({bool reset = false}) async {
    if (!current || loading || (!reset && started && cursor == null)) return;
    final request = ++epoch, previous = reset ? null : cursor;
    setState(() {
      loading = true;
      error = null;
      retryReset = reset || !started;
    });
    try {
      final data = await widget.read(previous);
      if (!current || request != epoch) return;
      final next = data['nextCursor'];
      if (!data.containsKey('nextCursor') ||
          (next != null &&
              (next is! String || next.length > 512 || next == previous)))
        throw const FormatException();
      final items = objects(data['items']);
      final additions = <JsonObject>[];
      for (final row in items) {
        if (row['id'] is! String ||
            !RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(row['id'] as String))
          throw const FormatException();
        if (widget.eligible?.call(row) ?? true) additions.add(row);
      }
      setState(() {
        if (reset) rows.clear();
        for (final row in additions) {
          if (!rows.any((r) => r['id'] == row['id'])) rows.add(row);
        }
        cursor = next as String?;
        started = true;
      });
    } catch (failure) {
      if (current && request == epoch)
        setState(() => error = marketplaceError(failure));
    } finally {
      if (mounted && request == epoch) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.title),
      actions: [
        IconButton(
          tooltip: 'Refresh',
          onPressed: current && !loading ? () => load(reset: true) : null,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Choose an account record. Selection does not submit a request; the server checks permission again when you continue.',
        ),
        if (!current) const Text('Account access ended.'),
        if (error != null)
          Text(
            error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        if (current && started && !loading && rows.isEmpty && error == null)
          Text(
            cursor == null
                ? widget.empty
                : 'No eligible records on the pages loaded. Load more to continue.',
          ),
        if (current)
          for (final row in rows)
            Card(
              child: ListTile(
                title: Text(widget.label(row)),
                onTap: loading ? null : () => Navigator.pop(context, row),
              ),
            ),
        if (loading) const Center(child: CircularProgressIndicator()),
        if (current && !loading && error != null)
          TextButton(
            onPressed: () => load(reset: retryReset),
            child: const Text('Retry'),
          ),
        if (current && !loading && error == null && cursor != null)
          TextButton(onPressed: load, child: const Text('Load more')),
      ],
    ),
  );
}
