import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../core/api/api_client.dart';
import '../../shared/ui/loading_skeleton.dart';
import 'buyer_presentation.dart';
import 'marketplace_repository.dart';
import 'marketplace_screen.dart' show ListingImage;
import 'public_project.dart';

/// Public invalidation hints only trigger bounded HTTP reads while visible.
/// Publication, ownership and account status are always decided by the server.
mixin _PublicProjectRefresh<T extends StatefulWidget> on State<T>
    implements RouteAware {
  MarketplaceRepository get projectRepository;
  Future<void> readProjects(int revision);
  void invalidateProjects() {}

  MarketplaceRepository? _listening;
  RouteObserver<ModalRoute<dynamic>>? _observer;
  ModalRoute<dynamic>? _route;
  Timer? _timer;
  late final _ProjectLifecycle _lifecycle;
  final _lease = Object();
  bool _foreground = true, _routeVisible = true;
  bool _busy = false, _again = false;
  int _revision = 0, _failures = 0;
  DateTime? _retryAt;
  bool get projectReadBusy => _busy;
  bool get _visible =>
      mounted && _foreground && _routeVisible && (_route?.isCurrent ?? true);
  bool currentProjectRead(int revision) => _visible && revision == _revision;

  @override
  void initState() {
    super.initState();
    _foreground =
        WidgetsBinding.instance.lifecycleState == null ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
    _lifecycle = _ProjectLifecycle(_lifecycleChanged);
    WidgetsBinding.instance.addObserver(_lifecycle);
    _listen();
  }

  void _listen() {
    if (identical(_listening, projectRepository)) return;
    _listening?.listingChanges.removeListener(_changed);
    _listening?.realtime?.release(_lease);
    _listening = projectRepository;
    _listening!.listingChanges.addListener(_changed);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final observer = SessionScope.observerOf(context);
    final route = ModalRoute.of(context);
    if (!identical(observer, _observer) || !identical(route, _route)) {
      _observer?.unsubscribe(this);
      _observer = observer;
      _route = route;
      _routeVisible = route?.isCurrent ?? true;
      if (route != null) observer?.subscribe(this, route);
      _schedule(immediate: true);
    }
  }

  @override
  void didUpdateWidget(covariant T oldWidget) {
    super.didUpdateWidget(oldWidget);
    final previous = _listening;
    _listen();
    if (!identical(previous, _listening)) {
      _revision++;
      _retryAt = null;
      _failures = 0;
      invalidateProjects();
      _schedule(immediate: true);
    }
  }

  void _changed() {
    _revision++;
    invalidateProjects();
    _schedule(immediate: true);
  }

  void refreshProjects() {
    _revision++;
    invalidateProjects();
    _schedule(immediate: true);
  }

  void _schedule({bool immediate = false}) {
    if (!_visible) {
      _timer?.cancel();
      _timer = null;
      _listening?.realtime?.release(_lease);
      return;
    }
    _listening?.realtime?.acquire(_lease);
    if (_busy) {
      _again |= immediate;
      return;
    }
    _timer?.cancel();
    var delay = immediate ? Duration.zero : const Duration(seconds: 30);
    final deadline = _retryAt;
    if (deadline != null && deadline.isAfter(DateTime.now())) {
      final remaining = deadline.difference(DateTime.now());
      if (remaining > delay) delay = remaining;
    }
    _timer = Timer(delay, _read);
  }

  Future<void> _read() async {
    _timer = null;
    if (!_visible || _busy) return;
    setState(() => _busy = true);
    final revision = ++_revision;
    try {
      await readProjects(revision);
      _retryAt = null;
      _failures = 0;
    } catch (error) {
      _failures = (_failures + 1).clamp(1, 5);
      var seconds = (5 * (1 << (_failures - 1))).clamp(5, 120);
      if (error is ApiException && (error.retryAfterSeconds ?? 0) > seconds) {
        seconds = error.retryAfterSeconds!;
      }
      _retryAt = DateTime.now().add(Duration(seconds: seconds));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        final immediate = _again;
        _again = false;
        _schedule(immediate: immediate);
      }
    }
  }

  void _lifecycleChanged(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    if (_foreground) {
      refreshProjects();
    } else {
      _revision++;
      _schedule();
    }
  }

  @override
  void didPushNext() {
    _routeVisible = false;
    _revision++;
    _schedule();
  }

  @override
  void didPopNext() {
    _routeVisible = true;
    refreshProjects();
  }

  @override
  void didPush() => _routeVisible = true;
  @override
  void didPop() {
    _routeVisible = false;
    _revision++;
    _schedule();
  }

  @override
  void dispose() {
    _revision++;
    _timer?.cancel();
    _observer?.unsubscribe(this);
    _listening?.listingChanges.removeListener(_changed);
    _listening?.realtime?.release(_lease);
    WidgetsBinding.instance.removeObserver(_lifecycle);
    super.dispose();
  }
}

