enum PropertyCategory { buy, rent, land, commercial }

enum Furnishing {
  furnished('Furnished'),
  semiFurnished('Semi-Furnished'),
  unfurnished('Unfurnished');

  const Furnishing(this.label);
  final String label;

  /// Only exact supported labels are classified. The fictional fixtures may
  /// append the explicit '(demo)' annotation. Missing/unknown labels stay null.
  static Furnishing? fromLabel(String? value) {
    final normalized = value?.trim().toLowerCase();
    for (final furnishing in values) {
      final label = furnishing.label.toLowerCase();
      if (normalized == label || normalized == '$label (demo)') {
        return furnishing;
      }
    }
    return null;
  }
}

/// Memory-only view ordering; identity is independent of title or object instance.
List<DemoProperty> recordDemoView(
  List<DemoProperty> history,
  DemoProperty property,
) => [
  property,
  ...history.where((item) => item.id != property.id),
].take(10).toList();

extension PropertyCategoryLabel on PropertyCategory {
  String get label => switch (this) {
    PropertyCategory.buy => 'Buy',
    PropertyCategory.rent => 'Rent',
    PropertyCategory.land => 'Land',
    PropertyCategory.commercial => 'Commercial',
  };
}

class DemoProperty {
  const DemoProperty({
    required this.id,
    required this.title,
    required this.location,
    required this.city,
    required this.price,
    required this.type,
    required this.area,
    required this.image,
    required this.category,
    this.bedrooms,
    this.bathrooms,
    this.featured = false,
    this.description,
    this.furnishing,
    this.amount,
  });
  final String id, title, location, city, price, type, area, image;
  final PropertyCategory category;
  final int? bedrooms, bathrooms;
  final bool featured;
  final String? description, furnishing;
  final int? amount;
}

const demoProperties = [
  DemoProperty(
    id: 'garden-villa',
    amount: 12500000,
    description:
        'A fictional courtyard home designed around bright living spaces and a garden-facing lounge. Sample information for exploring HOMEZONE only.',
    furnishing: 'Semi-furnished (demo)',
    title: 'Garden Courtyard Villa',
    location: 'Kakkanad, Kochi',
    city: 'Kochi',
    price: '₹1.25 Cr',
    type: 'Villa',
    bedrooms: 3,
    bathrooms: 3,
    area: '2,400 sq ft',
    image: 'assets/images/residence-day.jpg',
    category: PropertyCategory.buy,
    featured: true,
  ),
  DemoProperty(
    id: 'palm-residence',
    amount: 9500000,
    title: 'Palm Grove Residence',
    location: 'Aluva, Kochi',
    city: 'Kochi',
    price: '₹95 Lakh',
    type: 'Independent home',
    bedrooms: 3,
    bathrooms: 2,
    area: '1,850 sq ft',
    image: 'assets/images/residence-evening.jpg',
    category: PropertyCategory.buy,
  ),
  DemoProperty(
    id: 'lakeside-rental',
    amount: 32000,
    title: 'Lakeside Family Home',
    location: 'Vyttila, Kochi',
    city: 'Kochi',
    price: '₹32,000 / month',
    type: 'Rental home',
    bedrooms: 2,
    bathrooms: 2,
    area: '1,450 sq ft',
    image: 'assets/images/residence-day.jpg',
    category: PropertyCategory.rent,
    featured: true,
  ),
  DemoProperty(
    id: 'studio-office',
    amount: 48000,
    title: 'Neighbourhood Studio Office',
    location: 'Edappally, Kochi',
    city: 'Kochi',
    price: '₹48,000 / month',
    type: 'Office space',
    bathrooms: 1,
    area: '900 sq ft',
    image: 'assets/images/residence-evening.jpg',
    category: PropertyCategory.commercial,
  ),
];
List<DemoProperty> filterDemoProperties({
  String query = '',
  String location = 'All locations',
  PropertyCategory? category,
}) {
  final term = query.trim().toLowerCase();
  return demoProperties
      .where(
        (property) =>
            (location == 'All locations' || property.city == location) &&
            (category == null || property.category == category) &&
            [
              property.title,
              property.location,
              property.type,
              property.category.label,
            ].join(' ').toLowerCase().contains(term),
      )
      .toList();
}
