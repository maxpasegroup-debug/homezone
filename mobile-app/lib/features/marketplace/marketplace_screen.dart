import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:typed_data';
import '../../app/session_scope.dart';
import '../../core/api/api_client.dart';
import 'marketplace_repository.dart';
import 'public_listing_media_button.dart';
import 'account_listing_screen.dart';
import 'listing_location.dart';
import 'listing_media.dart';
import 'buyer_presentation.dart';
import '../../theme/design_tokens.dart';
import '../../shared/ui/loading_skeleton.dart';
import '../workspace/workspace_screen.dart';
import '../engagement/engagement_screens.dart';

/// Reuses the existing HTTP client while a service-backed screen is visible.
/// Public socket hints trigger the same guarded HTTP reads. Polling remains as
/// a fallback and periodic resync; neither path grants authentication authority.
mixin _ForegroundListingRefresh<T extends StatefulWidget> on State<T>
    implements RouteAware {
  MarketplaceRepository? get listingRefreshRepository;
  bool get canRefreshListingData => true;
  bool get observesListingRealtime => true;
  Future<void> refreshListingData();
  void listingDataChanged() {}

  RouteObserver<ModalRoute<dynamic>>? _listingObserver;
  ModalRoute<dynamic>? _listingRoute;
  MarketplaceRepository? _listeningRepository;
  late final _ListingLifecycle _listingLifecycle;
  Timer? _listingTimer;
  DateTime? _listingRetryAt;
  bool _listingForeground = true;
  bool _listingRouteVisible = true;
  bool _listingRefreshRunning = false;
  bool _listingRefreshAgain = false;
  bool _listingHintPending = false;
  int _listingFailures = 0;
  final Object _listingLiveLease = Object();

  bool get listingRefreshVisible =>
      mounted &&
      _listingForeground &&
      _listingRouteVisible &&
      (_listingRoute?.isCurrent ?? true);

  @override
  void initState() {
    super.initState();
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _listingForeground =
        lifecycle == null || lifecycle == AppLifecycleState.resumed;
    _listingLifecycle = _ListingLifecycle((state) {
      _listingForeground = state == AppLifecycleState.resumed;
      requestListingRefresh(immediate: _listingForeground);
    });
    WidgetsBinding.instance.addObserver(_listingLifecycle);
    _listenToListingChanges();
  }

  void _listenToListingChanges() {
    final repository = listingRefreshRepository;
    if (identical(repository, _listeningRepository)) return;
    _listeningRepository?.listingChanges.removeListener(_listingChanged);
    _listeningRepository?.realtime?.removeListener(_listingHealthChanged);
    _listeningRepository?.realtime?.release(_listingLiveLease);
    _listeningRepository = repository;
    repository?.listingChanges.addListener(_listingChanged);
    repository?.realtime?.addListener(_listingHealthChanged);
  }

  void _listingChanged() {
    _listingHintPending = true;
    listingDataChanged();
    requestListingRefresh(immediate: true);
  }

  void _listingHealthChanged() {
    _listingTimer?.cancel();
    _listingTimer = null;
    requestListingRefresh();
  }

  @override
  void didUpdateWidget(covariant T oldWidget) {
    super.didUpdateWidget(oldWidget);
    final previous = _listeningRepository;
    _listenToListingChanges();
    if (!identical(previous, _listeningRepository)) {
      _listingRetryAt = null;
      _listingFailures = 0;
    }
    requestListingRefresh();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final observer = SessionScope.observerOf(context);
    final route = ModalRoute.of(context);
    if (!identical(observer, _listingObserver) ||
        !identical(route, _listingRoute)) {
      _listingObserver?.unsubscribe(this);
      _listingObserver = observer;
      _listingRoute = route;
      _listingRouteVisible = route?.isCurrent ?? true;
      if (route != null) observer?.subscribe(this, route);
    }
    requestListingRefresh();
  }

  /// Immediate means the next safe read, never a concurrent request or bypass of
  /// a server Retry-After deadline.
  void requestListingRefresh({bool immediate = false}) {
    final realtime = listingRefreshRepository?.realtime;
    if (listingRefreshVisible && observesListingRealtime) {
      realtime?.acquire(_listingLiveLease);
    } else {
      realtime?.release(_listingLiveLease);
    }
    if (!listingRefreshVisible || listingRefreshRepository == null) {
      _listingTimer?.cancel();
      _listingTimer = null;
      return;
    }
    if (_listingRefreshRunning) {
      _listingRefreshAgain |= immediate;
      return;
    }
    if (_listingTimer != null && !immediate) return;
    _listingTimer?.cancel();
    var delay = immediate
        ? Duration.zero
        : Duration(
            seconds: _listingHintPending && observesListingRealtime
                ? 1
                : realtime?.ready == true
                ? 30
                : 5,
          );
    final deadline = _listingRetryAt;
    if (deadline != null && deadline.isAfter(DateTime.now())) {
      final remaining = deadline.difference(DateTime.now());
      if (remaining > delay) delay = remaining;
    }
    _listingTimer = Timer(delay, _runListingRefresh);
  }

  Future<void> _runListingRefresh() async {
    _listingTimer = null;
    if (!listingRefreshVisible || listingRefreshRepository == null) return;
    if (!canRefreshListingData) {
      requestListingRefresh();
      return;
    }
    if (_listingRefreshRunning) return;
    _listingHintPending = false;
    _listingRefreshRunning = true;
    try {
      await refreshListingData();
      _listingFailures = 0;
      _listingRetryAt = null;
    } catch (failure) {
      _listingFailures = (_listingFailures + 1).clamp(1, 5);
      var seconds = (5 * (1 << (_listingFailures - 1))).clamp(5, 60);
      if (failure is ApiException &&
          failure.retryAfterSeconds != null &&
          failure.retryAfterSeconds! > seconds) {
        seconds = failure.retryAfterSeconds!;
      }
      _listingRetryAt = DateTime.now().add(Duration(seconds: seconds));
    } finally {
      _listingRefreshRunning = false;
      if (mounted) {
        final immediate = _listingRefreshAgain;
        _listingRefreshAgain = false;
        requestListingRefresh(immediate: immediate);
      }
    }
  }

  @override
  void didPush() {
    _listingRouteVisible = true;
    requestListingRefresh();
  }

  @override
  void didPushNext() {
    _listingRouteVisible = false;
    requestListingRefresh();
  }

  @override
  void didPopNext() {
    _listingRouteVisible = true;
    requestListingRefresh(immediate: true);
  }

  @override
  void didPop() {
    _listingRouteVisible = false;
    requestListingRefresh();
  }

  @override
  void dispose() {
    _listingTimer?.cancel();
    _listingObserver?.unsubscribe(this);
    _listeningRepository?.listingChanges.removeListener(_listingChanged);
    _listeningRepository?.realtime?.removeListener(_listingHealthChanged);
    _listeningRepository?.realtime?.release(_listingLiveLease);
    WidgetsBinding.instance.removeObserver(_listingLifecycle);
    super.dispose();
  }
}

class _ListingLifecycle extends WidgetsBindingObserver {
  _ListingLifecycle(this.changed);
  final ValueChanged<AppLifecycleState> changed;
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) => changed(state);
}

bool _listingUnavailable(Object failure) =>
    failure is ApiException &&
    const {
      ApiFailure.unauthorized,
      ApiFailure.forbidden,
      ApiFailure.notFound,
    }.contains(failure.failure);

