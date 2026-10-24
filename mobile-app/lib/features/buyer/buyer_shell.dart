import 'package:flutter/material.dart';
import 'data/demo_properties.dart';
import 'screens/buyer_home_screen.dart';
import 'screens/buyer_search_screen.dart';
import 'screens/buyer_saved_screen.dart';
import 'screens/buyer_profile_screen.dart';
import 'screens/buyer_property_detail_screen.dart';
import 'screens/buyer_filter_sheet.dart';
import 'data/buyer_filters.dart';
import '../../theme/design_tokens.dart';
import 'data/buyer_collections.dart';
import 'screens/buyer_shortlists_screen.dart';
import 'screens/buyer_compare_screen.dart';
import 'screens/buyer_enquiries_screen.dart';
import 'widgets/buyer_components.dart';

class BuyerShell extends StatefulWidget {
  const BuyerShell({super.key});
  @override
  State<BuyerShell> createState() => _BuyerShellState();
}

class _BuyerShellState extends State<BuyerShell> {
  int tab = 0;
  bool showEnquiryExamples = false;
  String location = 'All locations';
  PropertyCategory? category;
  int? maxAmount, bedrooms;
  Furnishing? furnishing;
  bool sortByTitle = false;
  BuyerFilters get filters => BuyerFilters(
    category: category,
    location: location,
    maxAmount: maxAmount,
    bedrooms: bedrooms,
    furnishing: furnishing,
  );
  final favorites = <String>{};
  late final collections = BuyerCollections(favorites);
  List<DemoProperty> recentlyViewed = [];
  final favoriteRevision = ValueNotifier<int>(0);
  final query = TextEditingController();
  final searchFocus = FocusNode();
  @override
  void dispose() {
    query.dispose();
    searchFocus.dispose();
    favoriteRevision.dispose();
    collections.dispose();
    super.dispose();
  }

  void selectTab(int index) {
    FocusScope.of(context).unfocus();
    setState(() => tab = index);
  }

  void selectCategory(PropertyCategory? next) => setState(() {
    maxAmount = budgetAfterCategoryChange(category, next, maxAmount);
    category = next;
  });

