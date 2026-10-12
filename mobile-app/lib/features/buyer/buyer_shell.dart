import 'package:flutter/material.dart';
import 'data/demo_properties.dart';
import 'screens/buyer_home_screen.dart';
import 'screens/buyer_search_screen.dart';
import 'screens/buyer_saved_screen.dart';
import 'screens/buyer_profile_screen.dart';

class BuyerShell extends StatefulWidget {
  const BuyerShell({super.key});
  @override
  State<BuyerShell> createState() => _BuyerShellState();
}

class _BuyerShellState extends State<BuyerShell> {
  int tab = 0;
  String location = 'All locations';
  PropertyCategory? category;
  final favorites = <String>{};
  final query = TextEditingController();
  final searchFocus = FocusNode();
  @override
  void dispose() {
    query.dispose();
    searchFocus.dispose();
    super.dispose();
  }

  void selectTab(int index) {
    FocusScope.of(context).unfocus();
    setState(() => tab = index);
  }

  void toggleFavorite(String id) => setState(() {
    if (!favorites.add(id)) favorites.remove(id);
  });
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
      title: const Text(
        'HOMEZONE',
        style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.5),
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
            location: location,
            onLocation: chooseLocation,
            onSearch: () => browse(focus: true),
            category: category,
            onCategory: (value) => setState(() => category = value),
            favorites: favorites,
            onFavorite: toggleFavorite,
          ),
          BuyerSearchScreen(
            controller: query,
            focusNode: searchFocus,
            onQuery: (_) => setState(() {}),
            location: location,
            onLocation: chooseLocation,
            category: category,
            onCategory: (value) => setState(() => category = value),
            favorites: favorites,
            onFavorite: toggleFavorite,
          ),
          BuyerSavedScreen(
            favorites: favorites,
            onFavorite: toggleFavorite,
            onSearch: browse,
          ),
          const BuyerProfileScreen(),
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
