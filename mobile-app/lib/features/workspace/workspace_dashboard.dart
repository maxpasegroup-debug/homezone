import 'package:flutter/material.dart';

import '../../theme/design_tokens.dart';
import '../marketplace/marketplace_repository.dart';
import '../marketplace/marketplace_screen.dart' show ListingImage;

class WorkspaceDestination {
  const WorkspaceDestination(this.label, this.icon, {this.module, this.title});
  final String label;
  final IconData icon;
  final String? module, title;
}

List<WorkspaceDestination> workspaceDestinations(String role) => switch (role) {
  'OWNER' => const [
    WorkspaceDestination('Home', Icons.home_outlined),
    WorkspaceDestination(
      'Listings',
      Icons.home_work_outlined,
      module: 'properties',
      title: 'My listings',
    ),
    WorkspaceDestination(
      'Enquiries',
      Icons.forum_outlined,
      module: 'ownerEnquiries',
      title: 'Listing enquiries',
    ),
    WorkspaceDestination('More', Icons.more_horiz),
  ],
  'BROKER' => const [
    WorkspaceDestination('Home', Icons.home_outlined),
    WorkspaceDestination(
      'Leads',
      Icons.people_outline,
      module: 'crm',
      title: 'Leads & pipeline',
    ),
    WorkspaceDestination(
      'Listings',
      Icons.home_work_outlined,
      module: 'properties',
      title: 'My listings',
    ),
    WorkspaceDestination(
      'Follow-ups',
      Icons.event_note_outlined,
      module: 'calendar',
      title: 'Follow-ups',
    ),
    WorkspaceDestination('More', Icons.more_horiz),
  ],
  'BUILDER' => const [
    WorkspaceDestination('Home', Icons.home_outlined),
    WorkspaceDestination(
      'Projects',
      Icons.apartment_outlined,
      module: 'projects',
      title: 'Projects & inventory',
    ),
    WorkspaceDestination('More', Icons.more_horiz),
  ],
  'SERVICE_PROVIDER' => const [
    WorkspaceDestination('Home', Icons.home_outlined),
    WorkspaceDestination(
      'Requests',
      Icons.assignment_outlined,
      module: 'providerRequests',
      title: 'Incoming service requests',
    ),
    WorkspaceDestination(
      'Bookings',
      Icons.event_available_outlined,
      module: 'serviceBookings',
      title: 'Service bookings',
    ),
    WorkspaceDestination(
      'Profile',
      Icons.storefront_outlined,
      module: 'providerProfile',
      title: 'Provider profile',
    ),
    WorkspaceDestination('More', Icons.more_horiz),
  ],
  _ => const [
    WorkspaceDestination('Home', Icons.home_outlined),
    WorkspaceDestination(
      'Services',
      Icons.handyman_outlined,
      module: 'requests',
      title: 'My service requests',
    ),
    WorkspaceDestination('More', Icons.more_horiz),
  ],
};

String workspaceRoleName(String role) => switch (role) {
  'OWNER' => 'Property owner',
  'BROKER' => 'Broker',
  'BUILDER' => 'Builder',
  'SERVICE_PROVIDER' => 'Service provider',
  _ => 'My workspace',
};

typedef OpenWorkspaceModule = void Function(String module, String title);
typedef OpenWorkspaceRecord = void Function(String module, JsonObject record);

class WorkspaceHome extends StatefulWidget {
  const WorkspaceHome({
    super.key,
    required this.repository,
    required this.role,
    required this.onOpenModule,
    required this.onPrimaryAction,
    required this.onBrowse,
    this.onOpenRecord,
  });

  final MarketplaceRepository repository;
  final String role;
  final OpenWorkspaceModule onOpenModule;
  final OpenWorkspaceRecord? onOpenRecord;
  final VoidCallback onPrimaryAction, onBrowse;

  @override
  State<WorkspaceHome> createState() => _WorkspaceHomeState();
}

class _WorkspaceHomeState extends State<WorkspaceHome> {
  late final MarketplaceRepository _repository = widget.repository;
  late final String? _owner = _repository.session.identity?.id;
  late final int _generation = _repository.coordinator.generation;
  Map<String, num>? _totals;
  String? _error;
  bool _loading = true;
  int _request = 0;
  List<JsonObject>? _records;
  String? _recordsError;
  bool _recordsLoading = true;
  int _recordsRequest = 0;

  bool get _current =>
      mounted &&
      _owner != null &&
      _repository.session.identity?.id == _owner &&
      _repository.session.identity?.role == widget.role &&
      _repository.coordinator.generation == _generation;

