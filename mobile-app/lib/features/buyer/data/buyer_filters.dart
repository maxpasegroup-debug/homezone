import 'demo_properties.dart';

/// Sale totals and monthly amounts cannot share a budget. An unselected
/// category mixes both price bases, so crossing that boundary also clears it.
int? budgetAfterCategoryChange(
  PropertyCategory? current,
  PropertyCategory? next,
  int? maxAmount,
) {
  if (current == next) return maxAmount;
  final currentBasis = _budgetBasis(current);
  final nextBasis = _budgetBasis(next);
  return currentBasis != null && currentBasis == nextBasis ? maxAmount : null;
}

enum _BudgetBasis { saleTotal, monthly }

_BudgetBasis? _budgetBasis(PropertyCategory? category) => switch (category) {
  PropertyCategory.buy || PropertyCategory.land => _BudgetBasis.saleTotal,
  PropertyCategory.rent || PropertyCategory.commercial => _BudgetBasis.monthly,
  null => null,
};

class BuyerFilters {
  const BuyerFilters({
    this.category,
    this.location = 'All locations',
    this.maxAmount,
    this.bedrooms,
    this.furnishing,
  });
  final PropertyCategory? category;
  final String location;
  final int? maxAmount, bedrooms;

  /// An unset filter includes missing/unknown labels; specific selections exclude them.
  final Furnishing? furnishing;
  bool accepts(DemoProperty p) =>
      (maxAmount == null || (p.amount != null && p.amount! <= maxAmount!)) &&
      (bedrooms == null || p.bedrooms == bedrooms) &&
      (furnishing == null || Furnishing.fromLabel(p.furnishing) == furnishing);
}
