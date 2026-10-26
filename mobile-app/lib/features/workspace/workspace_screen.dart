import 'workspace_record_picker.dart';
import 'listing_photographs_screen.dart';
import '../documents/private_documents_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../marketplace/marketplace_repository.dart';

String recordId(JsonObject item) {
  final id = item['id'];
  if (id is! String || !RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(id)) {
    throw const FormatException('Record unavailable');
  }
  return id;
}

class FieldSpec {
  const FieldSpec(
    this.key,
    this.label, {
    this.required = false,
    this.number = false,
    this.date = false,
    this.lines = 1,
    this.options,
    this.minimum,
    this.maximum,
    this.integer = false,
  });
  final String key, label;
  final bool required, number, date;
  final int lines;
  final List<String>? options;
  final num? minimum, maximum;
  final bool integer;
}

const _name = FieldSpec('name', 'Name', required: true);
const _city = FieldSpec('city', 'City', required: true);
const _notes = FieldSpec('notes', 'Notes', lines: 3);
const _when = FieldSpec(
  'scheduledAt',
  'Date and time',
  required: true,
  date: true,
);
const _price = FieldSpec('price', 'Price', number: true);
const _description = FieldSpec(
  'description',
  'Description',
  required: true,
  lines: 4,
);
const _propertyFields = [
  FieldSpec('title', 'Property title', required: true),
  _description,
  _city,
  FieldSpec('locality', 'Locality'),
  FieldSpec('country', 'Country'),
  FieldSpec('state', 'State / region'),
  FieldSpec('address', 'Address'),
  FieldSpec('latitude', 'Latitude', number: true, minimum: -90, maximum: 90),
  FieldSpec(
    'longitude',
    'Longitude',
    number: true,
    minimum: -180,
    maximum: 180,
  ),
  _price,
  FieldSpec(
    'intent',
    'Purpose',
    options: ['BUY', 'RENT', 'LEASE', 'INVEST'],
    required: true,
  ),
  FieldSpec(
    'category',
    'Category',
    options: [
      'RESIDENTIAL',
      'COMMERCIAL',
      'LAND',
      'INDUSTRIAL',
      'AGRICULTURAL',
      'HOSPITALITY',
      'LUXURY',
    ],
    required: true,
  ),
  FieldSpec('propertyType', 'Property type', required: true),
  FieldSpec(
    'currency',
    'Currency',
    options: ['INR', 'AED', 'USD', 'GBP', 'EUR'],
    required: true,
  ),
  FieldSpec('bedrooms', 'Bedrooms', number: true, integer: true, maximum: 20),
  FieldSpec('bathrooms', 'Bathrooms', number: true, integer: true, maximum: 20),
  FieldSpec('areaValue', 'Area', number: true),
  FieldSpec('areaUnit', 'Area unit'),
];
const _projectFields = [
  _name,
  _city,
  _description,
  FieldSpec(
    'constructionStatus',
    'Construction stage',
    options: [
      'PLANNING',
      'FOUNDATION',
      'STRUCTURE',
      'FINISHING',
      'READY',
      'COMPLETED',
    ],
  ),
];
const _providerFields = [
  FieldSpec('businessName', 'Business name', required: true),
  FieldSpec('category', 'Service category', required: true),
  _city,
  FieldSpec('description', 'About your service', lines: 4),
  FieldSpec('priceLabel', 'Price information'),
  FieldSpec('availability', 'Availability'),
];

/// Role is obtained exclusively from the verified controller; server repeats checks.
class WorkspaceScreen extends StatelessWidget {
  const WorkspaceScreen({super.key, required this.repository});
  final MarketplaceRepository repository;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: repository.session,
    builder: (context, _) {
      final identity = repository.session.identity;
      if (identity == null)
        return Scaffold(
          appBar: AppBar(title: const Text('My workspace')),
          body: Center(
            child: FilledButton(
              onPressed: () => Navigator.pushNamed(context, '/sign-in'),
              child: const Text('Sign in to continue'),
            ),
          ),
        );
      if (['ADMIN', 'SUPER_ADMIN'].contains(identity.role))
        return Scaffold(
          appBar: AppBar(title: const Text('Administration')),
          body: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Text(
                  'Use the existing HOMEZONE web administration interface. Administrative tools are not duplicated in this app.',
                ),
                SelectableText(
                  '${repository.client.configuration.baseUri.origin}/admin',
                ),
              ],
            ),
          ),
        );
      final generationAtBuild = repository.coordinator.generation;
      final modules = <String, String>{
        if (['USER', 'OWNER', 'BROKER'].contains(identity.role))
          'properties': 'My listings',
        if (['OWNER', 'BROKER'].contains(identity.role))
          'ownerEnquiries': 'Listing enquiries',
        if (identity.role == 'BROKER') ...{
          'crm': 'Leads & pipeline',
          'calendar': 'Follow-up calendar',
          'team': 'My team',
          'commissions': 'Commissions',
        },
        if (identity.role == 'BUILDER') 'projects': 'Projects & inventory',
        if (identity.role == 'SERVICE_PROVIDER') ...{
          'providerProfile': 'Provider profile',
          'providerRequests': 'Incoming service requests',
        },
        'requests': 'My service requests',
        'serviceBookings': 'Service bookings',
        'studio': 'HOMEZONE Studio',
        'notifications': 'Notifications',
        'payments': 'Payment history',
        'accountRequests': 'Account and refund requests',
        'visits': 'Property visits',
        'history': 'Recently viewed',
      };
      return Scaffold(
        appBar: AppBar(title: const Text('My workspace')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Account role: ${identity.role}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            OutlinedButton.icon(
              onPressed: () => Navigator.pushNamed(context, '/discovery'),
              icon: const Icon(Icons.home_work_outlined),
              label: const Text('Browse properties'),
            ),
            TextButton(
              onPressed: () async {
                final navigator = Navigator.of(context);
                final messenger = ScaffoldMessenger.of(context);
                final acknowledged = await repository.session.signOut();
                if (!navigator.mounted) return;
                if (repository.session.verified) {
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text(
                        'An account operation is still active. Please try again.',
                      ),
                    ),
                  );
                  return;
                }
                navigator.pushNamedAndRemoveUntil('/sign-in', (_) => false);
                messenger.showSnackBar(
                  SnackBar(
                    content: Text(
                      !repository.session.credentialRemovalConfirmed
                          ? 'In-memory access was cleared. Device credential removal could not be confirmed; use the website account controls before sharing this device.'
                          : acknowledged
                          ? 'The server acknowledged sign-out. Local credentials were cleared.'
                          : 'Local credentials were cleared. Server revocation could not be confirmed.',
                    ),
                  ),
                );
              },
              child: const Text('Sign out'),
            ),
            const Text(
              'Records are loaded from your HOMEZONE account. Availability and actions depend on server permissions.',
            ),
            Card(
              child: ListTile(
                title: const Text('Account summary'),
                trailing: const Icon(Icons.insights_outlined),
                onTap: () => Navigator.push<void>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => WorkspaceSummary(repository: repository),
                  ),
                ),
              ),
            ),
            OutlinedButton(
              onPressed: () async {
                final yes = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    scrollable: true,
                    title: const Text('Request account-deletion review?'),
                    content: const Text(
                      'This records a request for human review. It does not delete your account or data. Retention and deletion rules must be approved before deletion can occur.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Record review request'),
                      ),
                    ],
                  ),
                );
                if (yes != true ||
                    !context.mounted ||
                    repository.session.identity?.id != identity.id ||
                    repository.coordinator.generation != generationAtBuild)
                  return;
                try {
                  final result = await repository.call(
                    'POST',
                    '/api/mobile/account-requests',
                    body: {'kind': 'DELETION_REVIEW'},
                  );
                  if (result['request'] is! Map) throw const FormatException();
                  if (context.mounted &&
                      repository.session.identity?.id == identity.id &&
                      repository.coordinator.generation == generationAtBuild)
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Review request status: ${(result['request'] as Map)['status']}. No account data was deleted.',
                        ),
                      ),
                    );
                } catch (e) {
                  if (context.mounted &&
                      repository.session.identity?.id == identity.id &&
                      repository.coordinator.generation == generationAtBuild)
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(marketplaceError(e, mutation: true)),
                      ),
                    );
                }
              },
              child: const Text('Request account-deletion review'),
            ),
            for (final entry in modules.entries)
              Card(
                child: ListTile(
                  title: Text(entry.value),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push<void>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => WorkspaceRecords(
                        repository: repository,
                        module: entry.key,
                        title: entry.value,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    },
  );
}