class _ProjectLifecycle extends WidgetsBindingObserver {
  _ProjectLifecycle(this.onChange);
  final ValueChanged<AppLifecycleState> onChange;
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) => onChange(state);
}

/// Embedded on Buyer home; does not merge projects into Property-only actions.
class PublicProjectsSection extends StatefulWidget {
  const PublicProjectsSection({super.key, required this.repository});
  final MarketplaceRepository repository;
  @override
  State<PublicProjectsSection> createState() => _PublicProjectsSectionState();
}

class _PublicProjectsSectionState extends State<PublicProjectsSection>
    with _PublicProjectRefresh<PublicProjectsSection> {
  PublicProjectPage? _page;
  Object? _error;
  @override
  MarketplaceRepository get projectRepository => widget.repository;
  @override
  void invalidateProjects() {
    if (mounted) {
      setState(() {
        _page = null;
        _error = null;
      });
    }
  }

  @override
  Future<void> readProjects(int revision) async {
    final repository = widget.repository;
    final generation = repository.coordinator.generation;
    try {
      final page = await repository.publicProjects(const {}, 1);
      if (currentProjectRead(revision) &&
          generation == repository.coordinator.generation) {
        setState(() {
          _page = page;
          _error = null;
        });
      }
    } catch (error) {
      if (currentProjectRead(revision)) {
        setState(() {
          _page = null;
          _error = error;
        });
      }
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const BuyerSectionLabel(
        'Builder projects',
        subtitle: 'Explore published developments and available homes.',
      ),
      if (_error != null)
        _ProjectError(error: _error!, onRetry: refreshProjects)
      else if (_page == null)
        const LoadingSkeleton(layout: SkeletonLayout.listings, itemCount: 1)
      else if (_page!.items.isEmpty)
        const BuyerEmptyState(
          title: 'New projects, coming soon',
          message: 'Published Builder projects will appear here.',
          compact: true,
          icon: Icons.apartment_outlined,
        )
      else ...[
        for (final project in _page!.items.take(3))
          _ProjectCard(project: project, repository: widget.repository),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) =>
                    PublicProjectsScreen(repository: widget.repository),
              ),
            ),
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Browse all projects'),
          ),
        ),
      ],
    ],
  );
}

class PublicProjectsScreen extends StatefulWidget {
  const PublicProjectsScreen({super.key, required this.repository});
  final MarketplaceRepository repository;
  @override
  State<PublicProjectsScreen> createState() => _PublicProjectsScreenState();
}