/// Service-backed screens never consume DemoProperty or preview collections.
class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({
    super.key,
    required this.repository,
    this.themeMode = ThemeMode.system,
    this.onThemeChanged,
  });
  final MarketplaceRepository repository;
  final ThemeMode themeMode;
  final ValueChanged<ThemeMode>? onThemeChanged;
  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen>
    with _ForegroundListingRefresh<MarketplaceScreen> {
  final query = TextEditingController();
  final filters = <String, String>{};
  final recent = <Listing>[];
  final compare = <String, Listing>{};
  final favoriteStatus = <String, bool>{};
  List<Listing> listings = [];
  JsonObject? account;
  String? accountIdentity;
  int? accountGeneration;
  int tab = 0, page = 1, revision = 0;
  bool loading = false, more = false, mutating = false;
  bool _loadingMore = false;
  bool savePending = false;
  int accountEpoch = 0;
  final collectionPending = <String>{};
  String? error;
  String? _catalogRefreshError;
  int _catalogRefreshPage = 1;
  int _catalogRefreshLaterPage = 2;
  @override
  MarketplaceRepository get listingRefreshRepository => widget.repository;
  @override
  bool get canRefreshListingData => tab < 2 && !loading && !mutating;
  @override
  bool get observesListingRealtime => tab < 2;

  @override
  void listingDataChanged() {
    // A public hint may represent a newly published first-page item. Do not
    // spend that immediate read on a later page of the existing catalogue.
    _catalogRefreshPage = 1;
  }

  @override
  Future<void> refreshListingData() async {
    final requestedRevision = revision;
    final requestedGeneration = widget.repository.coordinator.generation;
    final requestedListingChange = widget.repository.listingChanges.value;
    final requestedFilters = Map<String, String>.from(filters);
    final requestedTab = tab;
    final loadedPages = page;
    final requestedPage = _catalogRefreshPage.clamp(1, loadedPages);
    bool current() =>
        listingRefreshVisible &&
        requestedRevision == revision &&
        requestedGeneration == widget.repository.coordinator.generation &&
        requestedListingChange == widget.repository.listingChanges.value &&
        requestedTab == tab &&
        loadedPages == page &&
        requestedFilters.length == filters.length &&
        requestedFilters.entries.every(
          (entry) => filters[entry.key] == entry.value,
        );
    try {
      final next = await widget.repository.listings(
        requestedFilters,
        requestedPage,
      );
      if (!current()) return;
      var refreshFirstPageNow = false;
      setState(() {
        _catalogRefreshError = null;
        if (loadedPages == 1) {
          listings = next.items;
          more = next.hasMore;
          _catalogRefreshPage = 1;
          _catalogRefreshLaterPage = 2;
        } else {
          final byId = {for (final item in next.items) item.id: item};
          final start = (requestedPage - 1) * 12;
          final oldPage = listings
              .skip(start)
              .take(12)
              .map((item) => item.id)
              .toList();
          final newPage = next.items.map((item) => item.id).toList();
          final membershipChanged =
              oldPage.length != newPage.length ||
              Iterable<int>.generate(
                oldPage.length,
              ).any((index) => oldPage[index] != newPage[index]);
          if (membershipChanged) {
            // Insertions, removals and reordered results move offset page
            // boundaries. Rebuild from page 1 instead of skipping new records,
            // retaining unpublished rows, or requiring a manual refresh.
            page = 1;
            listings = requestedPage == 1
                ? next.items
                : listings.take(12).toList();
            more = requestedPage == 1 ? next.hasMore : true;
            _catalogRefreshPage = 1;
            _catalogRefreshLaterPage = 2;
            refreshFirstPageNow = requestedPage != 1;
          } else {
            listings = [for (final item in listings) byId[item.id] ?? item];
            if (requestedPage == loadedPages) more = next.hasMore;
            // Prioritize page 1 between later-page reads: new publications are
            // detected within two foreground cycles while existing cards also
            // receive photo updates. Each cycle sends only one public GET.
            if (requestedPage == 1) {
              _catalogRefreshPage = _catalogRefreshLaterPage.clamp(
                2,
                loadedPages,
              );
            } else {
              _catalogRefreshLaterPage = requestedPage >= loadedPages
                  ? 2
                  : requestedPage + 1;
              _catalogRefreshPage = 1;
            }
          }
        }
        final byId = {for (final item in next.items) item.id: item};
        for (var index = 0; index < recent.length; index++) {
          recent[index] = byId[recent[index].id] ?? recent[index];
        }
        compare.updateAll((id, item) => byId[id] ?? item);
      });
      if (refreshFirstPageNow) requestListingRefresh(immediate: true);
    } catch (failure) {
      if (current()) {
        setState(() => _catalogRefreshError = marketplaceError(failure));
      }
      rethrow;
    }
  }

  bool get verified => widget.repository.session.verified;
  Set<String> get saved => account == null
      ? <String>{}
      : objects(account!['saved']).map((row) => Listing.parse(row).id).toSet();

  @override
  void initState() {
    super.initState();
    widget.repository.session.addListener(sessionChanged);
    load();
  }

  @override
  void dispose() {
    revision++;
    widget.repository.session.removeListener(sessionChanged);
    query.dispose();
    super.dispose();
  }

  void sessionChanged() {
    if (!mounted) return;
    if (verified &&
        accountIdentity == widget.repository.session.identity?.id &&
        accountGeneration == widget.repository.coordinator.generation) {
      setState(() {});
      return;
    }
    // Drop all account-derived state synchronously on invalidation.
    revision++;
    accountEpoch++;
    collectionPending.clear();
    setState(() {
      account = null;
      accountIdentity = null;
      accountGeneration = null;
      compare.clear();
      favoriteStatus.clear();
      recent.clear();
      error = null;
      _catalogRefreshError = null;
      _catalogRefreshPage = 1;
      _catalogRefreshLaterPage = 2;
      loading = false;
      _loadingMore = false;
    });
  }

  Future<void> load({bool next = false}) async {
    if (loading || (next && (!more || page >= 1000))) return;
    final request = ++revision;
    final generation = widget.repository.coordinator.generation;
    setState(() {
      loading = true;
      _loadingMore = next;
      error = null;
      _catalogRefreshError = null;
      if (!next) {
        _catalogRefreshPage = 1;
        _catalogRefreshLaterPage = 2;
      }
    });
    try {
      if (tab < 2) {
        final result = await widget.repository.listings(
          filters,
          next ? page + 1 : 1,
        );
        if (!mounted ||
            request != revision ||
            generation != widget.repository.coordinator.generation) {
          return;
        }
        setState(() {
          page = next ? page + 1 : 1;
          listings = next
              ? ({
                  for (final row in [...listings, ...result.items]) row.id: row,
                }.values.toList())
              : result.items;
          more = result.hasMore && page < 1000;
        });
        if (tab == 0 && verified) {
          try {
            final history = await widget.repository.history();
            if (mounted &&
                request == revision &&
                generation == widget.repository.coordinator.generation) {
              setState(() {
                recent
                  ..clear()
                  ..addAll(history);
              });
            }
          } catch (_) {
            if (mounted && request == revision)
              message('Recently viewed could not be refreshed.');
          }
        }
      } else if (verified) {
        await refreshAccount();
      }
    } catch (failure) {
      if (mounted && request == revision) {
        setState(() => error = marketplaceError(failure));
      }
    } finally {
      if (mounted && request == revision) {
        setState(() {
          loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  Future<void> refreshAccount() async {
    final epoch = ++accountEpoch;
    collectionPending.clear();
    final generation = widget.repository.coordinator.generation;
    final result = await widget.repository.account();
    // Parse before assigning: malformed data must not surface as build exceptions.
    objects(result['saved']).map(Listing.parse).toList();
    for (final shortlist in objects(result['shortlists'])) {
      if (shortlist['id'] is! String || shortlist['name'] is! String) {
        throw const FormatException();
      }
      objects(
        shortlist['items'],
      ).map((item) => Listing.parse(item['property'])).toList();
    }
    objects(result['enquiries']);
    object(result['profile']);
    if (mounted &&
        verified &&
        epoch == accountEpoch &&
        generation == widget.repository.coordinator.generation) {
      setState(() {
        account = result;
        accountIdentity = widget.repository.session.identity?.id;
        accountGeneration = generation;
        favoriteStatus.clear();
      });
    }
  }

  Future<void> loadCollection(String collection, {String? parent}) async {
    if (!verified || account == null || mutating || loading) return;
    final key = parent ?? collection;
    if (collectionPending.contains(key)) return;
    final generation = widget.repository.coordinator.generation;
    final epoch = accountEpoch;
    JsonObject? shortlist;
    if (parent != null) {
      for (final row in objects(account!['shortlists'])) {
        if (row['id'] == parent) shortlist = row;
      }
      if (shortlist == null) return;
    }
    final cursor = parent == null
        ? object(account!['pagination'])[collection]
        : shortlist!['nextCursor'];
    if (cursor == null && (parent == null || shortlist!['itemsLoaded'] == true))
      return;
    setState(() => collectionPending.add(key));
    try {
      final page = await widget.repository.accountCollection(
        collection,
        parent: parent,
        cursor: cursor as String?,
      );
      if (!mounted ||
          !verified ||
          epoch != accountEpoch ||
          generation != widget.repository.coordinator.generation)
        return;
      setState(() {
        final destination = parent == null ? account! : shortlist!;
        final field = parent == null ? collection : 'items';
        final merged = <String, JsonObject>{};
        for (final row in [
          ...objects(destination[field]),
          ...objects(page['items']),
        ]) {
          final id = collection == 'shortlistItems'
              ? object(row['property'])['id']
              : row['id'];
          if (id is! String) throw const FormatException();
          merged[id] = row;
        }
        destination[field] = merged.values.toList();
        if (parent == null) {
          object(account!['pagination'])[collection] = page['nextCursor'];
        } else {
          destination['itemsLoaded'] = true;
          destination['nextCursor'] = page['nextCursor'];
        }
      });
    } catch (failure) {
      if (mounted &&
          epoch == accountEpoch &&
          generation == widget.repository.coordinator.generation)
        message(marketplaceError(failure));
    } finally {
      if (mounted && epoch == accountEpoch)
        setState(() => collectionPending.remove(key));
    }
  }

  Widget collectionMore(String collection, {JsonObject? shortlist}) {
    final parent = shortlist?['id'] as String?;
    final cursor = parent == null
        ? object(account!['pagination'])[collection]
        : shortlist!['nextCursor'];
    if (cursor == null &&
        (shortlist == null || shortlist['itemsLoaded'] == true))
      return const SizedBox.shrink();
    final pending = collectionPending.contains(parent ?? collection);
    if (pending) {
      return LoadingSkeleton(
        layout: collection == 'saved' || collection == 'shortlistItems'
            ? SkeletonLayout.listings
            : SkeletonLayout.rows,
        itemCount: 1,
        label: 'Loading more ${parent == null ? collection : 'properties'}',
      );
    }
    return TextButton(
      onPressed: loading || mutating
          ? null
          : () => loadCollection(collection, parent: parent),
      child: Text(
        parent != null && shortlist!['itemsLoaded'] != true
            ? 'Load shortlist properties'
            : 'Load more ${parent == null ? collection : 'properties'}',
      ),
    );
  }

  void message(String value) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(value)));
    }
  }

  Future<void> mutate(Future<void> Function() action) async {
    if (mutating) return;
    if (!verified) {
      message('Sign in before changing account data.');
      return;
    }
    final generation = widget.repository.coordinator.generation;
    setState(() => mutating = true);
    try {
      await action();
      if (!mounted ||
          generation != widget.repository.coordinator.generation ||
          !verified) {
        return;
      }
      try {
        await refreshAccount();
      } catch (_) {
        message(
          'The server acknowledged the change, but refreshing failed. Refresh before making another change.',
        );
      }
    } catch (failure) {
      if (mounted && generation == widget.repository.coordinator.generation) {
        message(marketplaceError(failure, mutation: true));
      }
    } finally {
      if (mounted) setState(() => mutating = false);
    }
  }

  Future<void> toggleSave(Listing listing) async {
    if (savePending || mutating || !mounted) return;
    savePending = true;
    final generation = widget.repository.coordinator.generation;
    try {
      if (!verified) {
        message('Sign in before changing account data.');
        return;
      }
      final previous = await widget.repository.savedStatus(listing.id);
      if (!mounted ||
          !verified ||
          generation != widget.repository.coordinator.generation)
        return;
      var acknowledged = false;
      await mutate(() async {
        await widget.repository.save(listing.id, !previous);
        acknowledged = true;
      });
      if (acknowledged &&
          mounted &&
          generation == widget.repository.coordinator.generation) {
        setState(() => favoriteStatus[listing.id] = !previous);
      }
    } catch (failure) {
      if (mounted && generation == widget.repository.coordinator.generation) {
        message(marketplaceError(failure));
      }
    } finally {
      savePending = false;
    }
  }

  Future<void> open(Listing listing) async {
    recent.removeWhere((row) => row.id == listing.id);
    recent.insert(0, listing);
    if (recent.length > 10) recent.removeLast();
    setState(() {});
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            AccountListingScreen(id: listing.id, repository: widget.repository),
      ),
    );
    if (mounted) {
      setState(() {});
      if (verified && account != null) {
        try {
          await refreshAccount();
          final generation = widget.repository.coordinator.generation;
          final next = await widget.repository.savedStatus(listing.id);
          if (mounted &&
              verified &&
              generation == widget.repository.coordinator.generation) {
            setState(() => favoriteStatus[listing.id] = next);
          }
        } catch (_) {
          message('Refresh your account to see the latest server state.');
        }
      }
    }
  }

  Future<String?> nameDialog(String title, [String initial = '']) async {
    return showDialog<String>(
      context: context,
      builder: (_) => _ShortlistNameDialog(title: title, initial: initial),
    );
  }

  Future<void> editFilters() async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => LiveFilterSheet(initial: filters),
    );
    if (!mounted || result == null) return;
    setState(() {
      filters
        ..clear()
        ..addAll(result);
    });
    await load();
  }

  Future<void> signOut() async {
    if (mutating) return;
    setState(() => mutating = true);
    final acknowledged = await widget.repository.session.signOut();
    if (!mounted) return;
    if (widget.repository.session.verified) {
      setState(() => mutating = false);
      message(
        'An account operation is still active. Please try sign-out again when it finishes.',
      );
      return;
    }
    setState(() {
      mutating = false;
      account = null;
    });
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: const Text('Signed out locally'),
        content: Text(
          !widget.repository.session.credentialRemovalConfirmed
              ? 'The in-memory session was cleared, but device credential removal could not be confirmed. Server sign-out ${acknowledged ? "was acknowledged" : "could not be confirmed"}. Retry sign-out using the website account controls before sharing this device.'
              : acknowledged
              ? 'The server acknowledged sign-out. Local account data and credentials have been cleared.'
              : 'Local account data and credentials have been cleared. Server revocation could not be confirmed; a submitted request may still be processed. Use the website account controls if needed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/sign-in', (_) => false);
    }
  }

  Widget card(Listing listing) => Card(
    margin: const EdgeInsets.only(bottom: 18),
    elevation: 0,
    color: Theme.of(context).colorScheme.surfaceContainerLowest,
    clipBehavior: Clip.antiAlias,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(22),
      side: BorderSide(
        color: Theme.of(
          context,
        ).colorScheme.outlineVariant.withValues(alpha: .65),
      ),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: () => open(listing),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Stack(
                children: [
                  ListingImage(url: listing.images.firstOrNull, height: 206),
                  if (listing.data['intent'] != null)
                    Positioned(
                      left: 14,
                      top: 14,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: BrandColors.forest,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          buyerReadableValue(listing.data['intent']),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      buyerPrice(listing.data),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 23,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      listing.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    BuyerFact(
                      icon: Icons.location_on_outlined,
                      label: listing.location.isEmpty
                          ? 'Location not provided'
                          : listing.location,
                    ),
                    if (listing.data['bedrooms'] != null ||
                        listing.data['bathrooms'] != null ||
                        listing.data['areaValue'] != null) ...[
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 16,
                        runSpacing: 10,
                        children: [
                          if (listing.data['bedrooms'] != null)
                            BuyerFact(
                              icon: Icons.bed_outlined,
                              label: '${listing.fact('bedrooms')} beds',
                            ),
                          if (listing.data['bathrooms'] != null)
                            BuyerFact(
                              icon: Icons.bathtub_outlined,
                              label: '${listing.fact('bathrooms')} baths',
                            ),
                          if (listing.data['areaValue'] != null)
                            BuyerFact(
                              icon: Icons.square_foot,
                              label:
                                  '${listing.fact('areaValue')} ${buyerReadableValue(listing.data['areaUnit'] ?? '')}',
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        Divider(
          height: 1,
          color: Theme.of(
            context,
          ).colorScheme.outlineVariant.withValues(alpha: .6),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          child: Wrap(
            alignment: WrapAlignment.spaceBetween,
            children: [
              TextButton.icon(
                onPressed: mutating ? null : () => toggleSave(listing),
                icon: Icon(
                  (favoriteStatus[listing.id] ?? saved.contains(listing.id))
                      ? Icons.favorite
                      : Icons.favorite_border,
                ),
                label: Text(
                  favoriteStatus[listing.id] == true ||
                          (!favoriteStatus.containsKey(listing.id) &&
                              saved.contains(listing.id))
                      ? 'Saved'
                      : favoriteStatus[listing.id] == false ||
                            (account != null &&
                                object(account!['pagination'])['saved'] == null)
                      ? 'Save'
                      : 'Toggle saved property',
                ),
              ),
              TextButton.icon(
                onPressed: () => setState(() {
                  if (compare.containsKey(listing.id)) {
                    compare.remove(listing.id);
                  } else if (compare.length < 4) {
                    compare[listing.id] = listing;
                  } else {
                    message('Compare up to four properties.');
                  }
                }),
                icon: Icon(
                  compare.containsKey(listing.id)
                      ? Icons.check
                      : Icons.compare_arrows,
                ),
                label: const Text('Compare'),
              ),
            ],
          ),
        ),
      ],
    ),
  );
  Widget empty(String title) =>
      BuyerEmptyState(title: title, message: '', compact: true);
  List<Widget> browsing() => [
    if (tab == 0)
      const BuyerWelcome()
    else
      const BuyerHeading(
        eyebrow: 'Discover',
        title: 'Your home, your way.',
        subtitle: 'A neighbourhood, a budget, a fresh start. Find what fits.',
      ),
    TextField(
      controller: query,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: 'City, locality or a place you love',
        labelText: 'Search properties',
        prefixIcon: const Icon(Icons.search_rounded),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        suffixIcon: IconButton(
          tooltip: 'Search',
          onPressed: loading ? null : search,
          icon: const Icon(Icons.arrow_forward_rounded),
        ),
      ),
      onSubmitted: (_) => search(),
    ),
    const SizedBox(height: 14),
    Wrap(
      spacing: 8,
      children: [
        for (final entry in <(String, String)>[
          ('All', ''),
          ('Buy', 'BUY'),
          ('Rent', 'RENT'),
        ])
          ChoiceChip(
            label: Text(entry.$1),
            selected: (filters['purpose'] ?? '') == entry.$2,
            onSelected: loading
                ? null
                : (_) {
                    if ((filters['purpose'] ?? '') != entry.$2) {
                      filters.remove('minPrice');
                      filters.remove('maxPrice');
                    }
                    if (entry.$2.isEmpty) {
                      filters.remove('purpose');
                    } else {
                      filters['purpose'] = entry.$2;
                    }
                    setState(() {});
                    load();
                  },
          ),
      ],
    ),
    const SizedBox(height: 8),
    Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        OutlinedButton.icon(
          onPressed: loading ? null : editFilters,
          icon: const Icon(Icons.tune),
          label: const Text('Filters'),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: DropdownButton<String>(
            isExpanded: true,
            value: filters['sort'] ?? 'newest',
            underline: const SizedBox.shrink(),
            icon: const Icon(Icons.keyboard_arrow_down, size: 20),
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            items: [
              for (final entry in [
                ('newest', 'Newest'),
                ('price_asc', 'Price: low to high'),
                ('price_desc', 'Price: high to low'),
              ])
                DropdownMenuItem(
                  value: entry.$1,
                  child: Text(
                    entry.$2,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: loading
                ? null
                : (value) {
                    filters['sort'] = value!;
                    setState(() {});
                    load();
                  },
          ),
        ),
      ],
    ),
    BuyerSectionLabel(
      tab == 0 ? 'Homes to discover' : 'Search results',
      subtitle: filters.isEmpty
          ? 'Published places, ready to explore.'
          : 'Homes matching your preferences.',
    ),
    if (listings.isEmpty && !loading && error == null)
      BuyerEmptyState(
        title: 'A little space for possibility.',
        message: filters.isEmpty
            ? 'There are no published homes to explore just yet. Check back soon for your next place.'
            : 'No matching published listings. Try changing the filters.',
        icon: Icons.other_houses_outlined,
        action: filters.isEmpty
            ? null
            : OutlinedButton.icon(
                onPressed: editFilters,
                icon: const Icon(Icons.tune_rounded),
                label: const Text('Adjust filters'),
              ),
      ),
    if (loading && listings.isNotEmpty && !_loadingMore)
      const Padding(
        padding: EdgeInsets.only(bottom: 16),
        child: Shimmer(
          label: 'Refreshing properties',
          child: SkeletonLine(widthFactor: .45),
        ),
      ),
    ...listings.map(card),
    if (loading && (listings.isEmpty || _loadingMore))
      LoadingSkeleton(
        layout: SkeletonLayout.listings,
        itemCount: listings.isEmpty ? 2 : 1,
        label: _loadingMore ? 'Loading more properties' : 'Loading properties',
      ),
    if (page >= 1000 && !more && listings.isNotEmpty)
      const Text(
        'Search page limit reached. Refine your filters to narrow the results.',
      ),
    if (more)
      FilledButton(
        onPressed: loading ? null : () => load(next: true),
        child: const Text('Load more'),
      ),
    if (tab == 0) ...[
      const SizedBox(height: 12),
      BuyerSurface(
        padding: const EdgeInsets.all(6),
        child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.favorite_border_rounded),
              title: const Text('Your saved homes'),
              subtitle: const Text('Keep the places you love close.'),
              trailing: const Icon(Icons.arrow_forward_rounded, size: 19),
              onTap: () => changeTab(2),
            ),
            const Divider(height: 1, indent: 16, endIndent: 16),
            ListTile(
              leading: const Icon(Icons.chat_bubble_outline_rounded),
              title: const Text('Your enquiries'),
              subtitle: const Text('Follow your interest in a property.'),
              trailing: const Icon(Icons.arrow_forward_rounded, size: 19),
              onTap: () => changeTab(3),
            ),
          ],
        ),
      ),
    ],
    if (tab == 0 && recent.isNotEmpty) ...[
      const BuyerSectionLabel(
        'Recently viewed',
        subtitle: 'Take another look at the places you opened.',
      ),
      ...recent.map(card),
    ],
  ];
  void search() {
    // Keyboard submission must obey the same admission rule as the search button.
    if (loading) return;
    final value = query.text.trim();
    if (value.isEmpty) {
      filters.remove('keyword');
    } else {
      filters['keyword'] = value;
    }
    load();
  }

  List<Widget> collections() => [
    const BuyerHeading(
      eyebrow: 'Your collection',
      title: 'Saved & Shortlists',
      subtitle:
          'Good places deserve a second look. Keep your favourites together.',
    ),
    if (account != null) ...[
      if (objects(account!['saved']).isEmpty)
        BuyerEmptyState(
          title: 'Your favourites start here.',
          message:
              'No saved properties. Tap the heart on a home you love to keep it here.',
          icon: Icons.favorite_border_rounded,
          action: OutlinedButton.icon(
            onPressed: () => changeTab(0),
            icon: const Icon(Icons.search_rounded),
            label: const Text('Browse homes'),
          ),
        ),
      ...objects(account!['saved']).map((row) => card(Listing.parse(row))),
      collectionMore('saved'),
      const BuyerSectionLabel(
        'Shortlists',
        subtitle: 'A little organisation for your big decision.',
      ),
      FilledButton(
        onPressed: mutating
            ? null
            : () async {
                final name = await nameDialog('Create shortlist');
                if (name != null && mounted) {
                  await mutate(() => widget.repository.shortlist(null, name));
                }
              },
        child: const Text('Create shortlist'),
      ),
      for (final shortlist in objects(account!['shortlists']))
        ExpansionTile(
          title: Text(textValue(shortlist['name'])),
          children: [
            Wrap(
              children: [
                TextButton(
                  onPressed: mutating
                      ? null
                      : () async {
                          final name = await nameDialog(
                            'Rename shortlist',
                            shortlist['name'] as String,
                          );
                          if (name != null && mounted) {
                            await mutate(
                              () => widget.repository.shortlist(
                                shortlist['id'] as String,
                                name,
                              ),
                            );
                          }
                        },
                  child: const Text('Rename'),
                ),
                TextButton(
                  onPressed: mutating
                      ? null
                      : () async {
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Delete shortlist?'),
                              content: const Text(
                                'Saved properties will remain saved.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, false),
                                  child: const Text('Cancel'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Delete'),
                                ),
                              ],
                            ),
                          );
                          if (confirmed == true && mounted) {
                            await mutate(
                              () => widget.repository.deleteShortlist(
                                shortlist['id'] as String,
                              ),
                            );
                          }
                        },
                  child: const Text('Delete'),
                ),
              ],
            ),
            if (shortlist['itemsLoaded'] == true &&
                objects(shortlist['items']).isEmpty)
              empty('This shortlist is empty.'),
            for (final item in objects(shortlist['items']))
              ListTile(
                title: Text(Listing.parse(item['property']).title),
                onTap: () => open(Listing.parse(item['property'])),
                trailing: IconButton(
                  tooltip: 'Remove from shortlist',
                  icon: const Icon(Icons.remove_circle_outline),
                  onPressed: mutating
                      ? null
                      : () => mutate(
                          () => widget.repository.membership(
                            shortlist['id'] as String,
                            Listing.parse(item['property']).id,
                            false,
                          ),
                        ),
                ),
              ),
            collectionMore('shortlistItems', shortlist: shortlist),
            if (shortlist['itemsLoaded'] == true &&
                shortlist['nextCursor'] == null)
              for (final property in objects(
                account!['saved'],
              ).map(Listing.parse))
                if (!objects(
                  shortlist['items'],
                ).any((item) => object(item['property'])['id'] == property.id))
                  ListTile(
                    title: Text('Add ${property.title}'),
                    leading: const Icon(Icons.add),
                    onTap: mutating
                        ? null
                        : () => mutate(
                            () => widget.repository.membership(
                              shortlist['id'] as String,
                              property.id,
                              true,
                            ),
                          ),
                  ),
          ],
        ),
      collectionMore('shortlists'),
      Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Text(
          'Open a shortlist to see its homes. Unavailable listings are omitted.',
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    ],
  ];
  List<Widget> enquiries() => [
    const BuyerHeading(
      eyebrow: 'Your next move',
      title: 'My Enquiries',
      subtitle:
          'Keep track of the properties you’ve asked about, all in one place.',
    ),
    if (account != null && objects(account!['enquiries']).isEmpty)
      BuyerEmptyState(
        title: 'Take the next step.',
        message: 'No enquiries yet. Open a property to enquire.',
        icon: Icons.forum_outlined,
        action: OutlinedButton.icon(
          onPressed: () => changeTab(0),
          icon: const Icon(Icons.search_rounded),
          label: const Text('Browse homes'),
        ),
      ),
    if (account != null)
      for (final row in objects(account!['enquiries']))
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 0,
          color: Theme.of(context).colorScheme.surfaceContainerLowest,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: BorderSide(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(18),
            leading: Icon(
              Icons.chat_bubble_outline_rounded,
              color: Theme.of(context).colorScheme.primary,
            ),
            title: Text(
              row['property'] is JsonObject
                  ? textValue(object(row['property'])['title'])
                  : 'Unavailable property',
            ),
            subtitle: Text(
              '${buyerReadableValue(textValue(row['stage']))}\n${buyerDate(row['createdAt'])}',
            ),
            trailing: row['property'] is JsonObject
                ? const Icon(Icons.chevron_right_rounded)
                : null,
            onTap: row['property'] is JsonObject
                ? () async {
                    try {
                      final listing = await widget.repository.detail(
                        object(row['property'])['id'] as String,
                      );
                      if (mounted) await open(listing);
                    } catch (failure) {
                      message(marketplaceError(failure));
                    }
                  }
                : null,
          ),
        ),
    if (account != null) collectionMore('enquiries'),
  ];
  List<Widget> profile() => [
    const BuyerHeading(
      eyebrow: 'Your HomeZone',
      title: 'My Profile',
      subtitle: 'A home for your details, preferences and next steps.',
    ),
    if (account != null) ...[
      BuyerSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 29,
              backgroundColor: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: .1),
              child: Text(
                buyerInitials(object(account!['profile'])['fullName']),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.w700,
                  fontSize: 21,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              textValue(
                object(account!['profile'])['fullName'],
                'HomeZone member',
              ),
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              object(account!['profile'])['role'] == 'USER'
                  ? 'Property Buyer'
                  : buyerReadableValue(
                      textValue(object(account!['profile'])['role'], 'Member'),
                    ),
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 18),
            BuyerFact(
              icon: Icons.location_on_outlined,
              label: textValue(
                object(account!['profile'])['city'],
                'Add your city',
              ),
            ),
            const SizedBox(height: 10),
            BuyerFact(
              icon: Icons.phone_outlined,
              label: textValue(
                object(account!['profile'])['phone'],
                'Add a contact phone',
              ),
            ),
            const SizedBox(height: 17),
            OutlinedButton(
              onPressed: mutating
                  ? null
                  : () async {
                      final values = await Navigator.push<(String, String)>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ProfileEditScreen(
                            profile: object(account!['profile']),
                            repository: widget.repository,
                          ),
                        ),
                      );
                      if (values != null && mounted) {
                        await mutate(
                          () => widget.repository.updateProfile(
                            values.$1,
                            values.$2,
                          ),
                        );
                      }
                    },
              child: const Text('Edit city and phone'),
            ),
          ],
        ),
      ),
    ],
    const BuyerSectionLabel('Make yourself at home'),
    BuyerSurface(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        children: [
          ListTile(
            title: const Text('Messages'),
            leading: const Icon(Icons.forum_outlined),
            onTap: () => changeTab(5),
          ),
          ListTile(
            title: const Text('Membership & contact credits'),
            leading: const Icon(Icons.workspace_premium_outlined),
            onTap: () => Navigator.push<void>(
              context,
              MaterialPageRoute(
                builder: (_) => MembershipScreen(repository: widget.repository),
              ),
            ),
          ),
          ListTile(
            title: const Text('My role workspace & notifications'),
            leading: const Icon(Icons.work_outline),
            onTap: () async {
              await Navigator.push<void>(
                context,
                MaterialPageRoute(
                  builder: (_) =>
                      WorkspaceScreen(repository: widget.repository),
                ),
              );
              if (mounted && verified) {
                try {
                  await refreshAccount();
                } catch (_) {
                  message('Refresh your account to load server changes.');
                }
              }
            },
          ),
          ListTile(
            title: const Text('Saved & Shortlists'),
            leading: const Icon(Icons.favorite_border),
            onTap: () => changeTab(2),
          ),
          ListTile(
            title: const Text('My Enquiries'),
            leading: const Icon(Icons.chat_bubble_outline),
            onTap: () => changeTab(3),
          ),
          ListTile(
            title: const Text('Compare properties'),
            leading: const Icon(Icons.compare_arrows),
            onTap: showCompare,
          ),
          const Divider(indent: 20, endIndent: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Appearance',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<ThemeMode>(
                  initialValue: widget.themeMode,
                  decoration: const InputDecoration(labelText: 'App theme'),
                  items: [
                    for (final mode in ThemeMode.values)
                      DropdownMenuItem(value: mode, child: Text(mode.name)),
                  ],
                  onChanged: (value) {
                    if (value != null) widget.onThemeChanged?.call(value);
                  },
                ),
                const SizedBox(height: 8),
                Text(
                  'Follows your choice for this app launch.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          ListTile(
            title: const Text('Help, privacy & account deletion'),
            leading: const Icon(Icons.help_outline),
            onTap: () => showDialog<void>(
              context: context,
              builder: (context) => AlertDialog(
                scrollable: true,
                title: const Text('Account information'),
                content: const Text(
                  'Session credentials use device-protected storage when available; reopening still requires server verification. Appearance follows your device settings. '
                  'External maps can open listed coordinates on supported Android devices; device location and calls are not enabled. Website payment controls may require a separate browser sign-in. '
                  'Creating an account does not verify email ownership. Account deletion and refund review requests can be recorded from My Workspace. Actual deletion, retention and refund execution require approved policies and provider operations. '
                  'Signing out clears this app’s local state and attempts server revocation. A network failure leaves revocation uncertain.',
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
    const SizedBox(height: 24),
    FilledButton(
      onPressed: mutating || !verified ? null : signOut,
      child: const Text('Sign out'),
    ),
    TextButton(
      onPressed: () {
        widget.repository.session.clearLocalSession();
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/buyer-preview',
          (_) => false,
        );
      },
      child: const Text('Leave account and explore offline preview'),
    ),
  ];
  void showCompare() => Navigator.push<void>(
    context,
    MaterialPageRoute(
      builder: (_) => ComparisonScreen(
        properties: List.of(compare.values),
        onRemove: (id) {
          if (mounted) setState(() => compare.remove(id));
        },
        repository: widget.repository,
      ),
    ),
  );
  void _returnToProfile() {
    if (tab != 3) return;
    setState(() {
      revision++;
      accountEpoch++;
      collectionPending.clear();
      tab = 4;
      loading = false;
      _loadingMore = false;
      error = null;
    });
    requestListingRefresh();
    if (account == null && verified) load();
  }

  void changeTab(int value) {
    if (mutating || (loading && value != 5)) return;
    setState(() {
      if (value == 5) {
        // Opening the inbox must not wait for an unrelated catalogue read.
        // Existing generation/epoch guards discard those late responses.
        revision++;
        accountEpoch++;
        collectionPending.clear();
        loading = false;
        _loadingMore = false;
      }
      tab = value;
      error = null;
    });
    requestListingRefresh();
    if (value != 5) load();
  }

  @override
  Widget build(BuildContext context) {
    if (tab == 5 && verified) {
      return ConversationListScreen(
        key: ValueKey(
          'buyer-messages:${widget.repository.session.identity!.id}:${widget.repository.coordinator.generation}',
        ),
        repository: widget.repository,
        bottomNavigationBar: _bottomNavigation(),
      );
    }
    final page = _marketplaceScaffold();
    if (tab != 3) return page;
    // Enquiries remain a Profile subsection, with both app-bar and system Back.
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _returnToProfile();
      },
      child: page,
    );
  }

  Widget _marketplaceScaffold() => Scaffold(
    appBar: AppBar(
      leading: tab == 3 ? BackButton(onPressed: _returnToProfile) : null,
      toolbarHeight: 76,
      titleSpacing: 20,
      title: tab == 0
          ? const Text(
              'HOMEZONE',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            )
          : Text(
              switch (tab) {
                1 => 'Search',
                2 => 'Saved',
                3 => 'Enquiries',
                5 => 'Messages',
                _ => 'Profile',
              },
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
            ),
      actions: [
        if (MediaQuery.textScalerOf(context).scale(1) < 1.4)
          IconButton(
            tooltip: 'Compare selected properties',
            onPressed: showCompare,
            icon: Badge(
              isLabelVisible: compare.isNotEmpty,
              label: Text('${compare.length}'),
              child: const Icon(Icons.compare_arrows),
            ),
          ),
        if (tab != 0)
          IconButton(
            tooltip: 'Refresh',
            onPressed: loading || mutating ? null : () => load(),
            icon: const Icon(Icons.refresh),
          ),
        if (MediaQuery.textScalerOf(context).scale(1) < 1.4)
          IconButton(
            tooltip: 'My profile',
            onPressed: loading || mutating ? null : () => changeTab(4),
            icon: const Icon(Icons.account_circle_outlined),
          )
        else
          PopupMenuButton<String>(
            tooltip: 'More options',
            onSelected: (value) {
              if (value == 'compare') {
                showCompare();
              } else {
                changeTab(4);
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'compare',
                child: Text('Compare selected properties'),
              ),
              PopupMenuItem(
                value: 'profile',
                enabled: !loading && !mutating,
                child: const Text('My profile'),
              ),
            ],
          ),
        const SizedBox(width: 8),
      ],
    ),
    body: RefreshIndicator.noSpinner(
      onRefresh: () => load(),
      child: ListView(
        key: PageStorageKey('marketplace-$tab'),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          if (tab < 2 && _catalogRefreshError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('Live updates paused. $_catalogRefreshError'),
            ),
          if (tab >= 2 && !verified) ...[
            empty(
              'Sign in to access your account. Offline preview data is separate.',
            ),
            FilledButton(
              onPressed: () => Navigator.pushNamedAndRemoveUntil(
                context,
                '/sign-in',
                (_) => false,
              ),
              child: const Text('Sign in'),
            ),
          ] else if (loading && tab >= 2 && account == null)
            LoadingSkeleton(
              layout: tab == 4 ? SkeletonLayout.profile : SkeletonLayout.rows,
              itemCount: 3,
              label: switch (tab) {
                2 => 'Loading saved properties and shortlists',
                3 => 'Loading enquiries',
                _ => 'Loading profile',
              },
            )
          else ...[
            if (loading && tab >= 2)
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Shimmer(
                  label: 'Refreshing account information',
                  child: SkeletonLine(widthFactor: .45),
                ),
              ),
            ...switch (tab) {
              0 || 1 => browsing(),
              2 => collections(),
              3 => enquiries(),
              _ => profile(),
            },
          ],
          if (mutating) const LinearProgressIndicator(),
          if (error != null) ...[
            BuyerEmptyState(
              title: 'Let’s try that again.',
              message: error!,
              icon: Icons.wifi_off_rounded,
              action: OutlinedButton.icon(
                onPressed: loading ? null : () => load(),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry'),
              ),
            ),
          ],
        ],
      ),
    ),
    bottomNavigationBar: _bottomNavigation(),
  );

  Widget _bottomNavigation() => NavigationBarTheme(
    data: NavigationBarThemeData(
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLowest,
      indicatorColor: Theme.of(
        context,
      ).colorScheme.primary.withValues(alpha: .1),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 11,
          height: 1.2,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w700
              : FontWeight.w500,
          color: states.contains(WidgetState.selected)
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    ),
    child: NavigationBar(
      height: MediaQuery.textScalerOf(context).scale(1) > 1.4 ? 92 : 76,
      labelBehavior: MediaQuery.textScalerOf(context).scale(1) > 1.4
          ? NavigationDestinationLabelBehavior.onlyShowSelected
          : NavigationDestinationLabelBehavior.alwaysShow,
      selectedIndex: tab == 5
          ? 3
          : tab == 3
          ? 4
          : tab,
      onDestinationSelected: (index) => changeTab(index == 3 ? 5 : index),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home_rounded),
          label: 'Home',
        ),
        NavigationDestination(
          icon: Icon(Icons.search),
          selectedIcon: Icon(Icons.manage_search_rounded),
          label: 'Search',
        ),
        NavigationDestination(
          icon: Icon(Icons.favorite_border),
          selectedIcon: Icon(Icons.favorite_rounded),
          label: 'Saved',
        ),
        NavigationDestination(
          icon: Icon(Icons.forum_outlined),
          selectedIcon: Icon(Icons.forum_rounded),
          label: 'Messages',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person_rounded),
          label: 'Profile',
        ),
      ],
    ),
  );
}

