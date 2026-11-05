import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../core/api/api_client.dart';
import '../../shared/ui/loading_skeleton.dart';
import '../marketplace/marketplace_repository.dart';
import '../marketplace/marketplace_screen.dart' show ListingImage;

/// A read-only gallery of server-confirmed photographs for an owned listing.
/// Image fetching retains ListingImage's exact-host, HTTPS and cookie isolation.
class OwnerPropertyPhotos extends StatefulWidget {
  const OwnerPropertyPhotos({
    super.key,
    required this.repository,
    required this.id,
    this.clock,
  });

  final MarketplaceRepository repository;
  final String id;
  final DateTime Function()? clock;

  @override
  State<OwnerPropertyPhotos> createState() => _OwnerPropertyPhotosState();
}

class _OwnerPropertyPhotosState extends State<OwnerPropertyPhotos>
    with WidgetsBindingObserver, RouteAware {
  String? _actor;
  int? _generation;
  final PageController _pages = PageController();
  RouteObserver<ModalRoute<dynamic>>? _observer;
  ModalRoute<dynamic>? _route;
  Timer? _timer;
  List<String> _photos = const [];
  String? _mediaState;
  String? _error;
  DateTime? _retryAfter;
  DateTime? _nextRefreshAt;
  bool _loading = false;
  bool _loaded = false;
  bool _terminal = false;
  bool _routeVisible = true;
  bool _foreground = true;
  bool _refreshAfterRequest = false;
  int _epoch = 0;
  int _index = 0;
  int _mediaRevision = 0;
  int _failures = 0;

  DateTime get _now => (widget.clock ?? DateTime.now)();

  bool get _current =>
      mounted &&
      _actor != null &&
      widget.repository.session.verified &&
      widget.repository.session.identity?.id == _actor &&
      widget.repository.coordinator.generation == _generation;

  bool get _active => _current && _foreground && _routeVisible && !_terminal;

  @override
  void initState() {
    super.initState();
    _actor = widget.repository.session.identity?.id;
    _generation = widget.repository.coordinator.generation;
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _foreground = lifecycle == null || lifecycle == AppLifecycleState.resumed;
    WidgetsBinding.instance.addObserver(this);
    widget.repository.session.addListener(_sessionChanged);
    widget.repository.listingChanges.addListener(_listingChanged);
  }

  @override
  void didUpdateWidget(OwnerPropertyPhotos oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.id == widget.id &&
        identical(oldWidget.repository, widget.repository)) {
      return;
    }
    oldWidget.repository.session.removeListener(_sessionChanged);
    oldWidget.repository.listingChanges.removeListener(_listingChanged);
    widget.repository.session.addListener(_sessionChanged);
    widget.repository.listingChanges.addListener(_listingChanged);
    _epoch++;
    _mediaRevision++;
    _actor = widget.repository.session.identity?.id;
    _generation = widget.repository.coordinator.generation;
    _photos = const [];
    _mediaState = null;
    _error = null;
    _loaded = false;
    _terminal = false;
    _retryAfter = null;
    _nextRefreshAt = null;
    _failures = 0;
    _index = 0;
    _updateRefresh(immediate: true);
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
      if (route != null) _observer?.subscribe(this, route);
    }
    if (_observer == null) _routeVisible = route?.isCurrent ?? true;
    _updateRefresh(immediate: !_loaded);
  }

  @override
  void didPush() {
    _routeVisible = true;
    _updateRefresh(immediate: !_loaded);
  }

  @override
  void didPushNext() {
    _routeVisible = false;
    _updateRefresh();
  }

  @override
  void didPopNext() {
    _routeVisible = true;
    // Re-read immediately after managing photographs or returning from upload.
    _updateRefresh(immediate: true);
  }

  @override
  void didPop() {
    _routeVisible = false;
    _updateRefresh();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    _updateRefresh(immediate: _foreground);
  }

  void _sessionChanged() {
    if (!mounted || _current) return;
    _epoch++;
    _timer?.cancel();
    _timer = null;
    setState(() {
      _photos = const [];
      _mediaState = null;
      _error = 'Sign in again to view listing photographs.';
      _terminal = true;
      _loaded = false;
    });
  }

  void _listingChanged() {
    if (!_current || _terminal) return;
    // An acknowledged mutation makes any already-running read obsolete.
    _mediaRevision++;
    _nextRefreshAt = null;
    _updateRefresh(immediate: true);
  }

  void _updateRefresh({bool immediate = false}) {
    if (!_active) {
      _timer?.cancel();
      _timer = null;
      return;
    }
    if (_loading) {
      _refreshAfterRequest |= immediate;
      return;
    }
    if (_timer != null && !immediate) return;
    _timer?.cancel();
    var delay = immediate ? Duration.zero : const Duration(seconds: 5);
    for (final deadline in [_retryAfter, if (!immediate) _nextRefreshAt]) {
      if (deadline == null || !deadline.isAfter(_now)) continue;
      final remaining = deadline.difference(_now);
      if (remaining > delay) delay = remaining;
    }
    _timer = Timer(delay, () {
      _timer = null;
      if (_active) _load();
    });
  }

  List<String> _parse(JsonObject response) {
    final property = object(response['property']);
    final urls = property['mediaUrls'];
    final cover = property['coverImageUrl'];
    final state = property['mediaState'];
    final updatedAt = property['updatedAt'];
    if (property['id'] != widget.id ||
        state is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(state) ||
        updatedAt is! String ||
        DateTime.tryParse(updatedAt) == null ||
        urls is! List ||
        urls.length > 40 ||
        urls.any((value) => value is! String || value.length > 4096) ||
        (cover != null && (cover is! String || cover.length > 4096))) {
      throw const ApiException(ApiFailure.invalidResponse);
    }
    return List<String>.unmodifiable(<String>{
      if (cover is String && cover.isNotEmpty) cover,
      ...urls.cast<String>().where((value) => value.isNotEmpty),
    });
  }

  Future<void> _load({bool manual = false}) async {
    if (!_active || _loading) return;
    final retryAfter = _retryAfter;
    if (retryAfter != null && _now.isBefore(retryAfter)) {
      _updateRefresh();
      return;
    }
    final nextRefreshAt = _nextRefreshAt;
    if (!manual && nextRefreshAt != null && _now.isBefore(nextRefreshAt)) {
      _updateRefresh();
      return;
    }
    _timer?.cancel();
    _timer = null;
    final request = ++_epoch;
    final revision = _mediaRevision;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await widget.repository.call(
        'GET',
        '/api/properties/${widget.id}/media',
      );
      final next = _parse(response);
      if (!_active || request != _epoch || revision != _mediaRevision) return;
      final state = object(response['property'])['mediaState'] as String;
      final changed = state != _mediaState;
      setState(() {
        _photos = next;
        _mediaState = state;
        _loaded = true;
        _retryAfter = null;
        _nextRefreshAt = null;
        _failures = 0;
        if (changed) _index = 0;
      });
      if (changed && _pages.hasClients) _pages.jumpToPage(0);
    } catch (failure) {
      if (!_active || request != _epoch || revision != _mediaRevision) return;
      final terminal =
          failure is ApiException &&
          const {
            ApiFailure.unauthorized,
            ApiFailure.forbidden,
            ApiFailure.notFound,
          }.contains(failure.failure);
      if (failure is ApiException &&
          failure.failure == ApiFailure.rateLimited) {
        final seconds = failure.retryAfterSeconds ?? 30;
        _retryAfter = _now.add(Duration(seconds: seconds < 5 ? 5 : seconds));
      }
      if (!terminal) {
        _failures = (_failures + 1).clamp(1, 5).toInt();
        final seconds = (5 * (1 << (_failures - 1))).clamp(5, 60).toInt();
        _nextRefreshAt = _now.add(Duration(seconds: seconds));
      }
      setState(() {
        _error = marketplaceError(failure);
        _terminal = terminal;
        if (terminal) _photos = const [];
      });
      if (terminal) {
        _timer?.cancel();
        _timer = null;
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        final immediate = _refreshAfterRequest;
        _refreshAfterRequest = false;
        _updateRefresh(immediate: immediate);
      }
    }
  }

  @override
  void dispose() {
    _epoch++;
    _timer?.cancel();
    _observer?.unsubscribe(this);
    widget.repository.session.removeListener(_sessionChanged);
    widget.repository.listingChanges.removeListener(_listingChanged);
    WidgetsBinding.instance.removeObserver(this);
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Property photos',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            IconButton(
              tooltip: 'Refresh property photos',
              onPressed: _active && !_loading
                  ? () => _load(manual: true)
                  : null,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        if (_loading)
          if (_photos.isEmpty)
            const LoadingSkeleton(
              layout: SkeletonLayout.gallery,
              itemCount: 1,
              label: 'Loading property photos',
            )
          else
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Shimmer(
                label: 'Refreshing property photos',
                child: SkeletonLine(height: 6),
              ),
            ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        if (_current && _photos.isNotEmpty) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 220,
              child: PageView.builder(
                controller: _pages,
                itemCount: _photos.length,
                onPageChanged: (value) => setState(() => _index = value),
                itemBuilder: (_, index) => ListingImage(
                  key: ValueKey(_photos[index]),
                  url: _photos[index],
                  height: 220,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text('${_index + 1} of ${_photos.length} photos'),
        ] else if (_current && _loaded && _error == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('No property photos added yet.'),
          ),
      ],
    ),
  );
}
