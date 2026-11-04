import 'dart:convert';

import 'workspace_record_picker.dart';
import 'listing_photographs_screen.dart';
import 'listing_photo_picker.dart';
import 'owner_property_photos.dart';
import '../documents/private_documents_screen.dart';
import '../../core/api/api_client.dart';
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
    this.stringList = false,
    this.maxLength,
  });
  final String key, label;
  final bool required, number, date;
  final int lines;
  final List<String>? options;
  final num? minimum, maximum;
  final bool integer;
  final bool stringList;
  final int? maxLength;
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
  FieldSpec(
    'description',
    'Description',
    required: true,
    lines: 4,
    maxLength: 3000,
  ),
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
  FieldSpec(
    'amenities',
    'Amenities — one per line',
    lines: 5,
    stringList: true,
    maxLength: 12100,
  ),
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
class WorkspaceScreen extends StatefulWidget {
  const WorkspaceScreen({super.key, required this.repository});
  final MarketplaceRepository repository;
  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  static const _ownerPrimaryModules = {'properties', 'ownerEnquiries'};
  MarketplaceRepository get repository => widget.repository;
  String? _ownerScope;
  int _ownerTab = 0;

  void _selectOwnerTab(String scope, int index) => setState(() {
    _ownerScope = scope;
    _ownerTab = index;
  });