class ListingImage extends StatefulWidget {
  const ListingImage({super.key, this.url, this.height = 250});
  final String? url;
  final double height;
  @override
  State<ListingImage> createState() => _ListingImageState();
}

class _ListingImageState extends State<ListingImage> {
  Future<Uint8List>? bytes;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void didUpdateWidget(ListingImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) load();
  }

  void load() {
    const configured = String.fromEnvironment('HOMEZONE_IMAGE_HOSTS');
    bytes = ListingMedia.allowed(widget.url ?? '', configured)
        ? ListingMedia.load(widget.url!, configured)
        : null;
  }

  @override
  Widget build(BuildContext context) {
    Widget fallback() => Container(
      height: widget.height,
      width: double.infinity,
      color: Theme.of(context).colorScheme.primary.withValues(alpha: .06),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.other_houses_outlined,
              size: 49,
              color: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: .5),
            ),
            const SizedBox(height: 12),
            Text(
              'Image unavailable',
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
    if (bytes == null) return fallback();
    return FutureBuilder<Uint8List>(
      future: bytes,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Shimmer(
            label: 'Loading property photograph',
            child: SkeletonBox(
              height: widget.height,
              width: double.infinity,
              borderRadius: 0,
            ),
          );
        }
        if (snapshot.hasError) return fallback();
        if (!snapshot.hasData) return fallback();
        return Image.memory(
          snapshot.data!,
          height: widget.height,
          width: double.infinity,
          fit: BoxFit.cover,
          semanticLabel: 'Property photograph',
          cacheWidth: 1200,
          errorBuilder: (_, _, _) => fallback(),
        );
      },
    );
  }
}