class WorkspaceRecords extends StatefulWidget {
  const WorkspaceRecords({
    super.key,
    required this.repository,
    required this.module,
    required this.title,
    this.parent,
  });
  final MarketplaceRepository repository;
  final String module, title;
  final String? parent;
  @override
  State<WorkspaceRecords> createState() => _WorkspaceRecordsState();
}

class _WorkspaceRecordsState extends State<WorkspaceRecords> {
  final items = <JsonObject>[];
  late final String? owner;
  late final int ownerGeneration;
  int page = 0, epoch = 0;
  String? cursor;
  bool loading = false, more = false;
  String? error;
  bool get current =>
      mounted &&
      owner != null &&
      widget.repository.session.identity?.id == owner &&
      ownerGeneration == widget.repository.coordinator.generation;
  @override
  void initState() {
    super.initState();
    owner = widget.repository.session.identity?.id;
    ownerGeneration = widget.repository.coordinator.generation;
    widget.repository.session.addListener(changed);
    load();
  }

  void changed() {
    if (mounted && !current) {
      epoch++;
      setState(() {
        items.clear();
        error = 'Your session changed. Sign in again.';
      });
    }
  }

  @override
  void dispose() {
    epoch++;
    widget.repository.session.removeListener(changed);
    super.dispose();
  }