class _PublicProjectsScreenState extends State<PublicProjectsScreen>
    with _PublicProjectRefresh<PublicProjectsScreen> {
  final _search = TextEditingController();
  List<PublicProject>? _items;
  bool _hasMore = false;
  int _page = 0, _requestedPage = 1;
  String _keyword = '';
  Object? _error;
  @override
  MarketplaceRepository get projectRepository => widget.repository;
  @override
  void invalidateProjects() {
    if (mounted) {
      setState(() {
        _items = null;
        _error = null;
        _page = 0;
        _requestedPage = 1;
      });
    }
  }

  @override
  Future<void> readProjects(int revision) async {
    final requested = _requestedPage;
    final repository = widget.repository;
    final generation = repository.coordinator.generation;
    try {
      final page = await repository.publicProjects({
        if (_keyword.isNotEmpty) 'keyword': _keyword,
      }, requested);
      if (currentProjectRead(revision) &&
          generation == repository.coordinator.generation) {
        setState(() {
          _items = page.items;
          _hasMore = page.hasMore;
          _page = page.page;
          _error = null;
        });
      }
    } catch (error) {
      if (currentProjectRead(revision)) {
        setState(() {
          _error = error;
          if (requested == 1) _items = null;
        });
      }
      rethrow;
    }
  }

  void _submitSearch() {
    _keyword = _search.text.trim();
    refreshProjects();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Builder projects')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const BuyerHeading(
          title: 'A new place to call home',
          subtitle: 'Discover developments published by Builders.',
        ),
        TextField(
          controller: _search,
          maxLength: 100,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _submitSearch(),
          decoration: InputDecoration(
            labelText: 'Search projects',
            counterText: '',
            suffixIcon: IconButton(
              onPressed: _submitSearch,
              tooltip: 'Search projects',
              icon: const Icon(Icons.search),
            ),
          ),
        ),
        const SizedBox(height: 20),
        if (_error != null)
          _ProjectError(error: _error!, onRetry: refreshProjects),
        if (_items == null && _error == null)
          const LoadingSkeleton(layout: SkeletonLayout.listings, itemCount: 2),
        if (_items?.isEmpty == true)
          const BuyerEmptyState(
            title: 'No published projects found',
            message: 'Try another search or check back for new developments.',
            icon: Icons.apartment_outlined,
          ),
        for (final project in _items ?? <PublicProject>[])
          _ProjectCard(project: project, repository: widget.repository),
        if (_items != null)
          _PageControls(
            page: _page,
            hasMore: _hasMore,
            loading: projectReadBusy,
            onPage: (page) {
              _requestedPage = page;
              setState(() => _error = null);
              _schedule(immediate: true);
            },
          ),
      ],
    ),
  );
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project, required this.repository});
  final PublicProject project;
  final MarketplaceRepository repository;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: BuyerSurface(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => PublicProjectDetailScreen(
              id: project.id,
              repository: repository,
            ),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListingImage(url: project.images.firstOrNull, height: 180),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project.name,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  BuyerFact(
                    icon: Icons.location_on_outlined,
                    label: project.location,
                  ),
                  if (project.constructionStatus != null) ...[
                    const SizedBox(height: 8),
                    Text(buyerReadableValue(project.constructionStatus)),
                  ],
                  const SizedBox(height: 12),
                  const Text(
                    'View project',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class PublicProjectDetailScreen extends StatefulWidget {
  const PublicProjectDetailScreen({
    super.key,
    required this.id,
    required this.repository,
  });
  final String id;
  final MarketplaceRepository repository;
  @override
  State<PublicProjectDetailScreen> createState() =>
      _PublicProjectDetailScreenState();
}

class _PublicProjectDetailScreenState extends State<PublicProjectDetailScreen>
    with _PublicProjectRefresh<PublicProjectDetailScreen> {
  PublicProjectDetail? _detail;
  List<PublicProjectUnit> _units = [];
  int _requestedPage = 1;
  Object? _error;
  @override
  MarketplaceRepository get projectRepository => widget.repository;
  @override
  void invalidateProjects() {
    if (mounted) {
      setState(() {
        _detail = null;
        _units = [];
        _error = null;
        _requestedPage = 1;
      });
    }
  }

  @override
  void didUpdateWidget(PublicProjectDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.id != widget.id) refreshProjects();
  }

  @override
  Future<void> readProjects(int revision) async {
    final requested = _requestedPage;
    final repository = widget.repository;
    final generation = repository.coordinator.generation;
    try {
      final detail = await repository.publicProject(
        widget.id,
        unitsPage: requested,
      );
      if (currentProjectRead(revision) &&
          generation == repository.coordinator.generation) {
        setState(() {
          _detail = detail;
          _units = detail.units;
          _error = null;
        });
      }
    } catch (error) {
      if (currentProjectRead(revision)) {
        // Never keep photos or inventory visible after an unpublish/404 or an
        // unsuccessful refresh. Public availability must be reconfirmed.
        setState(() {
          _detail = null;
          _units = [];
          _error = error;
        });
      }
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    final project = detail?.project;
    return Scaffold(
      appBar: AppBar(title: const Text('Project details')),
      body: _error != null
          ? ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _ProjectError(
                  error: _error!,
                  onRetry: refreshProjects,
                  detail: true,
                ),
              ],
            )
          : project == null
          ? const LoadingSkeleton(layout: SkeletonLayout.detail)
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _ProjectGallery(
                  images: project.images,
                  label: 'Project photographs',
                ),
                const SizedBox(height: 20),
                BuyerHeading(title: project.name, subtitle: project.location),
                if (project.address != null) Text(project.address!),
                if (project.description != null) ...[
                  const BuyerSectionLabel('About this project'),
                  Text(project.description!),
                ],
                if (project.constructionStatus != null) ...[
                  const BuyerSectionLabel('Construction'),
                  Text(buyerReadableValue(project.constructionStatus)),
                ],
                if (project.completionDate != null)
                  Text(
                    'Expected completion: ${_date(project.completionDate!)}',
                  ),
                if (project.amenities.isNotEmpty) ...[
                  const BuyerSectionLabel('Amenities'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final item in project.amenities)
                        Chip(label: Text(item)),
                    ],
                  ),
                ],
                if (project.unitsCount != null ||
                    project.availableUnits != null) ...[
                  const BuyerSectionLabel('Builder-reported totals'),
                  if (project.unitsCount != null)
                    Text('Total units: ${project.unitsCount}'),
                  if (project.availableUnits != null)
                    Text('Available units: ${project.availableUnits}'),
                ],
                if (detail!.floorPlans.isNotEmpty) ...[
                  const BuyerSectionLabel('Floor plans'),
                  _ProjectGallery(
                    images: detail.floorPlans,
                    label: 'Floor plans',
                  ),
                ],
                if (detail.masterPlan != null) ...[
                  const BuyerSectionLabel('Master plan'),
                  ListingImage(url: detail.masterPlan),
                ],
                const BuyerSectionLabel('Available unit listings'),
                if (_units.isEmpty)
                  const Text(
                    'No available unit listings have been published for this project.',
                  ),
                for (final unit in _units) _UnitCard(unit: unit),
                _PageControls(
                  page: detail.unitsPage,
                  hasMore: detail.unitsHasMore,
                  loading: projectReadBusy,
                  onPage: (page) {
                    _requestedPage = page;
                    _schedule(immediate: true);
                  },
                ),
              ],
            ),
    );
  }
}