class LivePropertyScreen extends StatefulWidget {
  const LivePropertyScreen({
    super.key,
    required this.id,
    required this.repository,
    required this.saved,
    required this.onSave,
    this.onOpenListing,
    this.favoriteReady,
    this.onFavoriteRefresh,
  });
  final String id;
  final MarketplaceRepository repository;
  final bool Function() saved;
  final Future<void> Function() onSave;
  final Future<void> Function(Listing)? onOpenListing;
  final bool Function()? favoriteReady;
  final VoidCallback? onFavoriteRefresh;
  @override
  State<LivePropertyScreen> createState() => _LivePropertyScreenState();
}

class _LivePropertyScreenState extends State<LivePropertyScreen>
    with _ForegroundListingRefresh<LivePropertyScreen> {
  late Future<Listing> result;
  Future<ListingPage>? related;
  bool saving = false;
  bool _reading = false;
  bool _unavailable = false;
  int _detailEpoch = 0;
  Listing? _liveProperty;
  Object? _detailRefreshError;
  @override
  MarketplaceRepository get listingRefreshRepository => widget.repository;
  @override
  bool get canRefreshListingData => !_reading && !saving && !_unavailable;

  @override
  Future<void> refreshListingData() async {
    final request = ++_detailEpoch;
    final id = widget.id;
    final repository = widget.repository;
    final generation = repository.coordinator.generation;
    final listingChange = repository.listingChanges.value;
    bool current() =>
        listingRefreshVisible &&
        request == _detailEpoch &&
        widget.id == id &&
        identical(widget.repository, repository) &&
        generation == repository.coordinator.generation &&
        listingChange == repository.listingChanges.value;
    try {
      // Timed reads must not repeat view/history writes or related-list requests.
      final next = await repository.detail(id);
      if (current()) {
        setState(() {
          _liveProperty = next;
          _detailRefreshError = null;
        });
      }
    } catch (failure) {
      if (current()) {
        setState(() {
          _detailRefreshError = failure;
          if (_listingUnavailable(failure)) {
            _unavailable = true;
            _liveProperty = null;
            related = null;
          }
        });
      }
      rethrow;
    }
  }

  @override
  void initState() {
    super.initState();
    result = readProperty();
  }

  @override
  void didUpdateWidget(LivePropertyScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.id != widget.id ||
        !identical(oldWidget.repository, widget.repository)) {
      related = null;
      _liveProperty = null;
      _detailRefreshError = null;
      _unavailable = false;
      result = readProperty();
    }
  }

  Future<Listing> readProperty() async {
    final request = ++_detailEpoch;
    final id = widget.id;
    final repository = widget.repository;
    final generation = repository.coordinator.generation;
    final listingChange = repository.listingChanges.value;
    _reading = true;
    late final Listing property;
    try {
      property = await repository.detail(id);
    } finally {
      if (request == _detailEpoch) _reading = false;
    }
    if (mounted &&
        request == _detailEpoch &&
        widget.id == id &&
        identical(widget.repository, repository) &&
        generation == repository.coordinator.generation &&
        listingChange == repository.listingChanges.value) {
      _liveProperty = property;
      _detailRefreshError = null;
      _unavailable = false;
      related = widget.repository.listings({
        if (property.data['city'] is String)
          'city': property.data['city'] as String,
        if (property.data['category'] is String)
          'category': property.data['category'] as String,
      }, 1);
      // Consume errors immediately, even if navigation removes this FutureBuilder.
      related!.then<void>((_) {}, onError: (Object _) {});
      if (widget.repository.session.verified) {
        widget.repository
            .call('POST', '/api/properties/${property.id}/view')
            .then<void>((_) {}, onError: (Object _) {});
      }
    }
    return property;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text(
        'Property details',
        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
      ),
    ),
    body: FutureBuilder<Listing>(
      future: result,
      builder: (context, snapshot) {
        final displayed = _unavailable ? null : _liveProperty;
        if (displayed == null &&
            !_unavailable &&
            snapshot.connectionState != ConnectionState.done) {
          return const LoadingSkeleton(
            layout: SkeletonLayout.detail,
            padding: EdgeInsets.fromLTRB(20, 8, 20, 32),
            scrollable: true,
            label: 'Loading property details',
          );
        }
        if (_unavailable || (snapshot.hasError && displayed == null)) {
          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: BuyerEmptyState(
                title: 'This home couldn’t be opened.',
                message: marketplaceError(
                  _detailRefreshError ?? snapshot.error!,
                ),
                icon: Icons.home_work_outlined,
                action: OutlinedButton.icon(
                  onPressed: () => setState(() {
                    _unavailable = false;
                    _liveProperty = null;
                    _detailRefreshError = null;
                    result = readProperty();
                  }),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                ),
              ),
            ),
          );
        }
        if (displayed == null) {
          return const LoadingSkeleton(
            layout: SkeletonLayout.detail,
            padding: EdgeInsets.fromLTRB(20, 8, 20, 32),
            scrollable: true,
            label: 'Loading property details',
          );
        }
        final property = displayed;
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            if (_detailRefreshError != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  'Showing the last confirmed listing. ${marketplaceError(_detailRefreshError!)}',
                ),
              ),
            InkWell(
              onTap: () => Navigator.push<void>(
                context,
                MaterialPageRoute(
                  builder: (_) => LiveGalleryScreen(
                    property: property,
                    repository: widget.repository,
                  ),
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Stack(
                  children: [
                    ListingImage(url: property.images.firstOrNull, height: 280),
                    Positioned(
                      bottom: 14,
                      right: 14,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: BrandColors.forest,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.photo_library_outlined,
                              size: 16,
                              color: Colors.white,
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Photo gallery',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 22),
            BuyerSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (property.data['intent'] != null) ...[
                    Text(
                      buyerReadableValue(property.data['intent']).toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 9),
                  ],
                  Text(
                    buyerPrice(property.data),
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontSize: 29,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.8,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    property.title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontSize: 21,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 10),
                  BuyerFact(
                    icon: Icons.location_on_outlined,
                    label: property.location.isEmpty
                        ? 'Location not provided'
                        : property.location,
                  ),
                ],
              ),
            ),
            const BuyerSectionLabel('At a glance'),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final key in [
                  'category',
                  'propertyType',
                  'bedrooms',
                  'bathrooms',
                  'areaValue',
                  'areaUnit',
                ])
                  if (property.data[key] != null)
                    Chip(
                      backgroundColor: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerLowest,
                      side: BorderSide(
                        color: Theme.of(context).colorScheme.outlineVariant,
                      ),
                      label: Text(
                        '${switch (key) {
                          'propertyType' => 'Property type',
                          'areaValue' => 'Area',
                          'areaUnit' => 'Area unit',
                          _ => buyerReadableValue(key),
                        }}: ${buyerReadableValue(property.fact(key))}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
              ],
            ),
            const BuyerSectionLabel('About this place'),
            BuyerSurface(
              child: Text(
                textValue(
                  property.data['description'],
                  'No description provided.',
                ),
                style: TextStyle(
                  fontSize: 14,
                  height: 1.7,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            if (property.data['amenities'] is List) ...[
              const BuyerSectionLabel('Listed amenities'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final amenity
                      in (property.data['amenities'] as List)
                          .whereType<String>())
                    Chip(
                      avatar: const Icon(Icons.check_rounded, size: 16),
                      label: Text(
                        buyerReadableValue(amenity),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                ],
              ),
            ],
            const BuyerSectionLabel('Make your next move'),
            TextButton.icon(
              onPressed: saving || !(widget.favoriteReady?.call() ?? true)
                  ? null
                  : () async {
                      setState(() => saving = true);
                      await widget.onSave();
                      if (mounted) setState(() => saving = false);
                    },
              icon: Icon(
                widget.saved() ? Icons.favorite : Icons.favorite_border,
              ),
              label: Text(
                !(widget.favoriteReady?.call() ?? true)
                    ? 'Saved status unavailable'
                    : widget.saved()
                    ? 'Saved'
                    : 'Save property',
              ),
            ),
            if (!(widget.favoriteReady?.call() ?? true))
              TextButton(
                onPressed: widget.onFavoriteRefresh,
                child: const Text('Retry saved status'),
              ),
            OutlinedButton(
              onPressed: () => Navigator.push<void>(
                context,
                MaterialPageRoute(
                  builder: (_) => LiveGalleryScreen(
                    property: property,
                    repository: widget.repository,
                  ),
                ),
              ),
              child: const Text('View photos'),
            ),
            PublicListingMediaButton(
              url: property.data['videoUrl'] as String?,
              label: 'Property video',
            ),
            PublicListingMediaButton(
              url: property.data['virtualTourUrl'] as String?,
              label: 'Virtual tour',
            ),
            const Text(
              'Floor plans are not available in this build. Listing information and public links are supplied by the service.',
            ),
            if (property.data['latitude'] != null &&
                property.data['longitude'] != null)
              SelectableText(
                'Listed coordinates: ${property.data['latitude']}, ${property.data['longitude']}',
              ),
            if (property.data['latitude'] != null &&
                property.data['longitude'] != null)
              OutlinedButton.icon(
                onPressed: () async {
                  final approved = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      scrollable: true,
                      title: const Text('Open external maps?'),
                      content: const Text(
                        'The listing coordinates will be passed to your installed map application. No device location is requested.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Open maps'),
                        ),
                      ],
                    ),
                  );
                  if (approved != true || !mounted) {
                    return;
                  }
                  final opened = await ListingLocation.open(
                    property.data['latitude'],
                    property.data['longitude'],
                  );
                  if (!opened && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'No supported map application is available. You can copy the listed coordinates.',
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.map_outlined),
                label: const Text('Open listed location'),
              ),
            FilledButton(
              onPressed: !widget.repository.session.verified
                  ? null
                  : () => Navigator.push<void>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => EnquiryForm(
                          property: property,
                          repository: widget.repository,
                        ),
                      ),
                    ),
              child: const Text('Enquire about this property'),
            ),
            PropertyContactActions(
              key: ValueKey(
                'contact-actions-${property.id}-${widget.repository.coordinator.generation}',
              ),
              repository: widget.repository,
              propertyId: property.id,
            ),
            if (!widget.repository.session.verified)
              const Text('Sign in to submit an enquiry.'),
            if (related != null && widget.onOpenListing != null)
              FutureBuilder<ListingPage>(
                future: related,
                builder: (context, snapshot) {
                  if (snapshot.hasError)
                    return const Text('Related listings are unavailable.');
                  if (!snapshot.hasData)
                    return const LoadingSkeleton(
                      layout: SkeletonLayout.rows,
                      itemCount: 2,
                      padding: EdgeInsets.symmetric(vertical: 16),
                      label: 'Loading related properties',
                    );
                  final rows = snapshot.data!.items
                      .where((item) => item.id != property.id)
                      .take(4)
                      .toList();
                  if (rows.isEmpty)
                    return const Text(
                      'No other published listings match this area and category.',
                    );
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'More in this area',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      for (final item in rows)
                        Card(
                          child: ListTile(
                            title: Text(item.title),
                            subtitle: Text('${item.price}\n${item.location}'),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => widget.onOpenListing!(item),
                          ),
                        ),
                    ],
                  );
                },
              ),
          ],
        );
      },
    ),
  );
}