  Future<void> load({bool next = false}) async {
    if (!current || loading || (next && cursor == null)) return;
    final request = ++epoch,
        generation = widget.repository.coordinator.generation;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final requested = next ? page + 1 : 1;
      final data = await widget.repository.workspacePage(
        widget.module,
        parent: widget.parent,
        after: next ? cursor : null,
      );
      if (!current ||
          request != epoch ||
          generation != widget.repository.coordinator.generation)
        return;
      if (data['source'] != 'database' ||
          data['module'] != widget.module ||
          data['mode'] != 'cursor' ||
          data['hasMore'] is! bool ||
          !data.containsKey('nextCursor') ||
          (data['nextCursor'] != null &&
              (data['nextCursor'] is! String ||
                  data['nextCursor'] == (next ? cursor : null))) ||
          data['hasMore'] != (data['nextCursor'] != null))
        throw const FormatException();
      final records = objects(data['items']);
      if (records.length > 20) throw const FormatException();
      String key(JsonObject row) {
        final value =
            row['id'] ??
            (row['property'] is Map ? (row['property'] as Map)['id'] : null);
        if (value is! String ||
            !RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(value))
          throw const FormatException();
        return value;
      }

      for (final record in records) {
        key(record);
      }
      setState(() {
        if (!next) items.clear();
        for (final item in records) {
          if (!items.any((v) => key(v) == key(item))) items.add(item);
        }
        page = requested;
        more = data['hasMore'] as bool;
        cursor = data['nextCursor'] as String?;
      });
    } catch (e) {
      if (current && request == epoch)
        setState(() => error = marketplaceError(e));
    } finally {
      if (mounted && request == epoch) setState(() => loading = false);
    }
  }

  Future<void> edit(
    String title,
    String path,
    List<FieldSpec> fields, {
    String method = 'POST',
    JsonObject initial = const {},
    JsonObject fixed = const {},
  }) async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => WorkspaceForm(
          repository: widget.repository,
          title: title,
          path: path,
          method: method,
          fields: fields,
          initial: initial,
          fixed: fixed,
        ),
      ),
    );
    if (changed == true && current) await load();
  }

  Future<void> create() async {
    final parent = widget.parent;
    switch (widget.module) {
      case 'properties':
        await edit(
          'Create listing',
          '/api/properties',
          _propertyFields,
          fixed: {'status': 'DRAFT'},
        );
        break;
      case 'projects':
        await edit('Create project', '/api/builder/projects', _projectFields);
        break;
      case 'units':
        await edit('Add unit', '/api/builder/projects/$parent/units', [
          const FieldSpec('unitNumber', 'Unit number', required: true),
          const FieldSpec('unitType', 'Unit type', required: true),
          _price,
          const FieldSpec('areaValue', 'Area', number: true),
          const FieldSpec('floor', 'Floor', number: true),
          const FieldSpec('bedrooms', 'Bedrooms', number: true),
          const FieldSpec('bathrooms', 'Bathrooms', number: true),
        ]);
        break;
      case 'towers':
        await edit('Add tower', '/api/builder/projects/$parent/towers', [
          _name,
          const FieldSpec('floors', 'Floors', number: true),
        ]);
        break;
      case 'team':
      case 'builderTeam':
        await edit(
          'Add team member',
          widget.module == 'team'
              ? '/api/pro/team'
              : '/api/builder/projects/$parent/team',
          [
            _name,
            const FieldSpec('email', 'Email'),
            const FieldSpec('phone', 'Phone'),
            FieldSpec(
              'role',
              'Team role',
              options: widget.module == 'team'
                  ? ['MANAGER', 'AGENT', 'TELECALLER']
                  : ['MANAGER', 'SALES', 'MARKETING', 'SITE_COORDINATOR'],
            ),
          ],
        );
        break;
      case 'campaigns':
        await edit('Add campaign', '/api/builder/projects/$parent/campaigns', [
          _name,
          const FieldSpec(
            'channel',
            'Channel',
            required: true,
            options: [
              'HOMEZONE',
              'META',
              'GOOGLE',
              'YOUTUBE',
              'WHATSAPP',
              'OFFLINE',
            ],
          ),
          const FieldSpec('budget', 'Budget', number: true),
        ]);
        break;
      case 'crm':
        await edit('Create lead', '/api/pro/leads', [
          _name,
          const FieldSpec('phone', 'Phone', required: true),
          const FieldSpec('message', 'Requirement', required: true, lines: 4),
        ]);
        break;
      case 'requests':
        await edit('Request a service', '/api/service-requests', [
          const FieldSpec('category', 'Service category', required: true),
          _city,
          const FieldSpec('budget', 'Budget', required: true),
          const FieldSpec('message', 'Requirement', required: true, lines: 4),
        ]);
        break;
      case 'providerProfile':
        await edit(
          'Create provider profile',
          '/api/service-providers',
          _providerFields,
        );
        break;
      case 'studio':
        await edit(
          'Request Studio service',
          '/api/studio-requests',
          [
            const FieldSpec(
              'serviceType',
              'Service type',
              required: true,
              options: [
                'Property Photography',
                'Drone Photography',
                'Walkthrough Video',
                'AI Video',
                'AI Brochure',
                'Premium Listing Design',
                'Social Media Package',
                'YouTube Feature',
                'Meta Ads Setup',
                'Google Ads Setup',
                'Virtual Staging',
                'AI Voice-over',
              ],
            ),
            _city,
            const FieldSpec('budget', 'Budget'),
            _notes,
          ],
          fixed: {'status': 'SUBMITTED'},
        );
        break;
      case 'visits':
        try {
          final selected = await Navigator.push<JsonObject>(
            context,
            MaterialPageRoute(
              builder: (_) => WorkspaceRecordPicker(
                repository: widget.repository,
                title: 'Choose your enquiry',
                empty:
                    'No eligible property enquiries. Send a property enquiry first.',
                read: (cursor) => widget.repository.accountCollection(
                  'enquiries',
                  cursor: cursor,
                ),
                eligible: (row) => row['property'] is Map,
                label: (row) => textValue(
                  row['message'],
                  row['property'] is Map
                      ? textValue(
                          (row['property'] as Map)['title'],
                          'Property enquiry',
                        )
                      : 'Property enquiry',
                ),
              ),
            ),
          );
          if (selected != null && current)
            await edit(
              'Request a property visit',
              '/api/mobile/visits',
              [_when, _notes],
              fixed: {'enquiryId': recordId(selected)},
            );
        } catch (e) {
          if (current) setState(() => error = marketplaceError(e));
        }
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final canCreate = [
      'properties',
      'projects',
      'units',
      'towers',
      'team',
      'builderTeam',
      'campaigns',
      'crm',
      'requests',
      'studio',
      'visits',
      'providerProfile',
    ].contains(widget.module);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: loading ? null : () => load(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: current && canCreate
          ? FloatingActionButton(
              tooltip: 'Create',
              onPressed: loading ? null : create,
              child: const Icon(Icons.add),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () => load(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            if (error != null)
              Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            if (!current)
              const Text('Account access ended. Return and sign in.'),
            if (current && !loading && items.isEmpty && error == null)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No records yet. Only records belonging to your account are shown.',
                ),
              ),
            if (current)
              for (final item in items)
                Card(
                  child: ListTile(
                    isThreeLine: false,
                    title: Text(recordTitle(item)),
                    subtitle: Text(
                      recordSummary(item),
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: item['id'] != null
                        ? const Icon(Icons.chevron_right)
                        : null,
                    onTap: widget.module == 'history' && item['property'] is Map
                        ? () async {
                            await Navigator.pushNamed(
                              context,
                              '/property',
                              arguments: (item['property'] as Map)['id'],
                            );
                            if (current) await load();
                          }
                        : item['id'] == null
                        ? null
                        : () async {
                            await Navigator.push<void>(
                              context,
                              MaterialPageRoute(
                                builder: (_) => WorkspaceDetail(
                                  repository: widget.repository,
                                  module: widget.module,
                                  item: item,
                                  parent: widget.parent,
                                ),
                              ),
                            );
                            if (current) load();
                          },
                  ),
                ),
            if (loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              ),
            if (current && more && !loading)
              TextButton(
                onPressed: () => load(next: true),
                child: const Text('Load more'),
              ),
          ],
        ),
      ),
    );
  }
}

String recordTitle(JsonObject item) {
  for (final key in [
    'title',
    'name',
    'unitNumber',
    'businessName',
    'note',
    'category',
    'serviceType',
  ]) {
    if (item[key] is String) return textValue(item[key]);
  }
  if (item['property'] is JsonObject)
    return textValue((item['property'] as JsonObject)['title']);
  return textValue(item['status'], 'Account record');
}

String recordSummary(JsonObject item) => [
  'status',
  'verificationStatus',
  'city',
  'price',
  'amount',
  'message',
  'scheduledAt',
  'dueAt',
  'stage',
].where((key) => item[key] != null).map((key) => '${item[key]}').join(' · ');

class WorkspaceDetail extends StatefulWidget {
  const WorkspaceDetail({
    super.key,
    required this.repository,
    required this.module,
    required this.item,
    this.parent,
  });
  final MarketplaceRepository repository;
  final String module;
  final JsonObject item;
  final String? parent;
  @override
  State<WorkspaceDetail> createState() => _WorkspaceDetailState();
}

