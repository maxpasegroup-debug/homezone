import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'marketplace_repository.dart';
import 'public_listing_media_button.dart';
import 'account_listing_screen.dart';
import 'listing_location.dart';
import 'listing_media.dart';
import '../workspace/workspace_screen.dart';

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

class _MarketplaceScreenState extends State<MarketplaceScreen> {
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
  bool savePending = false;
  int accountEpoch = 0;
  final collectionPending = <String>{};
  String? error;
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
      loading = false;
    });
  }

  Future<void> load({bool next = false}) async {
    if (loading || (next && (!more || page >= 1000))) return;
    final request = ++revision;
    final generation = widget.repository.coordinator.generation;
    setState(() {
      loading = true;
      error = null;
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
      if (mounted && request == revision) setState(() => loading = false);
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
    return TextButton(
      onPressed: pending || loading || mutating
          ? null
          : () => loadCollection(collection, parent: parent),
      child: Text(
        pending
            ? 'Loading…'
            : parent != null && shortlist!['itemsLoaded'] != true
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
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: () => open(listing),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ListingImage(url: listing.images.firstOrNull, height: 190),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      listing.price,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      listing.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(listing.location),
                    Text(
                      '${listing.fact('bedrooms')} bedrooms · ${listing.fact('bathrooms')} bathrooms',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Wrap(
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
      ],
    ),
  );
  Widget empty(String title) => Padding(
    padding: const EdgeInsets.all(24),
    child: Text(title, textAlign: TextAlign.center),
  );
  List<Widget> browsing() => [
    Text(
      tab == 0 ? 'Discover a place' : 'Property Search',
      style: Theme.of(context).textTheme.headlineMedium,
    ),
    const Text(
      'Service-backed listings. The offline preview is a separate experience.',
    ),
    TextField(
      controller: query,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        labelText: 'Search properties',
        suffixIcon: IconButton(
          tooltip: 'Search',
          onPressed: loading ? null : search,
          icon: const Icon(Icons.search),
        ),
      ),
      onSubmitted: (_) => search(),
    ),
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
        OutlinedButton.icon(
          onPressed: loading ? null : editFilters,
          icon: const Icon(Icons.tune),
          label: const Text('Filters'),
        ),
        SizedBox(
          width: MediaQuery.sizeOf(context).width - 32,
          child: DropdownButton<String>(
            isExpanded: true,
            value: filters['sort'] ?? 'newest',
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
    if (listings.isEmpty && !loading && error == null)
      empty('No matching published listings. Try changing the filters.'),
    ...listings.map(card),
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
      Text('Recently Viewed', style: Theme.of(context).textTheme.titleLarge),
      if (recent.isEmpty)
        empty('Properties you open appear here for this app session.'),
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
    Text(
      'Saved & Shortlists',
      style: Theme.of(context).textTheme.headlineMedium,
    ),
    const Text(
      'Changes are stored in your signed-in account only after the server confirms them. Comparison is memory-only.',
    ),
    if (account != null) ...[
      if (objects(account!['saved']).isEmpty) empty('No saved properties.'),
      ...objects(account!['saved']).map((row) => card(Listing.parse(row))),
      collectionMore('saved'),
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
      const Text(
        'Load more to browse the rest of your account. Open a shortlist to load its properties. Unavailable listings are omitted. Refresh to see new changes.',
      ),
    ],
  ];
  List<Widget> enquiries() => [
    Text('My Enquiries', style: Theme.of(context).textTheme.headlineMedium),
    const Text(
      'Only server-confirmed enquiries are shown. No automated retry is made for submissions.',
    ),
    if (account != null && objects(account!['enquiries']).isEmpty)
      empty('No enquiries yet. Open a property to enquire.'),
    if (account != null)
      for (final row in objects(account!['enquiries']))
        Card(
          child: ListTile(
            title: Text(
              row['property'] is JsonObject
                  ? textValue(object(row['property'])['title'])
                  : 'Unavailable property',
            ),
            subtitle: Text(
              '${textValue(row['stage'])}\n${textValue(row['createdAt'])}',
            ),
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
    Text('My Profile', style: Theme.of(context).textTheme.headlineMedium),
    if (account != null) ...[
      Text(
        textValue(object(account!['profile'])['fullName'], 'HOMEZONE buyer'),
      ),
      Text('City: ${textValue(object(account!['profile'])['city'])}'),
      Text('Phone: ${textValue(object(account!['profile'])['phone'])}'),
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
                    () => widget.repository.updateProfile(values.$1, values.$2),
                  );
                }
              },
        child: const Text('Edit city and phone'),
      ),
    ],
    ListTile(
      title: const Text('My role workspace & notifications'),
      leading: const Icon(Icons.work_outline),
      onTap: () async {
        await Navigator.push<void>(
          context,
          MaterialPageRoute(
            builder: (_) => WorkspaceScreen(repository: widget.repository),
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
    const Text('Appearance preference is kept only for this app launch.'),
    DropdownButtonFormField<ThemeMode>(
      initialValue: widget.themeMode,
      decoration: const InputDecoration(labelText: 'Appearance'),
      items: [
        for (final mode in ThemeMode.values)
          DropdownMenuItem(value: mode, child: Text(mode.name)),
      ],
      onChanged: (value) {
        if (value != null) widget.onThemeChanged?.call(value);
      },
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
            'Email-verified account registration is available when configured. Account deletion and refund review requests can be recorded from My Workspace. Actual deletion, retention and refund execution require approved policies and provider operations. '
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
  void changeTab(int value) {
    if (loading || mutating) return;
    setState(() {
      tab = value;
      error = null;
    });
    load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('HOMEZONE'),
      actions: [
        IconButton(
          tooltip: 'Compare selected properties',
          onPressed: showCompare,
          icon: Badge(
            label: Text('${compare.length}'),
            child: const Icon(Icons.compare_arrows),
          ),
        ),
        IconButton(
          tooltip: 'Refresh',
          onPressed: loading || mutating ? null : () => load(),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: () => load(),
      child: ListView(
        key: PageStorageKey('marketplace-$tab'),
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
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
          ] else
            ...switch (tab) {
              0 || 1 => browsing(),
              2 => collections(),
              3 => enquiries(),
              _ => profile(),
            },
          if (loading || mutating) const LinearProgressIndicator(),
          if (error != null) ...[
            Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            TextButton(
              onPressed: loading ? null : () => load(),
              child: const Text('Retry'),
            ),
          ],
        ],
      ),
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: changeTab,
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
        NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
        NavigationDestination(
          icon: Icon(Icons.favorite_border),
          label: 'Saved',
        ),
        NavigationDestination(
          icon: Icon(Icons.chat_bubble_outline),
          label: 'Enquiries',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
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
    Widget fallback() => SizedBox(
      height: widget.height,
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.image_not_supported_outlined, size: 40),
            Text('Image unavailable'),
          ],
        ),
      ),
    );
    if (bytes == null) return fallback();
    return FutureBuilder<Uint8List>(
      future: bytes,
      builder: (context, snapshot) {
        if (snapshot.hasError) return fallback();
        if (!snapshot.hasData) {
          return SizedBox(
            height: widget.height,
            child: const Center(child: CircularProgressIndicator()),
          );
        }
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

class _LivePropertyScreenState extends State<LivePropertyScreen> {
  late Future<Listing> result;
  Future<ListingPage>? related;
  bool saving = false;
  @override
  void initState() {
    super.initState();
    result = readProperty();
  }

  Future<Listing> readProperty() async {
    final property = await widget.repository.detail(widget.id);
    if (mounted) {
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
    appBar: AppBar(title: const Text('Property details')),
    body: FutureBuilder<Listing>(
      future: result,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(marketplaceError(snapshot.error!)),
                TextButton(
                  onPressed: () => setState(() => result = readProperty()),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final property = snapshot.data!;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            InkWell(
              onTap: () => Navigator.push<void>(
                context,
                MaterialPageRoute(
                  builder: (_) => LiveGalleryScreen(property: property),
                ),
              ),
              child: ListingImage(url: property.images.firstOrNull),
            ),
            Text(
              property.price,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            Text(property.title, style: Theme.of(context).textTheme.titleLarge),
            Text(property.location),
            Wrap(
              spacing: 8,
              children: [
                for (final key in [
                  'intent',
                  'propertyType',
                  'bedrooms',
                  'bathrooms',
                  'areaValue',
                  'areaUnit',
                ])
                  Chip(label: Text('$key: ${property.fact(key)}')),
              ],
            ),
            Text(
              textValue(
                property.data['description'],
                'No description provided.',
              ),
            ),
            if (property.data['amenities'] is List) ...[
              const Text('Listed amenities'),
              for (final amenity
                  in (property.data['amenities'] as List).whereType<String>())
                Text('• $amenity'),
            ],
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
                  builder: (_) => LiveGalleryScreen(property: property),
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
            if (!widget.repository.session.verified)
              const Text('Sign in to submit an enquiry.'),
            if (related != null && widget.onOpenListing != null)
              FutureBuilder<ListingPage>(
                future: related,
                builder: (context, snapshot) {
                  if (snapshot.hasError)
                    return const Text('Related listings are unavailable.');
                  if (!snapshot.hasData)
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: LinearProgressIndicator(),
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

class LiveGalleryScreen extends StatelessWidget {
  const LiveGalleryScreen({super.key, required this.property});
  final Listing property;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(property.title)),
    body: property.images.isEmpty
        ? const Center(child: Text('No photographs are available.'))
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final url in property.images)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: ListingImage(url: url, height: 320),
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
  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      phone = TextEditingController(),
      message = TextEditingController();
  bool sending = false, sent = false;
  String? error;
  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    message.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (sending || sent || !form.currentState!.validate()) return;
    setState(() {
      sending = true;
      error = null;
    });
    try {
      await widget.repository.enquire(
        widget.property.id,
        name.text,
        phone.text,
        message.text,
      );
      if (mounted && widget.repository.session.verified) {
        setState(() => sent = true);
      }
    } catch (failure) {
      if (mounted) {
        setState(() => error = marketplaceError(failure, mutation: true));
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
      builder: (context, _) => !widget.repository.session.verified
          ? const Center(
              child: Text(
                'Your session ended. Sign in again before submitting an enquiry.',
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
                      enabled: !sending,
                      maxLength: 120,
                      decoration: const InputDecoration(labelText: 'Name'),
                      validator: (value) => (value?.trim().length ?? 0) < 2
                          ? 'Enter your name.'
                          : null,
                    ),
                    TextFormField(
                      controller: phone,
                      enabled: !sending,
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
                      enabled: !sending,
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
                      onPressed: sending ? null : submit,
                      child: Text(sending ? 'Submitting…' : 'Submit enquiry'),
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
      builder: (context, _) => !widget.repository.session.verified
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
                      if (form.currentState!.validate()) {
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
