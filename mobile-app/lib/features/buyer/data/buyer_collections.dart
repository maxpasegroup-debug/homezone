import 'package:flutter/foundation.dart';
import 'demo_properties.dart';

class DemoShortlist {
  DemoShortlist(this.id, this.name);
  final int id;
  String name;
  final Set<String> propertyIds = {};
}

/// Shell-owned volatile collections; favorites remain the shell's original set.
class BuyerCollections extends ChangeNotifier {
  BuyerCollections(this.favorites);
  final Set<String> favorites;
  final List<DemoShortlist> shortlists = [];
  final Set<String> comparison = {};
  int _nextId = 0;
  String? setName(String input, {int? id}) {
    final name = input.trim();
    if (name.isEmpty || name.length > 40) {
      return 'Enter a name of 1–40 characters.';
    }
    if (shortlists.any(
      (s) => s.id != id && s.name.toLowerCase() == name.toLowerCase(),
    )) {
      return 'A shortlist with this name already exists.';
    }
    if (id == null) {
      shortlists.add(DemoShortlist(++_nextId, name));
    } else {
      final existing = shortlists.where((s) => s.id == id);
      if (existing.isEmpty) return 'Shortlist unavailable.';
      existing.first.name = name;
    }
    notifyListeners();
    return null;
  }

  void delete(int id) {
    shortlists.removeWhere((s) => s.id == id);
    notifyListeners();
  }

  void membership(int id, String propertyId, bool selected) {
    final list = shortlists.where((s) => s.id == id);
    if (list.isEmpty || !favorites.contains(propertyId)) return;
    if (selected) {
      list.first.propertyIds.add(propertyId);
    } else {
      list.first.propertyIds.remove(propertyId);
    }
    notifyListeners();
  }

  /// Re-saving refreshes collection choosers but does not restore membership.
  void favoriteChanged(String id) {
    if (!favorites.contains(id)) {
      for (final list in shortlists) {
        list.propertyIds.remove(id);
      }
    }
    notifyListeners();
  }

  void compare(String id, bool selected) {
    if (!demoProperties.any((p) => p.id == id)) return;
    if (selected) {
      if (comparison.length < 2) comparison.add(id);
    } else {
      comparison.remove(id);
    }
    notifyListeners();
  }
}