class _WorkspaceDetailState extends State<WorkspaceDetail> {
  late final String? owner = widget.repository.session.identity?.id;
  late final int ownerGeneration = widget.repository.coordinator.generation;
  bool busy = false;
  String? error;
  bool get current =>
      mounted &&
      owner != null &&
      widget.repository.session.identity?.id == owner &&
      ownerGeneration == widget.repository.coordinator.generation;
  String get id => recordId(widget.item);
  Future<void> form(
    String title,
    String path,
    List<FieldSpec> fields, {
    String method = 'POST',
    JsonObject fixed = const {},
    JsonObject? initial,
  }) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => WorkspaceForm(
          repository: widget.repository,
          title: title,
          path: path,
          method: method,
          fields: fields,
          fixed: fixed,
          initial: initial ?? widget.item,
        ),
      ),
    );
    if (saved == true && current) Navigator.pop(context);
  }

  Future<void> action(
    String label,
    String path,
    JsonObject body, {
    String method = 'PATCH',
  }) async {
    if (busy || !current) return;
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(label),
        content: const Text(
          'This changes your HOMEZONE account record. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (yes != true || !current) return;
    setState(() => busy = true);
    try {
      await widget.repository.call(method, path, body: body);
      if (current) Navigator.pop(context);
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e, mutation: true));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget button(String title, VoidCallback fn) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: OutlinedButton(onPressed: busy ? null : fn, child: Text(title)),
  );
  void collection(String module, String title) => Navigator.push<void>(
    context,
    MaterialPageRoute(
      builder: (_) => WorkspaceRecords(
        repository: widget.repository,
        module: module,
        title: title,
        parent: id,
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.repository.session,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: Text(current ? recordTitle(widget.item) : 'Session ended'),
      ),
      body: !current
          ? const Center(child: Text('Sign in again to access this record.'))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (error != null)
                  Text(
                    error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                for (final label in _recordLabels.entries)
                  if (widget.item.containsKey(label.key))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        '${label.value}: ${displayRecordValue(widget.item[label.key])}',
                      ),
                    ),
                if (['calendar', 'leadTasks'].contains(widget.module) &&
                    widget.item['leadId'] is String)
                  button(
                    widget.item['completedAt'] == null
                        ? 'Complete task'
                        : 'Reopen task',
                    () => action(
                      'Update task',
                      '/api/leads/${widget.item['leadId']}/tasks/$id',
                      {'completed': widget.item['completedAt'] == null},
                    ),
                  ),
                if (widget.module == 'leadNotes' &&
                    widget.parent != null &&
                    widget.item['canEdit'] == true)
                  button(
                    'Edit note',
                    () => form(
                      'Edit note',
                      '/api/leads/${widget.parent}/notes/$id',
                      [
                        const FieldSpec(
                          'note',
                          'Note',
                          required: true,
                          lines: 4,
                        ),
                      ],
                      method: 'PATCH',
                    ),
                  ),
                if (widget.module == 'visits' &&
                    [
                      'REQUESTED',
                      'SCHEDULED',
                      'RESCHEDULED',
                    ].contains(widget.item['status']))
                  button(
                    'Cancel visit request',
                    () => action('Cancel visit', '/api/mobile/visits/$id', {}),
                  ),
                if (widget.module == 'leadVisits' && widget.parent != null)
                  button(
                    'Update visit',
                    () => form(
                      'Update visit',
                      '/api/leads/${widget.parent}/visits/$id',
                      [
                        _when,
                        const FieldSpec(
                          'status',
                          'Status',
                          options: [
                            'SCHEDULED',
                            'COMPLETED',
                            'CANCELLED',
                            'RESCHEDULED',
                          ],
                        ),
                        _notes,
                      ],
                      method: 'PATCH',
                    ),
                  ),
                if (widget.module == 'requestQuotes' &&
                    widget.item['status'] == 'sent') ...[
                  if (widget.item['canDecide'] == true) ...[
                    button(
                      'Accept quote',
                      () => form(
                        'Accept quote',
                        '/api/service-quotes/$id',
                        [_when],
                        method: 'PATCH',
                        fixed: {'action': 'ACCEPT'},
                      ),
                    ),
                    button(
                      'Reject quote',
                      () => action('Reject quote', '/api/service-quotes/$id', {
                        'action': 'REJECT',
                      }),
                    ),
                  ] else
                    button(
                      'Revise quote',
                      () => form(
                        'Revise quote',
                        '/api/service-quotes/$id',
                        [
                          const FieldSpec('amount', 'Amount', number: true),
                          const FieldSpec('message', 'Details', lines: 3),
                        ],
                        method: 'PATCH',
                        fixed: {'action': 'REVISE'},
                      ),
                    ),
                ],
                if (widget.module == 'properties') ...[
                  button(
                    'Edit listing',
                    () => form(
                      'Edit listing',
                      '/api/properties/$id',
                      _propertyFields,
                      method: 'PATCH',
                    ),
                  ),
                  for (final status in [
                    'DRAFT',
                    'PENDING_REVIEW',
                    'ARCHIVED',
                    if (widget.item['verificationStatus'] == 'VERIFIED')
                      'PUBLISHED',
                  ])
                    button(
                      status.replaceAll('_', ' '),
                      () => action(
                        'Change listing status',
                        '/api/properties/$id',
                        {'status': status},
                      ),
                    ),
                  button(
                    'Attach property photograph',
                    () => form(
                      'Photograph URL',
                      '/api/properties/$id/media',
                      [
                        const FieldSpec(
                          'mediaUrl',
                          'Approved HTTPS image URL',
                          required: true,
                        ),
                      ],
                      method: 'PATCH',
                      fixed: {'action': 'add', 'mediaType': 'image'},
                    ),
                  ),
                  button('Upload photograph from device', () => uploadPhoto()),
                  button(
                    'Manage listing photographs',
                    () => Navigator.push<void>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ListingPhotographsScreen(
                          repository: widget.repository,
                          id: id,
                        ),
                      ),
                    ),
                  ),
                  button(
                    'Private documents',
                    () => Navigator.push<void>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PrivateDocumentsScreen(
                          repository: widget.repository,
                          scope: 'property',
                          parent: id,
                        ),
                      ),
                    ),
                  ),
                ],
                if (['crm', 'ownerEnquiries'].contains(widget.module)) ...[
                  button(
                    'Update lead / follow-up',
                    () => form('Lead status', '/api/leads/$id', [
                      const FieldSpec(
                        'stage',
                        'Stage',
                        options: [
                          'NEW',
                          'CONTACTED',
                          'QUALIFIED',
                          'SITE_VISIT',
                          'NEGOTIATION',
                          'WON',
                          'LOST',
                          'ARCHIVED',
                          'NURTURE',
                        ],
                      ),
                      const FieldSpec('nextAction', 'Next action'),
                      const FieldSpec(
                        'followUpAt',
                        'Follow-up time',
                        date: true,
                      ),
                    ], method: 'PATCH'),
                  ),
                  button(
                    'Add note',
                    () => form('Add note', '/api/leads/$id/notes', [
                      const FieldSpec('note', 'Note', required: true, lines: 4),
                    ]),
                  ),
                  button(
                    'All notes',
                    () => collection('leadNotes', 'Lead notes'),
                  ),
                  button(
                    'All tasks',
                    () => collection('leadTasks', 'Lead tasks'),
                  ),
                  button(
                    'All visits',
                    () => collection('leadVisits', 'Lead visits'),
                  ),
                  button(
                    'Add task',
                    () => form('Add task', '/api/leads/$id/tasks', [
                      const FieldSpec('title', 'Task', required: true),
                      const FieldSpec('dueAt', 'Due time', date: true),
                    ]),
                  ),
                  button(
                    'Schedule visit',
                    () => form('Schedule visit', '/api/leads/$id/visits', [
                      _when,
                      _notes,
                    ]),
                  ),
                  for (final task
                      in (widget.item['tasks'] as List? ?? [])
                          .whereType<JsonObject>())
                    button(
                      '${task['completedAt'] != null ? 'Reopen' : 'Complete'}: ${task['title']}',
                      () => action(
                        'Update task',
                        '/api/leads/$id/tasks/${recordId(task)}',
                        {'completed': task['completedAt'] == null},
                      ),
                    ),
                  for (final visit
                      in (widget.item['siteVisits'] as List? ?? [])
                          .whereType<JsonObject>())
                    button(
                      'Visit ${visit['status']}: ${visit['scheduledAt']}',
                      () => form(
                        'Update visit',
                        '/api/leads/$id/visits/${recordId(visit)}',
                        [
                          _when,
                          const FieldSpec(
                            'status',
                            'Status',
                            options: [
                              'SCHEDULED',
                              'COMPLETED',
                              'CANCELLED',
                              'RESCHEDULED',
                            ],
                          ),
                        ],
                        method: 'PATCH',
                        initial: visit,
                      ),
                    ),
                  for (final note
                      in (widget.item['notes'] as List? ?? [])
                          .whereType<JsonObject>())
                    Text('Note: ${textValue(note['note'])}'),
                ],
                if (widget.module == 'crm') ...[
                  button('Assign within my team', () => assignLead()),
                  button(
                    'Record commission',
                    () => form(
                      'Commission record',
                      '/api/pro/leads/$id/commission',
                      [
                        const FieldSpec(
                          'dealValue',
                          'Deal value',
                          required: true,
                          number: true,
                        ),
                        const FieldSpec(
                          'commissionPercent',
                          'Commission percent',
                          required: true,
                          number: true,
                        ),
                        const FieldSpec(
                          'status',
                          'Payment status',
                          options: ['PENDING', 'OUTSTANDING', 'PAID'],
                        ),
                        _notes,
                      ],
                    ),
                  ),
                  button(
                    'Private client documents',
                    () => Navigator.push<void>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PrivateDocumentsScreen(
                          repository: widget.repository,
                          scope: 'lead',
                          parent: id,
                        ),
                      ),
                    ),
                  ),
                ],
                if (widget.module == 'team') ...[
                  button(
                    'Edit team member',
                    () => form('Team member', '/api/pro/team/$id', [
                      _name,
                      const FieldSpec('email', 'Email'),
                      const FieldSpec(
                        'role',
                        'Role',
                        options: ['MANAGER', 'AGENT', 'TELECALLER'],
                      ),
                    ], method: 'PATCH'),
                  ),
                  button(
                    widget.item['active'] == true ? 'Deactivate' : 'Activate',
                    () => action('Change membership', '/api/pro/team/$id', {
                      'active': widget.item['active'] != true,
                    }),
                  ),
                ],
                if (widget.module == 'projects') ...[
                  button(
                    'Inventory report',
                    () => Navigator.push<void>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => WorkspaceSummary(
                          repository: widget.repository,
                          project: id,
                        ),
                      ),
                    ),
                  ),
                  button(
                    'Edit project',
                    () => form(
                      'Project',
                      '/api/builder/projects/$id',
                      _projectFields,
                      method: 'PATCH',
                    ),
                  ),
                  for (final entry in {
                    'units': 'Units & reservations',
                    'towers': 'Towers',
                    'builderTeam': 'Project team',
                    'campaigns': 'Campaigns',
                    'bookings': 'Bookings',
                  }.entries)
                    button(
                      entry.value,
                      () => collection(entry.key, entry.value),
                    ),
                ],
                if ([
                  'units',
                  'towers',
                  'builderTeam',
                  'campaigns',
                ].contains(widget.module))
                  button(
                    'Edit record',
                    () => form(
                      'Edit record',
                      '/api/mobile/workspace/$id',
                      widget.module == 'units'
                          ? [
                              const FieldSpec('unitNumber', 'Unit number'),
                              const FieldSpec('unitType', 'Unit type'),
                              _price,
                              const FieldSpec(
                                'areaValue',
                                'Area',
                                number: true,
                              ),
                            ]
                          : widget.module == 'towers'
                          ? [
                              _name,
                              const FieldSpec('floors', 'Floors', number: true),
                            ]
                          : widget.module == 'builderTeam'
                          ? [
                              _name,
                              const FieldSpec('email', 'Email'),
                              const FieldSpec(
                                'role',
                                'Role',
                                options: [
                                  'MANAGER',
                                  'SALES',
                                  'MARKETING',
                                  'SITE_COORDINATOR',
                                ],
                              ),
                            ]
                          : [
                              _name,
                              const FieldSpec(
                                'status',
                                'Campaign status',
                                options: ['ACTIVE', 'PAUSED', 'COMPLETED'],
                              ),
                              const FieldSpec('budget', 'Budget', number: true),
                            ],
                      method: 'PATCH',
                      fixed: {'module': widget.module, 'parent': widget.parent},
                    ),
                  ),
                if (widget.module == 'units' &&
                    widget.item['status'] == 'AVAILABLE')
                  button(
                    'Reserve unit',
                    () => form(
                      'Reserve unit',
                      '/api/builder/projects/${widget.parent}/bookings',
                      [
                        const FieldSpec(
                          'bookingAmount',
                          'Reservation amount',
                          number: true,
                        ),
                        _notes,
                      ],
                      fixed: {'unitId': id},
                    ),
                  ),
                if (widget.module == 'bookings')
                  for (final value in [
                    if (widget.item['status'] == 'RESERVED') 'CONFIRM',
                    if ([
                      'RESERVED',
                      'CONFIRMED',
                    ].contains(widget.item['status']))
                      'RELEASE',
                    if (widget.item['status'] == 'CONFIRMED') 'SOLD',
                  ])
                    button(
                      value,
                      () => action(
                        'Update booking',
                        '/api/builder/bookings/$id',
                        {'action': value},
                      ),
                    ),
                if (widget.module == 'providerProfile')
                  button(
                    'Edit provider information',
                    () => form(
                      'Provider profile',
                      '/api/service-providers/me',
                      _providerFields,
                      method: 'PATCH',
                    ),
                  ),
                if (widget.module == 'providerRequests' &&
                    ['requested', 'quoted'].contains(widget.item['status']))
                  button(
                    'Send quote',
                    () => form(
                      'Send quote',
                      '/api/service-quotes',
                      [
                        const FieldSpec(
                          'amount',
                          'Quote amount',
                          required: true,
                          number: true,
                        ),
                        const FieldSpec(
                          'message',
                          'Quote details',
                          required: true,
                          lines: 3,
                        ),
                        const FieldSpec(
                          'validUntil',
                          'Valid until',
                          date: true,
                        ),
                      ],
                      fixed: {'requestId': id},
                    ),
                  ),
                if (['requests', 'providerRequests'].contains(widget.module))
                  button(
                    'All quotes',
                    () => collection('requestQuotes', 'Request quotes'),
                  ),
                if (['requests', 'providerRequests'].contains(widget.module))
                  for (final quote
                      in (widget.item['quotes'] as List? ?? [])
                          .whereType<JsonObject>()) ...[
                    Text(
                      'Quote: ${quote['currency']} ${quote['amount'] ?? 'Not provided'} · ${quote['status']}\n${textValue(quote['message'])}',
                    ),
                    if (quote['status'] == 'sent')
                      if (widget.module == 'requests') ...[
                        button(
                          'Accept quote',
                          () => form(
                            'Accept quote',
                            '/api/service-quotes/${recordId(quote)}',
                            [_when],
                            method: 'PATCH',
                            fixed: {'action': 'ACCEPT'},
                          ),
                        ),
                        button(
                          'Reject quote',
                          () => action(
                            'Reject quote',
                            '/api/service-quotes/${recordId(quote)}',
                            {'action': 'REJECT'},
                          ),
                        ),
                      ] else
                        button(
                          'Revise quote',
                          () => form(
                            'Revise quote',
                            '/api/service-quotes/${recordId(quote)}',
                            [
                              const FieldSpec('amount', 'Amount', number: true),
                              const FieldSpec('message', 'Details', lines: 3),
                            ],
                            method: 'PATCH',
                            initial: quote,
                            fixed: {'action': 'REVISE'},
                          ),
                        ),
                  ],
                if (widget.module == 'serviceBookings')
                  button(
                    'Open website payment controls',
                    () => openWebsite('/dashboard/services'),
                  ),
                if (widget.module == 'payments' &&
                    widget.item['status'] == 'PAID')
                  button(
                    'Request refund review',
                    () => requestReview('REFUND_REVIEW', paymentId: id),
                  ),
                if (widget.module == 'serviceBookings')
                  for (final value in [
                    if (widget.item['canManage'] == true &&
                        widget.item['status'] == 'UPCOMING')
                      'START',
                    if (widget.item['canManage'] == true &&
                        widget.item['status'] == 'IN_PROGRESS')
                      'COMPLETE',
                    if (widget.item['status'] == 'UPCOMING') 'CANCEL',
                    if (widget.item['status'] == 'UPCOMING') 'RESCHEDULE',
                  ])
                    button(
                      value,
                      () => form(
                        'Update booking',
                        '/api/service-bookings/$id',
                        [_notes, if (value == 'RESCHEDULE') _when],
                        method: 'PATCH',
                        fixed: {'action': value},
                      ),
                    ),
                if (widget.module == 'studio') ...[
                  button(
                    'Open website payment controls',
                    () => openWebsite('/dashboard/studio/$id'),
                  ),
                  button(
                    'Private delivery PDFs',
                    () => Navigator.push<void>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PrivateDocumentsScreen(
                          repository: widget.repository,
                          scope: 'studio',
                          parent: id,
                        ),
                      ),
                    ),
                  ),
                  if (widget.item['status'] == 'DELIVERED')
                    button(
                      'Approve delivery',
                      () => action(
                        'Approve delivery',
                        '/api/studio-requests/$id',
                        {'action': 'approve'},
                      ),
                    ),
                  if ([
                    'DELIVERED',
                    'QUALITY_CHECK',
                  ].contains(widget.item['status']))
                    button(
                      'Request revision',
                      () => form(
                        'Revision',
                        '/api/studio-requests/$id/revisions',
                        [
                          const FieldSpec(
                            'comments',
                            'Revision details',
                            required: true,
                            lines: 4,
                          ),
                        ],
                      ),
                    ),
                  if ([
                    'DRAFT',
                    'SUBMITTED',
                    'PAYMENT_PENDING',
                    'PAID',
                    'ASSIGNED',
                  ].contains(widget.item['status']))
                    button(
                      'Cancel order',
                      () => action(
                        'Cancel Studio order',
                        '/api/studio-requests/$id',
                        {'action': 'cancel'},
                      ),
                    ),
                  const Text(
                    'Payment status comes from the backend. No payment or refund is performed by these actions.',
                  ),
                ],
                if (widget.module == 'notifications' &&
                    widget.item['readAt'] == null)
                  button(
                    'Mark as read',
                    () => action(
                      'Mark notification read',
                      '/api/notifications/$id',
                      {},
                    ),
                  ),
              ],
            ),
    ),
  );
  Future<void> requestReview(String kind, {String? paymentId}) async {
    if (!current || busy) return;
    await action(
      'Record a review request only; no refund or account deletion is performed',
      '/api/mobile/account-requests',
      {'kind': kind, if (paymentId != null) 'paymentId': paymentId},
      method: 'POST',
    );
  }

  Future<void> openWebsite(String path) async {
    if (!current || busy) return;
    try {
      final capabilities = await widget.repository.call(
        'GET',
        '/api/mobile/capabilities',
      );
      if (!current) return;
      if (capabilities['websitePaymentHandoffEnabled'] != true ||
          capabilities['websiteOrigin'] !=
              widget.repository.client.configuration.baseUri.origin) {
        setState(
          () => error =
              'Website payment handoff is not enabled for this service. The owner must approve the payment policy, canonical HTTPS origin and provider configuration.',
        );
        return;
      }
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e));
      return;
    }

    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: const Text('Continue on the HOMEZONE website?'),
        content: const Text(
          'Your browser may require a separate sign-in to the same account. No mobile session credentials are transferred. Website payment availability depends on server configuration. Return here and refresh for confirmed status.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Open website'),
          ),
        ],
      ),
    );
    if (yes != true || !current) return;
    final url = widget.repository.client.configuration.baseUri.resolve(path);
    if (url.scheme != 'https') {
      setState(
        () => error =
            'Website payment handoff requires the approved HTTPS service origin.',
      );
      return;
    }
    try {
      final opened = await const MethodChannel('homezone/account-browser')
          .invokeMethod<bool>('open', {
            'url': url.toString(),
            'origin': url.origin,
          });
      if (opened != true && current)
        setState(
          () => error =
              'No supported browser is available. Use your configured HOMEZONE website and refresh afterward.',
        );
    } catch (_) {
      if (current)
        setState(
          () => error =
              'Browser handoff is unavailable on this platform. Use the configured HOMEZONE website.',
        );
    }
  }

  Future<void> assignLead() async {
    if (!current || busy) return;
    try {
      final member = await Navigator.push<JsonObject>(
        context,
        MaterialPageRoute(
          builder: (_) => WorkspaceRecordPicker(
            repository: widget.repository,
            title: 'Assign to team member',
            empty:
                'An active linked team member is required. Account linking awaits the approved invitation workflow.',
            read: (cursor) =>
                widget.repository.workspacePage('team', after: cursor),
            eligible: (row) => row['active'] == true && row['linked'] == true,
            label: (row) => textValue(row['name'], 'Team member'),
          ),
        ),
      );
      if (member != null && current)
        await action('Assign lead', '/api/pro/leads/$id/assignments', {
          'assigneeId': recordId(member),
        }, method: 'POST');
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e));
    }
  }

  Future<void> uploadPhoto() async {
    if (!current || busy) return;
    setState(() => busy = true);
    try {
      const channel = MethodChannel('homezone/media-picker');
      final picked = await channel.invokeMapMethod<String, dynamic>('image');
      if (picked == null || !current) return;
      await widget.repository.call(
        'POST',
        '/api/mobile/upload',
        body: {...picked, 'propertyId': id},
      );
      if (current) Navigator.pop(context);
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e, mutation: true));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }
}