  void toggleFavorite(String id) => setState(() {
    if (!favorites.add(id)) {
      favorites.remove(id);
    }
    collections.favoriteChanged(id);
    favoriteRevision.value++;
  });
  void openProperty(DemoProperty property) {
    setState(() => recentlyViewed = recordDemoView(recentlyViewed, property));
    favoriteRevision.value++;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AnimatedBuilder(
          animation: favoriteRevision,
          builder: (_, _) => BuyerPropertyDetailScreen(
            property: property,
            saved: favorites.contains(property.id),
            onFavorite: () => toggleFavorite(property.id),
          ),
        ),
      ),
    );
  }

  void openRecent() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) {
          return AnimatedBuilder(
            animation: favoriteRevision,
            builder: (_, _) {
              return Scaffold(
                appBar: AppBar(title: const Text('Recently Viewed')),
                body: SafeArea(
                  child: BuyerPage(
                    children: [
                      const Text(
                        'Fictional demo listings. History stays in memory only.',
                      ),
                      const SizedBox(height: 16),
                      if (recentlyViewed.isEmpty)
                        const EmptySection(
                          title: 'No recently viewed properties',
                          message: 'Open a property to see it here.',
                        )
                      else
                        PropertyResults(
                          properties: recentlyViewed,
                          favorites: favorites,
                          onFavorite: toggleFavorite,
                          onOpen: openProperty,
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> openFilters() async {
    FocusScope.of(context).unfocus();
    final selected = await showModalBottomSheet<BuyerFilters>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => BuyerFilterSheet(initial: filters),
    );
    if (!mounted || selected == null) return;
    setState(() {
      category = selected.category;
      location = selected.location;
      maxAmount = selected.maxAmount;
      bedrooms = selected.bedrooms;
      furnishing = selected.furnishing;
    });
  }

  void browse({bool focus = false}) {
    selectTab(1);
    if (focus) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && tab == 1) searchFocus.requestFocus();
      });
    }
  }

  Future<void> chooseLocation() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Choose a demo location',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                ),
              ),
              for (final city in ['All locations', 'Kochi', 'Dubai'])
                ListTile(
                  title: Text(city),
                  trailing: city == location ? const Icon(Icons.check) : null,
                  onTap: () => Navigator.pop(context, city),
                ),
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Local preview only. No GPS or network requests.'),
              ),
            ],
          ),
        ),
      ),
    );
    if (mounted && selected != null) setState(() => location = selected);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      toolbarHeight: tab == 0 ? 48 : null,
      backgroundColor: tab == 0 ? BrandColors.forest : null,
      foregroundColor: tab == 0 ? Colors.white : null,
      title: Text(
        'HOMEZONE',
        style: TextStyle(
          fontSize: tab == 0 ? 18 : null,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),
      actions: [
        IconButton(
          tooltip: 'Open preview profile',
          onPressed: () => selectTab(3),
          icon: const Icon(Icons.account_circle_outlined),
        ),
      ],
    ),
    body: SafeArea(
      child: IndexedStack(
        index: tab,
        children: [
          BuyerHomeScreen(
            refinements: filters,
            onLocality: (value) {
              query.text = value;
              browse();
            },
            recentlyViewed: recentlyViewed,
            location: location,
            onLocation: chooseLocation,
            onSearch: () => browse(focus: true),
            category: category,
            onCategory: selectCategory,
            favorites: favorites,
            onFavorite: toggleFavorite,
            onOpen: openProperty,
          ),
          BuyerSearchScreen(
            refinements: filters,
            onFilters: openFilters,
            sortByTitle: sortByTitle,
            onSort: (value) => setState(() => sortByTitle = value),
            controller: query,
            focusNode: searchFocus,
            onQuery: (_) => setState(() {}),
            location: location,
            onLocation: chooseLocation,
            category: category,
            onCategory: selectCategory,
            favorites: favorites,
            onFavorite: toggleFavorite,
            onOpen: openProperty,
          ),
          BuyerSavedScreen(
            onShortlists: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => BuyerShortlistsScreen(
                  collections: collections,
                  onFavorite: toggleFavorite,
                  onOpen: openProperty,
                ),
              ),
            ),
            onCompare: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => BuyerCompareScreen(collections: collections),
              ),
            ),
            favorites: favorites,
            onFavorite: toggleFavorite,
            onOpen: openProperty,
            onSearch: browse,
          ),
          BuyerProfileScreen(
            onSaved: () => selectTab(2),
            onShortlists: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => BuyerShortlistsScreen(
                  collections: collections,
                  onFavorite: toggleFavorite,
                  onOpen: openProperty,
                ),
              ),
            ),
            onCompare: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => BuyerCompareScreen(collections: collections),
              ),
            ),
            onEnquiries: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => AnimatedBuilder(
                  animation: favoriteRevision,
                  builder: (_, _) => BuyerEnquiriesScreen(
                    showExamples: showEnquiryExamples,
                    onExamples: (value) {
                      setState(() => showEnquiryExamples = value);
                      favoriteRevision.value++;
                    },
                    onOpen: openProperty,
                  ),
                ),
              ),
            ),
            onRecent: openRecent,
          ),
        ],
      ),
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: selectTab,
      destinations: const [
        NavigationDestination(
          key: ValueKey('tab-home'),
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home),
          label: 'Home',
        ),
        NavigationDestination(
          key: ValueKey('tab-search'),
          icon: Icon(Icons.search),
          label: 'Search',
        ),
        NavigationDestination(
          key: ValueKey('tab-saved'),
          icon: Icon(Icons.favorite_border),
          selectedIcon: Icon(Icons.favorite),
          label: 'Saved',
        ),
        NavigationDestination(
          key: ValueKey('tab-profile'),
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    ),
  );
}