class LiveGalleryScreen extends StatefulWidget {
  const LiveGalleryScreen({super.key, required this.property, this.repository});
  final Listing property;
  final MarketplaceRepository? repository;
  @override
  State<LiveGalleryScreen> createState() => _LiveGalleryScreenState();
}

class _LiveGalleryScreenState extends State<LiveGalleryScreen>
    with _ForegroundListingRefresh<LiveGalleryScreen> {
  late Listing _property;
  Object? _error;
  bool _unavailable = false;
  int _epoch = 0;
  @override
  MarketplaceRepository? get listingRefreshRepository => widget.repository;
  @override
  bool get canRefreshListingData => !_unavailable;

  @override
  void initState() {
    super.initState();
    _property = widget.property;
  }

  @override
  void didUpdateWidget(LiveGalleryScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.property.id != widget.property.id ||
        !identical(oldWidget.repository, widget.repository)) {
      _epoch++;
      _property = widget.property;
      _error = null;
      _unavailable = false;
    }
  }

  @override
  Future<void> refreshListingData() async {
    final repository = widget.repository;
    if (repository == null) return;
    final id = widget.property.id;
    final request = ++_epoch;
    final generation = repository.coordinator.generation;
    final listingChange = repository.listingChanges.value;
    bool current() =>
        listingRefreshVisible &&
        request == _epoch &&
        id == widget.property.id &&
        identical(repository, widget.repository) &&
        generation == repository.coordinator.generation &&
        listingChange == repository.listingChanges.value;
    try {
      final next = await repository.detail(id);
      if (current()) {
        setState(() {
          _property = next;
          _error = null;
        });
      }
    } catch (failure) {
      if (current()) {
        setState(() {
          _error = failure;
          _unavailable = _listingUnavailable(failure);
        });
      }
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(_property.title)),
    body: _unavailable
        ? Center(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: BuyerEmptyState(
                title: 'This listing is no longer available.',
                message: marketplaceError(_error!),
                icon: Icons.home_work_outlined,
              ),
            ),
          )
        : _property.images.isEmpty && _error == null
        ? const Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(20),
              child: BuyerEmptyState(
                title: 'A closer look, soon.',
                message: 'No photographs are available.',
                icon: Icons.photo_library_outlined,
              ),
            ),
          )
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    'Showing the last confirmed photographs. ${marketplaceError(_error!)}',
                  ),
                ),
              if (_property.images.isEmpty)
                const Text(
                  'No photographs were available at the last successful refresh.',
                ),
              for (final url in _property.images)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: InteractiveViewer(
                      minScale: 1,
                      maxScale: 4,
                      child: ListingImage(url: url, height: 320),
                    ),
                  ),
                ),
            ],
          ),
  );
}