class WorkspaceForm extends StatefulWidget {
  const WorkspaceForm({
    super.key,
    required this.repository,
    required this.title,
    required this.path,
    required this.fields,
    this.method = 'POST',
    this.fixed = const {},
    this.initial = const {},
  });
  final MarketplaceRepository repository;
  final String title, path, method;
  final List<FieldSpec> fields;
  final JsonObject fixed, initial;
  @override
  State<WorkspaceForm> createState() => _WorkspaceFormState();
}

class _WorkspaceFormState extends State<WorkspaceForm> {
  final key = GlobalKey<FormState>();
  final controls = <String, TextEditingController>{};
  late final String? owner = widget.repository.session.identity?.id;
  late final int ownerGeneration = widget.repository.coordinator.generation;
  bool busy = false;
  String? error;
  bool get current =>
      mounted &&
      owner != null &&
      widget.repository.session.identity?.id == owner &&
      ownerGeneration == widget.repository.coordinator.generation;
  @override
  void initState() {
    super.initState();
    for (final f in widget.fields) {
      controls[f.key] = TextEditingController(
        text: widget.initial[f.key]?.toString() ?? '',
      );
    }
  }

  @override
  void dispose() {
    for (final c in controls.values) c.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!current || busy || !key.currentState!.validate()) return;
    final payload = <String, dynamic>{...widget.fixed};
    for (final field in widget.fields) {
      final value = controls[field.key]!.text.trim();
      if (value.isEmpty) continue;
      payload[field.key] = field.number
          ? num.parse(value)
          : field.date
          ? DateTime.parse(value).toUtc().toIso8601String()
          : value;
    }
    final generation = widget.repository.coordinator.generation;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.repository.call(
        widget.method,
        widget.path,
        body: payload,
      );
      if (widget.path == '/api/properties' && widget.method == 'POST') {
        await widget.repository.session.revalidateSession();
      }
      if (data.isEmpty ||
          data['ok'] == false ||
          (data['provider'] is Map && (data['provider'] as Map)['count'] == 0))
        throw const FormatException();
      if (current && generation == widget.repository.coordinator.generation) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Server confirmed the change.')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (current) setState(() => error = marketplaceError(e, mutation: true));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> chooseTime(FieldSpec field) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 366)),
      initialDate: now,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (time != null && mounted)
      setState(
        () => controls[field.key]!.text = DateTime(
          date.year,
          date.month,
          date.day,
          time.hour,
          time.minute,
        ).toUtc().toIso8601String(),
      );
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.repository.session,
    builder: (context, _) => Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: !current
          ? const Center(child: Text('Sign in again before making changes.'))
          : Form(
              key: key,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  for (final field in widget.fields)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: field.options != null
                          ? DropdownButtonFormField<String>(
                              isExpanded: true,
                              initialValue:
                                  field.options!.contains(
                                    controls[field.key]!.text,
                                  )
                                  ? controls[field.key]!.text
                                  : null,
                              decoration: InputDecoration(
                                labelText: field.label,
                              ),
                              items: [
                                for (final value in field.options!)
                                  DropdownMenuItem(
                                    value: value,
                                    child: Text(value),
                                  ),
                              ],
                              onChanged: busy
                                  ? null
                                  : (v) => controls[field.key]!.text = v ?? '',
                              validator: (v) => field.required && v == null
                                  ? 'Choose an option'
                                  : null,
                            )
                          : TextFormField(
                              controller: controls[field.key],
                              enabled: !busy,
                              readOnly: field.date,
                              maxLength: field.lines > 1 ? 2000 : 240,
                              maxLines: field.lines,
                              keyboardType: field.number
                                  ? TextInputType.numberWithOptions(
                                      decimal: true,
                                      signed: (field.minimum ?? 0) < 0,
                                    )
                                  : null,
                              onTap: field.date
                                  ? () => chooseTime(field)
                                  : null,
                              decoration: InputDecoration(
                                labelText: field.label,
                                suffixIcon: field.date
                                    ? const Icon(Icons.calendar_today)
                                    : null,
                              ),
                              validator: (v) {
                                final value = v?.trim() ?? '';
                                if (value.isEmpty)
                                  return field.required
                                      ? 'This field is required'
                                      : null;
                                if (field.number &&
                                    (num.tryParse(value) == null ||
                                        !num.parse(value).isFinite ||
                                        num.parse(value) <
                                            (field.minimum ?? 0) ||
                                        (field.maximum != null &&
                                            num.parse(value) >
                                                field.maximum!) ||
                                        (field.integer &&
                                            num.parse(value) !=
                                                num.parse(value).round())))
                                  return field.integer
                                      ? 'Enter a whole number within the allowed range'
                                      : 'Enter a number within the allowed range';
                                if (field.date &&
                                    DateTime.tryParse(value) == null)
                                  return 'Choose a date and time';
                                if (field.key == 'email' &&
                                    !RegExp(
                                      r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                                    ).hasMatch(value))
                                  return 'Enter a valid email';
                                if (field.key.toLowerCase().endsWith('url') &&
                                    Uri.tryParse(value)?.scheme != 'https')
                                  return 'Use an approved HTTPS URL';
                                return null;
                              },
                            ),
                    ),
                  if (error != null)
                    Text(
                      error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  FilledButton(
                    onPressed: busy ? null : submit,
                    child: Text(busy ? 'Saving…' : 'Save'),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Changes require server confirmation. After a timeout, refresh before trying again; the change may already have been processed.',
                  ),
                ],
              ),
            ),
    ),
  );
}