  Widget _ownerNavigation(BuildContext context, String scope, int tab) {
    final colors = Theme.of(context).colorScheme;
    final largeText = MediaQuery.textScalerOf(context).scale(1) > 1.4;
    return NavigationBarTheme(
      data: NavigationBarThemeData(
        backgroundColor: colors.surfaceContainerLowest,
        indicatorColor: colors.primary.withValues(alpha: .1),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 11,
            height: 1.2,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected)
                ? colors.primary
                : colors.onSurfaceVariant,
          ),
        ),
      ),
      child: NavigationBar(
        key: const ValueKey('owner-bottom-navigation'),
        height: largeText ? 92 : 76,
        labelBehavior: largeText
            ? NavigationDestinationLabelBehavior.onlyShowSelected
            : NavigationDestinationLabelBehavior.alwaysShow,
        selectedIndex: tab,
        onDestinationSelected: (index) => _selectOwnerTab(scope, index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.home_work_outlined),
            selectedIcon: Icon(Icons.home_work_rounded),
            label: 'Listings',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble_rounded),
            label: 'Enquiries',
          ),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
        ],
      ),
    );
  }

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
      final isOwner = identity.role == 'OWNER';
      final ownerScope = '$generationAtBuild:${identity.id}';
      final ownerTab = _ownerScope == ownerScope ? _ownerTab : 0;
      final ownerMore = isOwner && ownerTab == 3;
      final showAccountActions = !isOwner || ownerMore;
      final navigation = isOwner
          ? _ownerNavigation(context, ownerScope, ownerTab)
          : null;
      if (isOwner && (ownerTab == 1 || ownerTab == 2)) {
        final module = ownerTab == 1 ? 'properties' : 'ownerEnquiries';
        return Scaffold(
          body: WorkspaceRecords(
            key: ValueKey('$ownerScope:$module'),
            repository: repository,
            module: module,
            title: ownerTab == 1 ? 'My listings' : 'Listing enquiries',
          ),
          bottomNavigationBar: navigation,
        );
      }
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
        appBar: AppBar(
          title: Text(
            isOwner
                ? ownerMore
                      ? 'More'
                      : 'HOMEZONE'
                : 'My workspace',
          ),
        ),
        body: ListView(
          key: isOwner ? PageStorageKey('owner-$ownerScope-$ownerTab') : null,
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Account role: ${identity.role}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (!ownerMore)
              OutlinedButton.icon(
                onPressed: () => Navigator.pushNamed(context, '/discovery'),
                icon: const Icon(Icons.home_work_outlined),
                label: const Text('Browse properties'),
              ),
            if (showAccountActions)
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
            if (!ownerMore)
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
            if (showAccountActions)
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
                    if (result['request'] is! Map)
                      throw const FormatException();
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
              if (!isOwner ||
                  (ownerMore
                      ? !_ownerPrimaryModules.contains(entry.key)
                      : _ownerPrimaryModules.contains(entry.key)))
                Card(
                  child: ListTile(
                    title: Text(entry.value),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      if (isOwner && entry.key == 'properties') {
                        _selectOwnerTab(ownerScope, 1);
                      } else if (isOwner && entry.key == 'ownerEnquiries') {
                        _selectOwnerTab(ownerScope, 2);
                      } else {
                        Navigator.push<void>(
                          context,
                          MaterialPageRoute(
                            builder: (_) => WorkspaceRecords(
                              repository: repository,
                              module: entry.key,
                              title: entry.value,
                            ),
                          ),
                        );
                      }
                    },
                  ),
                ),
          ],
        ),
        bottomNavigationBar: navigation,
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
        loading = false;
        more = false;
        cursor = null;
        page = 0;
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
    // A creation response can be lost after the listing was saved. Refresh even
    // when the user leaves that form with the normal Back button.
    if ((changed == true || (path == '/api/properties' && method == 'POST')) &&
        current) {
      await load();
    }
  }

  Future<void> create() async {
    final parent = widget.parent;
    switch (widget.module) {
      case 'properties':
        await edit(
          'Create listing',
          '/api/properties',
          _propertyFields,
          fixed: {
            'status': widget.repository.session.identity?.role == 'OWNER'
                ? 'PUBLISHED'
                : 'DRAFT',
          },
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
          const FieldSpec(
            'floor',
            'Floor',
            number: true,
            integer: true,
            minimum: -10,
            maximum: 200,
          ),
          const FieldSpec(
            'bedrooms',
            'Bedrooms',
            number: true,
            integer: true,
            maximum: 20,
          ),
          const FieldSpec(
            'bathrooms',
            'Bathrooms',
            number: true,
            integer: true,
            maximum: 20,
          ),
        ]);
        break;
      case 'towers':
        await edit('Add tower', '/api/builder/projects/$parent/towers', [
          _name,
          const FieldSpec(
            'floors',
            'Floors',
            number: true,
            integer: true,
            maximum: 200,
          ),
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
                      recordSummary(
                        item,
                        property: widget.module == 'properties',
                      ),
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

String recordSummary(JsonObject item, {bool property = false}) =>
    [
          'status',
          'verificationStatus',
          'city',
          'price',
          'amount',
          'message',
          'scheduledAt',
          'dueAt',
          'stage',
        ]
        .where((key) => item[key] != null)
        .map(
          (key) =>
              property &&
                  key == 'verificationStatus' &&
                  item['status'] == 'PUBLISHED' &&
                  const {'PENDING', 'UNDER_REVIEW'}.contains(item[key])
              ? propertyVerificationValue(item)
              : '${item[key]}',
        )
        .join(' · ');

String propertyVerificationValue(JsonObject item) =>
    item['status'] == 'PUBLISHED' &&
        const {'PENDING', 'UNDER_REVIEW'}.contains(item['verificationStatus'])
    ? 'Not independently verified'
    : displayRecordValue(item['verificationStatus']);

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
  bool get _canPublishListing =>
      widget.repository.session.identity?.role == 'OWNER'
      ? const {
              'DRAFT',
              'PENDING_REVIEW',
              'PUBLISHED',
            }.contains(widget.item['status']) &&
            !const {
              'REJECTED',
              'NEEDS_CHANGES',
              'EXPIRED',
            }.contains(widget.item['verificationStatus'])
      : widget.item['verificationStatus'] == 'VERIFIED';
  Future<void> form(
    String title,
    String path,
    List<FieldSpec> fields, {
    String method = 'POST',
    JsonObject fixed = const {},
    JsonObject? initial,
  }) async {
    if (busy || !current) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
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
    } catch (failure) {
      if (current) setState(() => error = marketplaceError(failure));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> action(
    String label,
    String path,
    JsonObject body, {
    String method = 'PATCH',
  }) async {
    if (busy || !current) return;
    final publishing =
        widget.module == 'properties' &&
        method == 'PATCH' &&
        path == '/api/properties/$id' &&
        body['status'] == 'PUBLISHED';
    // Reserve before awaiting confirmation so repeated taps cannot queue changes.
    setState(() {
      busy = true;
      error = null;
    });
    var dispatched = false;
    try {
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(label),
          content: Text(
            publishing
                ? 'This makes your listing visible to Buyers. Publish now?'
                : 'This changes your HOMEZONE account record. Continue?',
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
      dispatched = true;
      final response = await widget.repository.call(method, path, body: body);
      if (response.isEmpty || response['ok'] == false) {
        throw const FormatException();
      }
      if (publishing && object(response['property'])['status'] != 'PUBLISHED') {
        throw const FormatException('Publication confirmation unavailable');
      }
      if (current) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              publishing
                  ? 'Listing published. Buyers can now see it.'
                  : 'Server confirmed the change.',
            ),
          ),
        );
        Navigator.pop(context);
      }
    } catch (failure) {
      if (current) {
        final needsPhotos =
            publishing &&
            failure is ApiException &&
            failure.failure == ApiFailure.validation;
        final message = needsPhotos
            ? 'Publishing requires at least 4 different property photos. Add photos, then refresh this listing before publishing again.'
            : marketplaceError(failure, mutation: dispatched);
        setState(() => error = message);
        // Publish controls can be below the fold. Keep the minimum-photo
        // feedback visible without requiring a scroll back to the error text.
        if (needsPhotos) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }
      }
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
                if (widget.module == 'properties' &&
                    const [
                      'OWNER',
                      'BROKER',
                    ].contains(widget.repository.session.identity?.role))
                  OwnerPropertyPhotos(
                    key: ValueKey('$ownerGeneration:$id'),
                    repository: widget.repository,
                    id: id,
                  ),
                for (final label in _recordLabels.entries)
                  if (widget.item.containsKey(label.key))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        '${label.value}: ${widget.module == 'properties' && label.key == 'verificationStatus' ? propertyVerificationValue(widget.item) : displayRecordValue(widget.item[label.key])}',
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
                    if (widget.repository.session.identity?.role != 'OWNER')
                      'PENDING_REVIEW',
                    'ARCHIVED',
                    if (_canPublishListing) 'PUBLISHED',
                  ])
                    button(
                      status == 'PUBLISHED' &&
                              widget.repository.session.identity?.role ==
                                  'OWNER'
                          ? 'Publish listing'
                          : status.replaceAll('_', ' '),
                      () => action(
                        status == 'PUBLISHED'
                            ? 'Publish listing'
                            : 'Change listing status',
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
                          maximum: 100,
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
                              const FieldSpec(
                                'floors',
                                'Floors',
                                number: true,
                                integer: true,
                                maximum: 200,
                              ),
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
  List<SelectedListingPhoto> _photos = const [];
  bool _pickingPhoto = false,
      _listingCreateStarted = false,
      _draftConfirmed = false,
      _publicationStarted = false,
      _publicationConfirmed = false;
  String? _createdListingId, _saveProgress;
  bool _confirmingStoredPhotos = false;
  int _confirmedPhotos = 0, _plannedPhotos = 0;
  bool get _isListingCreate =>
      widget.method == 'POST' && widget.path == '/api/properties';
  bool get _publishesListing =>
      _isListingCreate &&
      widget.fixed['status'] == 'PUBLISHED' &&
      widget.repository.session.identity?.role == 'OWNER';
  bool get _supportsPhotos =>
      _isListingCreate &&
      const {
        'OWNER',
        'BROKER',
      }.contains(widget.repository.session.identity?.role);
  bool get current =>
      mounted &&
      owner != null &&
      widget.repository.session.identity?.id == owner &&
      ownerGeneration == widget.repository.coordinator.generation;
  @override
  void initState() {
    super.initState();
    widget.repository.session.addListener(_sessionChanged);
    for (final f in widget.fields) {
      controls[f.key] = TextEditingController(
        text: f.stringList && widget.initial[f.key] is List
            ? (widget.initial[f.key] as List).whereType<String>().join('\n')
            : widget.initial[f.key]?.toString() ?? '',
      );
    }
  }

  void _sessionChanged() {
    if (mounted && !current && _photos.isNotEmpty) {
      setState(() => _photos = const []);
    }
  }

  @override
  void dispose() {
    widget.repository.session.removeListener(_sessionChanged);
    _photos = const [];
    for (final c in controls.values) c.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!current || busy || _pickingPhoto || _listingCreateStarted) {
      return;
    }
    final validation = _firstFieldValidationError;
    final mountedFieldsValid = key.currentState!.validate();
    if (validation != null || !mountedFieldsValid) {
      if (validation != null) {
        setState(() => error = validation);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(validation)));
      }
      return;
    }
    if (_publishesListing &&
        _photos.length < ListingPhotoPicker.minimumPublicationPhotos) {
      setState(
        () => error =
            'Add at least 4 different property photos before publishing.',
      );
      return;
    }
    final payload = <String, dynamic>{...widget.fixed};
    for (final field in widget.fields) {
      final value = controls[field.key]!.text.trim();
      if (field.stringList) {
        if (widget.method == 'PATCH' &&
            !widget.initial.containsKey(field.key) &&
            value.isEmpty)
          continue;
        payload[field.key] = value
            .split(RegExp(r'\r?\n'))
            .map((v) => v.trim())
            .where((v) => v.isNotEmpty)
            .toSet()
            .toList();
        continue;
      }
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
      if (_isListingCreate) {
        await _createListing(payload, generation);
        return;
      }
      final data = await widget.repository.call(
        widget.method,
        widget.path,
        body: payload,
      );
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
      if (current) {
        setState(() {
          _saveProgress = null;
          if (_isListingCreate && _createdListingId != null) {
            if (_publishesListing && !_publicationConfirmed) {
              error = _draftConfirmed && !_publicationStarted
                  ? 'Draft saved. It has not been published. '
                        '${_confirmingStoredPhotos ? 'The stored property photos could not be confirmed.' : _photoFailureMessage(e)} '
                        '($_confirmedPhotos of $_plannedPhotos photos confirmed). '
                        'Return to Listings and refresh this draft before adding photos and publishing.'
                  : 'Listing saved, but publication could not be confirmed. '
                        'Return to Listings and refresh before making any changes.';
            } else {
              error =
                  '${_publicationConfirmed ? 'Listing published' : 'Listing created'}, but photo upload could not be confirmed '
                  '($_confirmedPhotos of $_plannedPhotos photos confirmed). '
                  'Return to Listings and refresh this listing before uploading again.';
            }
          } else if (_isListingCreate && !_listingCreateStarted) {
            error =
                '${e is PropertyPhotoException ? _photoFailureMessage(e) : 'Photo upload availability could not be checked. Check your connection and try again.'} '
                'Your details and selected photos are kept on this screen. No listing was created.';
          } else if (_isListingCreate && !_definitelyRejected(e)) {
            error =
                'Saving the listing could not be confirmed. It may already exist. '
                'Return to Listings and refresh before trying to create it again.';
          } else {
            _listingCreateStarted = false;
            error = marketplaceError(e, mutation: !_isListingCreate);
          }
        });
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  bool _definitelyRejected(Object error) =>
      error is ApiException &&
      const {
        ApiFailure.validation,
        ApiFailure.forbidden,
        ApiFailure.unauthorized,
        ApiFailure.rateLimited,
        ApiFailure.notFound,
      }.contains(error.failure);

  String _photoFailureMessage(Object failure) {
    if (failure is PropertyPhotoException) {
      return switch (failure.reason) {
        PropertyPhotoFailure.storageUnavailable =>
          'Photo uploads are unavailable. Please contact HomeZone support.',
        PropertyPhotoFailure.readinessUnavailable =>
          'Photo upload availability could not be confirmed. Please try again later.',
        PropertyPhotoFailure.uploadFailed =>
          'The photo upload service could not complete the upload.',
        PropertyPhotoFailure.confirmationUnavailable =>
          'The photo upload response could not be confirmed.',
      };
    }
    if (failure is ApiException) {
      return switch (failure.failure) {
        ApiFailure.timeout || ApiFailure.network =>
          'The photo upload confirmation was not received. Some photos may already have reached the server.',
        ApiFailure.rateLimited =>
          'The photo upload limit was reached. Wait before uploading again.',
        ApiFailure.validation =>
          'The server could not accept this photo. Use a readable JPEG, PNG or WebP within the allowed size.',
        ApiFailure.unauthorized => 'Sign in again before uploading photos.',
        ApiFailure.forbidden =>
          'This account cannot upload photos to this listing.',
        _ => 'The server could not confirm the photo upload.',
      };
    }
    return 'The photo upload response could not be confirmed.';
  }

  Future<void> _createListing(JsonObject payload, int generation) async {
    final selected = List<SelectedListingPhoto>.of(_photos);
    final publishAfterPhotos = _publishesListing;
    if (selected.isNotEmpty) {
      setState(() => _saveProgress = 'Checking photo upload availability...');
      final capabilities = await widget.repository.call(
        'GET',
        '/api/mobile/capabilities',
      );
      if (!current || generation != widget.repository.coordinator.generation) {
        return;
      }
      final configured = capabilities['propertyPhotoUploadConfigured'];
      if (configured != true ||
          capabilities['ok'] == false ||
          capabilities['success'] == false) {
        throw PropertyPhotoException(
          configured == false
              ? PropertyPhotoFailure.storageUnavailable
              : PropertyPhotoFailure.readinessUnavailable,
        );
      }
    }
    // Creation/upload endpoints are non-idempotent. Never retry a lost response.
    _listingCreateStarted = true;
    _plannedPhotos = selected.length;
    setState(
      () => _saveProgress = publishAfterPhotos
          ? 'Saving a private draft before uploading photos...'
          : 'Saving listing...',
    );
    final data = await widget.repository.call(
      'POST',
      '/api/properties',
      body: {...payload, if (publishAfterPhotos) 'status': 'DRAFT'},
    );
    if (!current || generation != widget.repository.coordinator.generation) {
      return;
    }
    if (data['ok'] == false) throw const FormatException();
    final property = object(data['property']);
    _createdListingId = recordId(property);
    if (publishAfterPhotos) {
      if (property['status'] != 'DRAFT') {
        throw const FormatException('Private draft confirmation unavailable');
      }
      _draftConfirmed = true;
    }
    await widget.repository.session.revalidateSession();
    if (!current || generation != widget.repository.coordinator.generation) {
      return;
    }
    for (var index = 0; index < selected.length; index++) {
      if (!current || generation != widget.repository.coordinator.generation) {
        return;
      }
      setState(
        () => _saveProgress =
            'Uploading photo ${index + 1} of ${selected.length}...',
      );
      final uploaded = await widget.repository.call(
        'POST',
        '/api/mobile/upload',
        body: {
          'propertyId': _createdListingId,
          'base64': base64Encode(selected[index].bytes),
        },
      );
      if (!current || generation != widget.repository.coordinator.generation) {
        return;
      }
      if (uploaded['ok'] == false) throw const FormatException();
      final rawUrl = uploaded['url'];
      final url = rawUrl is String ? Uri.tryParse(rawUrl) : null;
      if (url == null ||
          url.scheme != 'https' ||
          url.host.isEmpty ||
          url.userInfo.isNotEmpty ||
          url.hasFragment ||
          url.port != 443) {
        throw const FormatException('Upload confirmation unavailable');
      }
      _confirmedPhotos++;
    }
    if (!current || generation != widget.repository.coordinator.generation) {
      return;
    }
    if (publishAfterPhotos) {
      _confirmingStoredPhotos = true;
      setState(() => _saveProgress = 'Confirming property photos...');
      final media = await widget.repository.call(
        'GET',
        '/api/properties/$_createdListingId/media',
      );
      if (!current || generation != widget.repository.coordinator.generation) {
        return;
      }
      final stored = object(media['property']);
      final gallery = stored['mediaUrls'];
      final cover = stored['coverImageUrl'];
      if (media['ok'] == false ||
          stored['id'] != _createdListingId ||
          gallery is! List ||
          gallery.length > 40 ||
          gallery.any((url) => url is! String || url.length > 4096) ||
          (cover != null && (cover is! String || cover.length > 4096))) {
        throw const FormatException('Photo confirmation unavailable');
      }
      final urls = <String>{
        if (cover is String && cover.isNotEmpty) cover,
        ...gallery.cast<String>().where((url) => url.isNotEmpty),
      };
      if (urls.length < ListingPhotoPicker.minimumPublicationPhotos ||
          urls.any((raw) {
            final url = Uri.tryParse(raw);
            return url == null ||
                url.scheme != 'https' ||
                url.host.isEmpty ||
                url.userInfo.isNotEmpty ||
                url.hasFragment ||
                url.port != 443;
          })) {
        throw const FormatException('At least four stored photos are required');
      }
      setState(() => _saveProgress = 'Publishing listing...');
      _publicationStarted = true;
      final published = await widget.repository.call(
        'PATCH',
        '/api/properties/$_createdListingId',
        body: const {'status': 'PUBLISHED'},
      );
      if (!current || generation != widget.repository.coordinator.generation) {
        return;
      }
      final confirmed = object(published['property']);
      if (published['ok'] == false ||
          confirmed['id'] != _createdListingId ||
          confirmed['status'] != 'PUBLISHED') {
        throw const FormatException('Publication confirmation unavailable');
      }
      _publicationConfirmed = true;
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          selected.isEmpty
              ? (_publicationConfirmed
                    ? 'Listing published. Buyers can now see it.'
                    : 'Listing created.')
              : '${_publicationConfirmed ? 'Listing published' : 'Listing created'} with ${selected.length} ${selected.length == 1 ? 'photo' : 'photos'}.',
        ),
      ),
    );
    Navigator.pop(context, true);
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

  String? _fieldValidationError(FieldSpec field, String? raw) {
    final value = raw?.trim() ?? '';
    if (field.options != null) {
      if (value.isEmpty && !field.required) return null;
      return field.options!.contains(value) ? null : 'Choose an option';
    }
    if (value.isEmpty) {
      return field.required ? 'This field is required' : null;
    }
    if (field.stringList) {
      final values = value
          .split(RegExp(r'\r?\n'))
          .map((v) => v.trim())
          .where((v) => v.isNotEmpty)
          .toSet();
      if (values.length > 100 || values.any((v) => v.length > 120)) {
        return 'Use up to 100 amenities, at most 120 characters each';
      }
    }
    if (field.number) {
      final number = num.tryParse(value);
      if (number == null ||
          !number.isFinite ||
          number < (field.minimum ?? 0) ||
          (field.maximum != null && number > field.maximum!) ||
          (field.integer && number != number.round())) {
        return field.integer
            ? 'Enter a whole number within the allowed range'
            : 'Enter a number within the allowed range';
      }
    }
    if (field.date && DateTime.tryParse(value) == null) {
      return 'Choose a date and time';
    }
    if (field.key == 'email' &&
        !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)) {
      return 'Enter a valid email';
    }
    if (field.key.toLowerCase().endsWith('url') &&
        Uri.tryParse(value)?.scheme != 'https') {
      return 'Use an approved HTTPS URL';
    }
    return null;
  }

  // ListView may dispose offscreen FormFields. Validate the retained values as
  // well as mounted widgets so scrolling never bypasses required fields.
  String? get _firstFieldValidationError {
    for (final field in widget.fields) {
      final validation = _fieldValidationError(
        field,
        controls[field.key]!.text,
      );
      if (validation != null) return '${field.label}: $validation';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.repository.session,
    builder: (context, _) => PopScope(
      canPop: !_isListingCreate || !busy,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && busy) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please wait for the current save to finish.'),
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: !current
            ? Center(
                child: Text(
                  _listingCreateStarted
                      ? 'Sign in again, then refresh Listings before creating another listing. The save or photo uploads may have completed.'
                      : 'Sign in again before making changes.',
                ),
              )
            : Form(
                key: key,
                child: ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    if (_publishesListing)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 16),
                        child: Text(
                          'Add at least 4 different property photos. Your listing becomes visible to Buyers only after the photos are confirmed and publication succeeds.',
                        ),
                      ),
                    if (_supportsPhotos)
                      ListingPhotoPicker(
                        photos: _photos,
                        minimumPhotos: _publishesListing
                            ? ListingPhotoPicker.minimumPublicationPhotos
                            : 0,
                        enabled: !busy && !_listingCreateStarted,
                        isCurrent: () => current,
                        onChanged: (photos) => setState(() => _photos = photos),
                        onPickingChanged: (picking) =>
                            setState(() => _pickingPhoto = picking),
                      ),
                    for (final field in widget.fields)
                      Padding(
                        key: ValueKey(field.key),
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
                                onChanged: busy || _listingCreateStarted
                                    ? null
                                    : (v) => setState(
                                        () =>
                                            controls[field.key]!.text = v ?? '',
                                      ),
                                validator: (v) =>
                                    _fieldValidationError(field, v),
                              )
                            : TextFormField(
                                controller: controls[field.key],
                                enabled: !busy && !_listingCreateStarted,
                                readOnly: field.date,
                                maxLength:
                                    field.maxLength ??
                                    (field.lines > 1 ? 2000 : 240),
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
                                validator: (v) =>
                                    _fieldValidationError(field, v),
                              ),
                      ),
                    if (error != null)
                      Text(
                        error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    if (busy && _isListingCreate && _saveProgress != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Semantics(
                          liveRegion: true,
                          child: Text(_saveProgress!),
                        ),
                      ),
                    FilledButton(
                      onPressed: busy || _pickingPhoto || _listingCreateStarted
                          ? null
                          : submit,
                      child: Text(
                        _publishesListing
                            ? (busy ? 'Publishing…' : 'Publish listing')
                            : (busy ? 'Saving…' : 'Save'),
                      ),
                    ),
                    if (_listingCreateStarted && !busy)
                      TextButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Back to listings'),
                      ),
                    const SizedBox(height: 12),
                    const Text(
                      'Changes require server confirmation. After a timeout, refresh before trying again; the change may already have been processed.',
                    ),
                  ],
                ),
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