String _date(DateTime date) => '${date.day}/${date.month}/${date.year}';

class _PageControls extends StatelessWidget {
  const _PageControls({
    required this.page,
    required this.hasMore,
    required this.loading,
    required this.onPage,
  });
  final int page;
  final bool hasMore, loading;
  final ValueChanged<int> onPage;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          TextButton(
            onPressed: !loading && page > 1 ? () => onPage(page - 1) : null,
            child: const Text('Previous'),
          ),
          Text(loading ? 'Loading…' : 'Page $page'),
          TextButton(
            onPressed: !loading && hasMore && page < 1000
                ? () => onPage(page + 1)
                : null,
            child: const Text('Next'),
          ),
        ],
      ),
      if (hasMore && page >= 1000)
        const Text('Refine your search to explore more results.'),
    ],
  );
}

class _UnitCard extends StatelessWidget {
  const _UnitCard({required this.unit});
  final PublicProjectUnit unit;
  @override
  Widget build(BuildContext context) => BuyerSurface(
    margin: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (unit.images.isNotEmpty) ...[
          _ProjectGallery(images: unit.images, label: 'Unit photographs'),
          const SizedBox(height: 12),
        ],
        Text(
          unit.unitType ?? 'Available unit',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        if (unit.bedrooms != null) Text('${unit.bedrooms} bedrooms'),
        if (unit.bathrooms != null) Text('${unit.bathrooms} bathrooms'),
        if (unit.areaValue != null)
          Text('${unit.areaValue} ${unit.areaUnit ?? ''}'.trim()),
        // BuilderUnit has no currency field; never present an invented currency.
        Text(
          unit.price == null
              ? 'Price on request'
              : 'Price: ${unit.price} (currency not provided)',
        ),
      ],
    ),
  );
}

class _ProjectGallery extends StatelessWidget {
  const _ProjectGallery({required this.images, required this.label});
  final List<String> images;
  final String label;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      SizedBox(
        height: 240,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: images.isEmpty
              ? const ListingImage(height: 240)
              : PageView.builder(
                  itemCount: images.length,
                  itemBuilder: (_, index) =>
                      ListingImage(url: images[index], height: 240),
                ),
        ),
      ),
      if (images.length > 1)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text('$label · ${images.length} images · Swipe to view'),
        ),
    ],
  );
}

class _ProjectError extends StatelessWidget {
  const _ProjectError({
    required this.error,
    required this.onRetry,
    this.detail = false,
  });
  final Object error;
  final VoidCallback onRetry;
  final bool detail;
  @override
  Widget build(BuildContext context) {
    final unavailable =
        error is ApiException &&
        [
          ApiFailure.notFound,
          ApiFailure.forbidden,
        ].contains((error as ApiException).failure);
    return BuyerEmptyState(
      title: unavailable && detail
          ? 'Project unavailable'
          : 'Projects could not be loaded',
      message: unavailable && detail
          ? 'This project is unavailable or is no longer published.'
          : marketplaceError(error),
      icon: Icons.apartment_outlined,
      action: TextButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh),
        label: const Text('Try again'),
      ),
      compact: true,
    );
  }
}