class EnquiryForm extends StatefulWidget {
  const EnquiryForm({
    super.key,
    required this.property,
    required this.repository,
  });
  final Listing property;
  final MarketplaceRepository repository;
  @override
  State<EnquiryForm> createState() => _EnquiryFormState();
}

class _EnquiryFormState extends State<EnquiryForm> {
  late final MarketplaceRepository _repository;
  late final String? _actor, _role;
  late final int _generation;
  late final String _propertyId;
  bool get current =>
      mounted &&
      identical(widget.repository, _repository) &&
      widget.property.id == _propertyId &&
      _actor != null &&
      _repository.session.verified &&
      _repository.session.identity?.id == _actor &&
      _repository.session.identity?.role == _role &&
      _repository.coordinator.generation == _generation;
  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      phone = TextEditingController(),
      message = TextEditingController();
  bool sending = false, sent = false;
  bool _uncertain = false;
  String? error;
  @override
  void initState() {
    super.initState();
    _repository = widget.repository;
    _actor = _repository.session.identity?.id;
    _role = _repository.session.identity?.role;
    _generation = _repository.coordinator.generation;
    _propertyId = widget.property.id;
    _repository.session.addListener(_sessionChanged);
  }

  void _sessionChanged() {
    if (!current) {
      name.clear();
      phone.clear();
      message.clear();
    }
  }