  @override
  void initState() {
    super.initState();
    _repository.session.addListener(_sessionChanged);
    _load();
    _loadRecords();
  }

  void _sessionChanged() {
    if (!_current && mounted) {
      _request++;
      _recordsRequest++;
      setState(() {
        _totals = null;
        _error = null;
        _loading = false;
        _records = null;
        _recordsError = null;
        _recordsLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _request++;
    _recordsRequest++;
    _repository.session.removeListener(_sessionChanged);
    super.dispose();
  }

  Future<void> _load() async {
    if (!_current) return;
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _totals = null;
    });
    try {
      final data = await _repository.call('GET', '/api/mobile/summary');
      if (!_current || request != _request) return;
      if (data['source'] != 'database' || data['metrics'] is! JsonObject) {
        throw const FormatException('Summary unavailable');
      }
      final metrics = data['metrics'] as JsonObject;
      final totals = <String, num>{};
      for (final metric in _metrics(widget.role)) {
        final value = metrics[metric.key];
        if (value is! num ||
            !value.isFinite ||
            value < 0 ||
            value != value.round()) {
          throw const FormatException('Summary unavailable');
        }
        totals[metric.key] = value;
      }
      setState(() => _totals = totals);
    } catch (error) {
      if (_current && request == _request) {
        setState(() => _error = marketplaceError(error));
      }
    } finally {
      if (_current && request == _request) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadRecords() async {
    if (!_current) return;
    final request = ++_recordsRequest;
    setState(() {
      _recordsLoading = true;
      _recordsError = null;
      _records = null;
    });
    try {
      final data = await _repository.workspacePage(
        _preview(widget.role).module,
      );
      if (!_current || request != _recordsRequest) return;
      final rows = objects(data['items']);
      for (final row in rows) {
        final id = row['id'];
        if (id is! String || !RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(id)) {
          throw const FormatException('Records unavailable');
        }
      }
      setState(() => _records = rows.take(3).toList(growable: false));
    } catch (error) {
      if (_current && request == _recordsRequest) {
        setState(() => _recordsError = marketplaceError(error));
      }
    } finally {
      if (_current && request == _recordsRequest) {
        setState(() => _recordsLoading = false);
      }
    }
  }

  Future<void> _refresh() async {
    await Future.wait([_load(), _loadRecords()]);
  }

  Widget _recordPreview(BuildContext context) {
    final preview = _preview(widget.role);
    final theme = Theme.of(context);
    return Column(
      key: const ValueKey('workspace-record-preview'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(preview.heading, style: theme.textTheme.titleLarge),
            ),
            IconButton(
              tooltip: 'Refresh records',
              onPressed: _recordsLoading ? null : _loadRecords,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        if (_recordsLoading)
          const Padding(
            padding: EdgeInsets.all(Space.lg),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_recordsError != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(Space.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Your records are unavailable.'),
                  Text(
                    _recordsError!,
                    style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  TextButton(
                    onPressed: _loadRecords,
                    child: const Text('Retry records'),
                  ),
                ],
              ),
            ),
          )
        else if (_records?.isEmpty ?? false)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(Space.md),
              child: Text(preview.empty),
            ),
          )
        else
          for (final record in _records ?? <JsonObject>[])
            _WorkspaceRecordCard(
              key: ValueKey('workspace-preview-${record['id']}'),
              module: preview.module,
              record: record,
              onTap: widget.onOpenRecord == null
                  ? null
                  : () {
                      if (_current)
                        widget.onOpenRecord!(preview.module, record);
                    },
            ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(
            onPressed: () => widget.onOpenModule(preview.module, preview.title),
            child: const Text('View all'),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_current) {
      return const Center(child: Text('Sign in again to view your workspace.'));
    }
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final (headline, description, action) = switch (widget.role) {
      'OWNER' => (
        'Your listings, in focus.',
        'Manage your properties and keep every enquiry moving.',
        'Add a property',
      ),
      'BROKER' => (
        'Keep your next deal moving.',
        'Work your leads, plan follow-ups and manage your listings.',
        'Add a lead',
      ),
      'BUILDER' => (
        'A clear view of your projects.',
        'Open a project to manage inventory, reservations and your team.',
        'Create a project',
      ),
      'SERVICE_PROVIDER' => (
        'Make room for your next job.',
        'Review requests, send quotes and manage your service bookings.',
        'View service requests',
      ),
      _ => (
        'Your next move starts here.',
        'Find a property and manage the services that help you move.',
        'Browse properties',
      ),
    };
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        key: PageStorageKey(
          'workspace-home-$_generation-$_owner-${widget.role}',
        ),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          Space.md,
          Space.sm,
          Space.md,
          Space.lg,
        ),
        children: [
          Container(
            padding: const EdgeInsets.all(Space.lg),
            decoration: BoxDecoration(
              color: colors.primaryContainer,
              borderRadius: BorderRadius.circular(AppShape.radius),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  workspaceRoleName(widget.role).toUpperCase(),
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: colors.onPrimaryContainer,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: Space.md),
                Text(
                  headline,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: colors.onPrimaryContainer,
                  ),
                ),
                const SizedBox(height: Space.sm),
                Text(
                  description,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.onPrimaryContainer,
                  ),
                ),
                const SizedBox(height: Space.lg),
                FilledButton.icon(
                  key: const ValueKey('workspace-primary-action'),
                  onPressed: widget.onPrimaryAction,
                  icon: Icon(
                    widget.role == 'SERVICE_PROVIDER'
                        ? Icons.assignment_outlined
                        : widget.role == 'USER'
                        ? Icons.search
                        : Icons.add,
                  ),
                  label: Text(action),
                ),
              ],
            ),
          ),
          const SizedBox(height: Space.lg),
          Row(
            children: [
              Expanded(
                child: Text('At a glance', style: theme.textTheme.titleLarge),
              ),
              IconButton(
                tooltip: 'Refresh overview',
                onPressed: _loading ? null : _load,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(Space.lg),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Space.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Your overview is unavailable.'),
                    Text(
                      _error!,
                      style: TextStyle(color: colors.onSurfaceVariant),
                    ),
                    TextButton(
                      onPressed: _load,
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            )
          else if (_totals != null)
            LayoutBuilder(
              builder: (context, constraints) {
                final oneColumn =
                    constraints.maxWidth < 340 ||
                    MediaQuery.textScalerOf(context).scale(1) > 1.4;
                final width = oneColumn
                    ? constraints.maxWidth
                    : (constraints.maxWidth - Space.sm) / 2;
                return Wrap(
                  spacing: Space.sm,
                  runSpacing: Space.sm,
                  children: [
                    for (final metric in _metrics(widget.role))
                      SizedBox(
                        width: width,
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(
                              AppShape.radius,
                            ),
                            onTap: () => widget.onOpenModule(
                              metric.module,
                              metric.title,
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(Space.md),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(metric.icon, color: colors.primary),
                                  const SizedBox(height: Space.sm),
                                  Text(
                                    '${_totals![metric.key]!.toInt()}',
                                    key: ValueKey(
                                      'workspace-total-${metric.key}',
                                    ),
                                    style: theme.textTheme.headlineLarge,
                                  ),
                                  Text(
                                    metric.label,
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          const SizedBox(height: Space.lg),
          _recordPreview(context),
          const SizedBox(height: Space.lg),
          Text('Your workspace', style: theme.textTheme.titleLarge),
          const SizedBox(height: Space.sm),
          for (final destination in workspaceDestinations(widget.role))
            if (destination.module != null)
              WorkspaceMenuTile(
                title: destination.title!,
                icon: destination.icon,
                onTap: () => widget.onOpenModule(
                  destination.module!,
                  destination.title!,
                ),
              ),
          if (widget.role == 'BROKER') ...[
            WorkspaceMenuTile(
              title: 'My team',
              icon: Icons.groups_outlined,
              onTap: () => widget.onOpenModule('team', 'My team'),
            ),
            WorkspaceMenuTile(
              title: 'Commissions',
              icon: Icons.receipt_long_outlined,
              onTap: () => widget.onOpenModule('commissions', 'Commissions'),
            ),
          ],
          const SizedBox(height: Space.lg),
          WorkspaceMenuTile(
            title: 'HOMEZONE Studio',
            subtitle:
                'Photography, video and marketing services for your property.',
            icon: Icons.auto_awesome_outlined,
            onTap: () => widget.onOpenModule('studio', 'HOMEZONE Studio'),
          ),
          if (widget.role != 'USER')
            TextButton.icon(
              onPressed: widget.onBrowse,
              icon: const Icon(Icons.search),
              label: const Text('Browse properties'),
            ),
        ],
      ),
    );
  }
}

class _WorkspacePreviewSpec {
  const _WorkspacePreviewSpec(
    this.module,
    this.title,
    this.heading,
    this.empty,
  );
  final String module, title, heading, empty;
}

_WorkspacePreviewSpec _preview(String role) => switch (role) {
  'OWNER' => const _WorkspacePreviewSpec(
    'properties',
    'My listings',
    'Your properties',
    'No properties yet. Add your first property to get started.',
  ),
  'BROKER' => const _WorkspacePreviewSpec(
    'crm',
    'Leads & pipeline',
    'Your leads',
    'No leads yet. Add a lead to start your pipeline.',
  ),
  'BUILDER' => const _WorkspacePreviewSpec(
    'projects',
    'Projects & inventory',
    'Your projects',
    'No projects yet. Create a project to manage its inventory.',
  ),
  'SERVICE_PROVIDER' => const _WorkspacePreviewSpec(
    'providerRequests',
    'Incoming service requests',
    'Incoming requests',
    'No matching service requests right now.',
  ),
  _ => const _WorkspacePreviewSpec(
    'requests',
    'My service requests',
    'Your service requests',
    'No service requests yet. Request a service when you need one.',
  ),
};

class _WorkspaceRecordCard extends StatelessWidget {
  const _WorkspaceRecordCard({
    super.key,
    required this.module,
    required this.record,
    required this.onTap,
  });
  final String module;
  final JsonObject record;
  final VoidCallback? onTap;

  String? get _photo {
    if (record['coverImageUrl'] is String &&
        (record['coverImageUrl'] as String).trim().isNotEmpty) {
      return record['coverImageUrl'] as String;
    }
    final media = record['mediaUrls'];
    if (media is List) {
      for (final url in media) {
        if (url is String && url.trim().isNotEmpty) return url;
      }
    }
    return null;
  }

  String _label(Object? value) =>
      textValue(value, '').toLowerCase().replaceAll('_', ' ');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isProperty = module == 'properties';
    final title = textValue(
      record[isProperty
          ? 'title'
          : module == 'projects' || module == 'crm'
          ? 'name'
          : 'category'],
      'Record',
    );
    final location = [
      if (isProperty) textValue(record['locality'], ''),
      textValue(record['city'], ''),
    ].where((part) => part.isNotEmpty).join(', ');
    final status = _label(
      record[module == 'crm'
          ? 'stage'
          : module == 'projects' && record['constructionStatus'] != null
          ? 'constructionStatus'
          : 'status'],
    );
    final followUp = record['followUpAt'] is String
        ? DateTime.tryParse(record['followUpAt'] as String)?.toLocal()
        : null;
    final metadata = <String>[
      if (location.isNotEmpty) location,
      if (status.isNotEmpty) status,
      if (isProperty && record['price'] != null)
        '${textValue(record['currency'], '')} ${record['price']}'.trim(),
    ];
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (isProperty)
              ListingImage(
                key: ValueKey('workspace-property-image-${record['id']}'),
                url: _photo,
                height: 160,
              ),
            Padding(
              padding: const EdgeInsets.all(Space.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(title, style: theme.textTheme.titleMedium),
                      ),
                      if (onTap != null) const Icon(Icons.chevron_right),
                    ],
                  ),
                  if (metadata.isNotEmpty) ...[
                    const SizedBox(height: Space.xs),
                    Text(
                      metadata.join(' · '),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  if (!isProperty &&
                      textValue(record['message'], '').isNotEmpty) ...[
                    const SizedBox(height: Space.sm),
                    Text(
                      record['message'] as String,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (module == 'crm' &&
                      textValue(record['nextAction'], '').isNotEmpty) ...[
                    const SizedBox(height: Space.sm),
                    Text('Next action: ${record['nextAction']}'),
                  ],
                  if (followUp != null) ...[
                    const SizedBox(height: Space.xs),
                    Text(
                      'Follow-up: ${MaterialLocalizations.of(context).formatShortDate(followUp)} ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(followUp))}',
                    ),
                  ],
                  if (module == 'projects' &&
                      record['availableUnits'] is num &&
                      record['unitsCount'] is num) ...[
                    const SizedBox(height: Space.sm),
                    Text(
                      '${record['availableUnits']} available of ${record['unitsCount']} units',
                    ),
                  ],
                  if ((module == 'providerRequests' || module == 'requests') &&
                      record['budget'] != null) ...[
                    const SizedBox(height: Space.sm),
                    Text('Budget: ${record['budget']}'),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkspaceMetric {
  const _WorkspaceMetric(
    this.key,
    this.label,
    this.module,
    this.title,
    this.icon,
  );
  final String key, label, module, title;
  final IconData icon;
}

List<_WorkspaceMetric> _metrics(String role) => [
  if (role == 'OWNER' || role == 'BROKER')
    const _WorkspaceMetric(
      'MY_LISTINGS',
      'My listings',
      'properties',
      'My listings',
      Icons.home_work_outlined,
    ),
  if (role == 'BROKER') ...[
    const _WorkspaceMetric(
      'ACTIVE_LEADS',
      'Active leads',
      'crm',
      'Leads & pipeline',
      Icons.people_outline,
    ),
    const _WorkspaceMetric(
      'PENDING_TASKS',
      'Pending follow-ups',
      'calendar',
      'Follow-ups',
      Icons.event_note_outlined,
    ),
  ],
  if (role == 'BUILDER')
    const _WorkspaceMetric(
      'MY_PROJECTS',
      'My projects',
      'projects',
      'Projects & inventory',
      Icons.apartment_outlined,
    ),
  if (role == 'SERVICE_PROVIDER')
    const _WorkspaceMetric(
      'ACTIVE_JOBS',
      'Active jobs',
      'serviceBookings',
      'Service bookings',
      Icons.event_available_outlined,
    ),
  const _WorkspaceMetric(
    'UNREAD_NOTIFICATIONS',
    'Unread notifications',
    'notifications',
    'Notifications',
    Icons.notifications_none_outlined,
  ),
];

class WorkspaceMore extends StatelessWidget {
  const WorkspaceMore({
    super.key,
    required this.role,
    required this.onOpenModule,
    required this.onSummary,
    required this.onProfile,
    required this.onSignOut,
    required this.onDeletionReview,
    required this.accountBusy,
  });

  final String role;
  final OpenWorkspaceModule onOpenModule;
  final VoidCallback onSummary, onProfile, onSignOut, onDeletionReview;
  final bool accountBusy;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(Space.md),
    children: [
      Text(
        workspaceRoleName(role),
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: Space.sm),
      _WorkspaceGroup(
        title: 'Services',
        children: [
          _module('requests', 'My service requests', Icons.handyman_outlined),
          if (role != 'SERVICE_PROVIDER')
            _module(
              'serviceBookings',
              'Service bookings',
              Icons.event_available_outlined,
            ),
          _module('studio', 'HOMEZONE Studio', Icons.auto_awesome_outlined),
        ],
      ),
      _WorkspaceGroup(
        title: 'Activity',
        children: [
          if (role == 'USER')
            _module('properties', 'My listings', Icons.home_work_outlined),
          if (role == 'BROKER')
            _module(
              'ownerEnquiries',
              'Listing enquiries',
              Icons.forum_outlined,
            ),
          _module('visits', 'Property visits', Icons.location_on_outlined),
          _module('history', 'Recently viewed', Icons.history),
          _module(
            'notifications',
            'Notifications',
            Icons.notifications_none_outlined,
          ),
        ],
      ),
      _WorkspaceGroup(
        title: 'Finance',
        children: [
          if (role == 'BROKER')
            _module('commissions', 'Commissions', Icons.receipt_long_outlined),
          _module('payments', 'Payment history', Icons.payments_outlined),
          _module(
            'accountRequests',
            'Account and refund requests',
            Icons.assignment_return_outlined,
          ),
        ],
      ),
      _WorkspaceGroup(
        title: 'Account',
        children: [
          WorkspaceMenuTile(
            title: 'My profile',
            icon: Icons.person_outline,
            onTap: onProfile,
          ),
          if (role == 'BROKER')
            _module('team', 'My team', Icons.groups_outlined),
          WorkspaceMenuTile(
            title: 'Account summary',
            icon: Icons.insights_outlined,
            onTap: onSummary,
          ),
          WorkspaceMenuTile(
            title: 'Request account-deletion review',
            subtitle: 'Submit a request for human review.',
            icon: Icons.person_remove_outlined,
            onTap: accountBusy ? null : onDeletionReview,
          ),
          WorkspaceMenuTile(
            title: 'Sign out',
            icon: Icons.logout,
            onTap: accountBusy ? null : onSignOut,
          ),
        ],
      ),
    ],
  );

  Widget _module(String module, String title, IconData icon) =>
      WorkspaceMenuTile(
        title: title,
        icon: icon,
        onTap: () => onOpenModule(module, title),
      );
}

class _WorkspaceGroup extends StatelessWidget {
  const _WorkspaceGroup({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: Space.lg),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: Space.xs, bottom: Space.sm),
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        ...children,
      ],
    ),
  );
}

class WorkspaceMenuTile extends StatelessWidget {
  const WorkspaceMenuTile({
    super.key,
    required this.title,
    required this.icon,
    required this.onTap,
    this.subtitle,
  });
  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppShape.radius),
        child: Padding(
          padding: const EdgeInsets.all(Space.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: colors.primary),
              const SizedBox(width: Space.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleSmall),
                    if (subtitle != null) ...[
                      const SizedBox(height: Space.xs),
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: Space.sm),
              Icon(Icons.chevron_right, color: colors.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