class WorkspaceSummary extends StatefulWidget {
  const WorkspaceSummary({super.key, required this.repository, this.project});
  final MarketplaceRepository repository;
  final String? project;
  @override
  State<WorkspaceSummary> createState() => _WorkspaceSummaryState();
}

class _WorkspaceSummaryState extends State<WorkspaceSummary> {
  late final String? owner = widget.repository.session.identity?.id;
  late final int ownerGeneration = widget.repository.coordinator.generation;
  bool get current =>
      mounted &&
      owner != null &&
      widget.repository.session.identity?.id == owner &&
      widget.repository.coordinator.generation == ownerGeneration;
  late Future<JsonObject> result = read();
  Future<JsonObject> read() => widget.repository.call(
    'GET',
    '/api/mobile/summary',
    query: widget.project == null ? null : {'project': widget.project!},
  );
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.repository.session,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: Text(
          widget.project == null ? 'Account summary' : 'Inventory report',
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: current ? () => setState(() => result = read()) : null,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: !current
          ? const Center(child: Text('Sign in again to view your account.'))
          : FutureBuilder<JsonObject>(
              future: result,
              builder: (context, snapshot) {
                if (snapshot.hasError)
                  return Center(child: Text(marketplaceError(snapshot.error!)));
                if (!snapshot.hasData)
                  return const Center(child: CircularProgressIndicator());
                final data = snapshot.data!;
                if (data['source'] != 'database' ||
                    data['metrics'] is! JsonObject)
                  return const Center(child: Text('Summary unavailable.'));
                return ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    const Text(
                      'Current account totals from the service. Refresh to load changes.',
                    ),
                    for (final e in (data['metrics'] as JsonObject).entries)
                      if (e.value is num)
                        Card(
                          child: ListTile(
                            title: Text(
                              e.key.toLowerCase().replaceAll('_', ' '),
                            ),
                            trailing: Text(
                              '${e.value}',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                        ),
                  ],
                );
              },
            ),
    ),
  );
}