  @override
  void dispose() {
    _repository.session.removeListener(_sessionChanged);
    name.dispose();
    phone.dispose();
    message.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!current ||
        sending ||
        sent ||
        _uncertain ||
        !(form.currentState?.validate() ?? false)) {
      return;
    }
    setState(() {
      sending = true;
      error = null;
    });
    try {
      await _repository.enquire(
        _propertyId,
        name.text,
        phone.text,
        message.text,
      );
      if (current) {
        setState(() => sent = true);
      }
    } catch (failure) {
      if (current) {
        setState(() {
          _uncertain =
              failure is! ApiException ||
              !const {
                ApiFailure.validation,
                ApiFailure.forbidden,
                ApiFailure.unauthorized,
                ApiFailure.notFound,
                ApiFailure.rateLimited,
              }.contains(failure.failure);
          error = _uncertain
              ? 'Your enquiry may have been submitted, but confirmation was not received. Go back and check My Enquiries before sending it again.'
              : marketplaceError(failure, mutation: true);
        });
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Property enquiry')),
    body: AnimatedBuilder(
      animation: widget.repository.session,
      builder: (context, _) => !current
          ? const Center(
              child: Text(
                'Your account or session changed. Reopen this listing to start a new enquiry.',
              ),
            )
          : Form(
              key: form,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Text(
                    widget.property.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Text(
                    'Submitting sends your name, phone number and message to HOMEZONE for this listing. No booking or payment is made.',
                  ),
                  if (sent)
                    const Text(
                      'The server confirmed your enquiry. View it in My Enquiries.',
                    )
                  else ...[
                    TextFormField(
                      controller: name,
                      enabled: !sending && !_uncertain,
                      maxLength: 120,
                      decoration: const InputDecoration(labelText: 'Name'),
                      validator: (value) => (value?.trim().length ?? 0) < 2
                          ? 'Enter your name.'
                          : null,
                    ),
                    TextFormField(
                      controller: phone,
                      enabled: !sending && !_uncertain,
                      maxLength: 32,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone number',
                      ),
                      validator: (value) =>
                          RegExp(
                            r'^\+?[0-9\s().-]{8,32}$',
                          ).hasMatch(value?.trim() ?? '')
                          ? null
                          : 'Enter a valid phone number.',
                    ),
                    TextFormField(
                      controller: message,
                      enabled: !sending && !_uncertain,
                      maxLength: 1000,
                      minLines: 3,
                      maxLines: 6,
                      decoration: const InputDecoration(labelText: 'Message'),
                      validator: (value) => (value?.trim().length ?? 0) < 2
                          ? 'Enter a message.'
                          : null,
                    ),
                    if (error != null) Text(error!),
                    FilledButton(
                      onPressed: sending || _uncertain ? null : submit,
                      child: Text(sending ? 'Submitting…' : 'Submit enquiry'),
                    ),
                    if (_uncertain)
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Back to listing'),
                      ),
                  ],
                ],
              ),
            ),
    ),
  );
}