const _recordLabels = <String, String>{
  'note': 'Note',
  'validUntil': 'Quote valid until',
  'title': 'Title',
  'name': 'Name',
  'businessName': 'Business',
  'category': 'Category',
  'serviceType': 'Service',
  'description': 'Description',
  'status': 'Status',
  'verificationStatus': 'Verification',
  'paymentStatus': 'Payment',
  'city': 'City',
  'locality': 'Locality',
  'property': 'Property',
  'unit': 'Unit',
  'request': 'Request',
  'unitNumber': 'Unit number',
  'unitType': 'Unit type',
  'currency': 'Currency',
  'price': 'Price',
  'amount': 'Amount',
  'amountLabel': 'Paid / requested amount',
  'kind': 'Request type',
  'product': 'Product',
  'paidAt': 'Paid on',
  'areaValue': 'Area',
  'bedrooms': 'Bedrooms',
  'bathrooms': 'Bathrooms',
  'role': 'Team role',
  'email': 'Email',
  'phone': 'Phone',
  'message': 'Message',
  'notes': 'Notes',
  'stage': 'Stage',
  'priority': 'Priority',
  'nextAction': 'Next action',
  'followUpAt': 'Follow-up',
  'dueAt': 'Due',
  'completedAt': 'Completed',
  'scheduledAt': 'Appointment',
  'constructionStatus': 'Construction stage',
  'unitsCount': 'Units',
  'availableUnits': 'Available units',
  'budget': 'Budget',
  'channel': 'Channel',
  'dealValue': 'Deal value',
  'commissionAmount': 'Commission',
  'bookingAmount': 'Reservation amount',
  'saleValue': 'Sale value',
  'priceLabel': 'Pricing',
  'availability': 'Availability',
  'active': 'Active',
  'verified': 'Verified',
  'suspended': 'Suspended',
  'createdAt': 'Created',
  'viewedAt': 'Viewed',
  'readAt': 'Read',
};
String displayRecordValue(Object? value) {
  if (value == null || value == '') return 'Not provided';
  if (value is Map)
    return [
      for (final key in [
        'title',
        'name',
        'businessName',
        'unitNumber',
        'category',
        'city',
      ])
        if (value[key] != null) value[key],
    ].join(' | ');
  return '$value';
}