class ComparisonScreen extends StatefulWidget {
  const ComparisonScreen({
    super.key,
    required this.properties,
    required this.onRemove,
    required this.repository,
  });
  final List<Listing> properties;
  final void Function(String) onRemove;
  final MarketplaceRepository repository;
  @override
  State<ComparisonScreen> createState() => _ComparisonScreenState();
}

class _ComparisonScreenState extends State<ComparisonScreen> {
  late final items = List<Listing>.of(widget.properties);
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Compare properties')),
    body: AnimatedBuilder(
      animation: widget.repository.session,
      builder: (context, _) => !widget.repository.session.verified
          ? const Center(
              child: Text(
                'Your session ended. Comparison selection was cleared.',
              ),
            )
          : items.isEmpty
          ? const Center(
              child: Text('Select up to four properties while browsing.'),
            )
          : SingleChildScrollView(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final property in items)
                      SizedBox(
                        width: 240,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(property.title),
                              Text(property.price),
                              Text(property.location),
                              for (final key in [
                                'propertyType',
                                'intent',
                                'areaValue',
                                'areaUnit',
                                'bedrooms',
                                'bathrooms',
                              ])
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 8,
                                  ),
                                  child: Text('$key: ${property.fact(key)}'),
                                ),
                              TextButton(
                                onPressed: () {
                                  widget.onRemove(property.id);
                                  setState(() => items.remove(property));
                                },
                                child: const Text('Remove'),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    ),
  );
}

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({
    super.key,
    required this.profile,
    required this.repository,
  });
  final JsonObject profile;
  final MarketplaceRepository repository;
  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  late final actor = widget.repository.session.identity?.id;
  late final role = widget.repository.session.identity?.role;
  late final generation = widget.repository.coordinator.generation;
  bool get current =>
      mounted &&
      widget.repository.session.verified &&
      widget.repository.session.identity?.id == actor &&
      widget.repository.session.identity?.role == role &&
      widget.repository.coordinator.generation == generation;
  late final city = TextEditingController(
    text: textValue(widget.profile['city'], ''),
  );
  late final phone = TextEditingController(
    text: textValue(widget.profile['phone'], ''),
  );
  final form = GlobalKey<FormState>();
  @override
  void dispose() {
    city.dispose();
    phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Edit profile')),
    body: AnimatedBuilder(
      animation: widget.repository.session,
      builder: (context, _) => !current
          ? const Center(
              child: Text(
                'Your session ended. Sign in again to edit your profile.',
              ),
            )
          : Form(
              key: form,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const Text(
                    'The server must acknowledge changes. Updating phone clears its verification status.',
                  ),
                  TextFormField(
                    controller: city,
                    maxLength: 120,
                    decoration: const InputDecoration(labelText: 'City'),
                    validator: (value) => (value?.trim().length ?? 0) < 2
                        ? 'Enter a city.'
                        : null,
                  ),
                  TextFormField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    maxLength: 32,
                    decoration: const InputDecoration(labelText: 'Phone'),
                    validator: (value) =>
                        RegExp(
                          r'^\+?[0-9\s().-]{8,32}$',
                        ).hasMatch(value?.trim() ?? '')
                        ? null
                        : 'Enter a valid phone number.',
                  ),
                  FilledButton(
                    onPressed: () {
                      if (current && form.currentState?.validate() == true) {
                        Navigator.pop(context, (city.text, phone.text));
                      }
                    },
                    child: const Text('Save changes'),
                  ),
                ],
              ),
            ),
    ),
  );
}

class LiveFilterSheet extends StatefulWidget {
  const LiveFilterSheet({super.key, required this.initial});
  final Map<String, String> initial;
  @override
  State<LiveFilterSheet> createState() => _LiveFilterSheetState();
}

class _LiveFilterSheetState extends State<LiveFilterSheet> {
  late final draft = Map<String, String>.of(widget.initial);
  late final city = TextEditingController(text: draft['city']);
  late final budget = TextEditingController(text: draft['maxPrice']);
  final form = GlobalKey<FormState>();
  int resets = 0;
  @override
  void dispose() {
    city.dispose();
    budget.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Form(
    key: form,
    child: SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Filters', style: Theme.of(context).textTheme.titleLarge),
          DropdownButtonFormField<String>(
            key: ValueKey('purpose-$resets'),
            initialValue: draft['purpose'] ?? '',
            decoration: const InputDecoration(labelText: 'Purpose'),
            items: [
              for (final value in ['', 'BUY', 'RENT', 'LEASE', 'INVEST'])
                DropdownMenuItem(
                  value: value,
                  child: Text(value.isEmpty ? 'Any purpose' : value),
                ),
            ],
            onChanged: (value) {
              if ((draft['purpose'] ?? '') != value) {
                budget.clear();
                draft.remove('maxPrice');
                draft.remove('minPrice');
              }
              if (value == '') {
                draft.remove('purpose');
              } else {
                draft['purpose'] = value!;
              }
            },
          ),
          DropdownButtonFormField<String>(
            key: ValueKey('category-$resets'),
            initialValue: draft['category'] ?? '',
            decoration: const InputDecoration(labelText: 'Property category'),
            items: [
              for (final value in [
                '',
                'RESIDENTIAL',
                'LAND',
                'COMMERCIAL',
                'INDUSTRIAL',
                'AGRICULTURAL',
                'HOSPITALITY',
                'LUXURY',
              ])
                DropdownMenuItem(
                  value: value,
                  child: Text(value.isEmpty ? 'All categories' : value),
                ),
            ],
            onChanged: (value) {
              if (value == '') {
                draft.remove('category');
              } else {
                draft['category'] = value!;
              }
            },
          ),
          TextFormField(
            controller: city,
            maxLength: 120,
            decoration: const InputDecoration(labelText: 'City'),
          ),
          DropdownButtonFormField<String>(
            key: ValueKey('currency-$resets'),
            initialValue: draft['currency'] ?? '',
            decoration: const InputDecoration(labelText: 'Currency'),
            items: [
              for (final value in ['', 'INR', 'AED', 'USD', 'GBP', 'EUR'])
                DropdownMenuItem(
                  value: value,
                  child: Text(value.isEmpty ? 'Any currency' : value),
                ),
            ],
            onChanged: (value) {
              if ((draft['currency'] ?? '') != value) {
                budget.clear();
                draft.remove('maxPrice');
                draft.remove('minPrice');
              }
              if (value == '') {
                draft.remove('currency');
              } else {
                draft['currency'] = value!;
              }
            },
          ),
          TextFormField(
            controller: budget,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Maximum price in listing currency',
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) return null;
              if (draft['currency'] == null || draft['purpose'] == null) {
                return 'Select a currency and purpose first.';
              }
              return double.tryParse(value)?.isFinite == true &&
                      double.parse(value) > 0
                  ? null
                  : 'Enter a positive amount.';
            },
          ),
          const Text(
            'Rent uses monthly amounts; Buy uses totals. Currency conversion is not available.',
          ),
          DropdownButtonFormField<String>(
            key: ValueKey('bedrooms-$resets'),
            initialValue: draft['bedrooms'] ?? '',
            decoration: const InputDecoration(labelText: 'Bedrooms'),
            items: [
              for (final value in ['', '1', '2', '3', '4', '5'])
                DropdownMenuItem(
                  value: value,
                  child: Text(value.isEmpty ? 'Any bedrooms' : value),
                ),
            ],
            onChanged: (value) {
              if (value == '') {
                draft.remove('bedrooms');
              } else {
                draft['bedrooms'] = value!;
              }
            },
          ),
          const Text(
            'Furnishing is not provided by the backend schema, so this filter is available only in the offline preview.',
          ),
          Wrap(
            spacing: 12,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  final retained = {
                    for (final key in ['keyword', 'sort'])
                      if (draft[key] != null) key: draft[key]!,
                  };
                  setState(() {
                    draft
                      ..clear()
                      ..addAll(retained);
                    city.clear();
                    budget.clear();
                    resets++;
                  });
                },
                child: const Text('Reset'),
              ),
              FilledButton(
                onPressed: () {
                  if (!form.currentState!.validate()) return;
                  if (city.text.trim().isEmpty) {
                    draft.remove('city');
                  } else {
                    draft['city'] = city.text.trim();
                  }
                  if (budget.text.trim().isEmpty) {
                    draft.remove('maxPrice');
                  } else {
                    draft['maxPrice'] = budget.text.trim();
                  }
                  Navigator.pop(context, draft);
                },
                child: const Text('Apply'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _ShortlistNameDialog extends StatefulWidget {
  const _ShortlistNameDialog({required this.title, required this.initial});
  final String title, initial;
  @override
  State<_ShortlistNameDialog> createState() => _ShortlistNameDialogState();
}

class _ShortlistNameDialogState extends State<_ShortlistNameDialog> {
  late final controller = TextEditingController(text: widget.initial);
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    scrollable: true,
    title: Text(widget.title),
    content: TextField(
      controller: controller,
      autofocus: true,
      maxLength: 80,
      decoration: const InputDecoration(labelText: 'Name (2–80 characters)'),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () {
          final name = controller.text.trim();
          if (name.length >= 2) Navigator.pop(context, name);
        },
        child: const Text('Save'),
      ),
    ],
  );
}
