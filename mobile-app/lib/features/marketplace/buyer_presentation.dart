import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

/// Presentation shared by the real buyer screens. Contains no account or API state.
class BuyerSurface extends StatelessWidget {
  const BuyerSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.margin = EdgeInsets.zero,
  });
  final Widget child;
  final EdgeInsetsGeometry padding, margin;

  @override
  Widget build(BuildContext context) => Padding(
    padding: margin,
    child: Material(
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
      child: Padding(padding: padding, child: child),
    ),
  );
}

class BuyerHeading extends StatelessWidget {
  const BuyerHeading({
    super.key,
    required this.title,
    required this.subtitle,
    this.eyebrow,
    this.action,
  });
  final String title, subtitle;
  final String? eyebrow;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 4, bottom: 22),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (eyebrow != null) ...[
          Text(
            eyebrow!.toUpperCase(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.6,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 9),
        ],
        Text(
          title,
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
            fontSize: 28,
            letterSpacing: -.8,
            height: 1.15,
          ),
        ),
        const SizedBox(height: 9),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 14,
            height: 1.5,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        if (action != null) ...[const SizedBox(height: 16), action!],
      ],
    ),
  );
}

class BuyerWelcome extends StatelessWidget {
  const BuyerWelcome({super.key});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    margin: const EdgeInsets.only(bottom: 22),
    decoration: BoxDecoration(
      color: BrandColors.forest,
      borderRadius: BorderRadius.circular(26),
    ),
    child: LayoutBuilder(
      builder: (context, constraints) => Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ROOM FOR YOUR NEXT CHAPTER',
                  style: TextStyle(
                    color: Color(0xFFE2D1AD),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 13),
                Text(
                  'Find a place.\nMake it yours.',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    color: Colors.white,
                    fontSize: 29,
                    height: 1.15,
                    letterSpacing: -.7,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Explore homes, save your favourites and take your next step.',
                  style: TextStyle(
                    color: Color(0xFFD3E2DA),
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          if (constraints.maxWidth > 310 &&
              MediaQuery.textScalerOf(context).scale(1) < 1.5) ...[
            const SizedBox(width: 12),
            const Icon(
              Icons.holiday_village_outlined,
              color: Color(0xFFA9C2AF),
              size: 74,
            ),
          ],
        ],
      ),
    ),
  );
}

class BuyerEmptyState extends StatelessWidget {
  const BuyerEmptyState({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.home_work_outlined,
    this.action,
    this.compact = false,
  });
  final String title, message;
  final IconData icon;
  final Widget? action;
  final bool compact;

  @override
  Widget build(BuildContext context) => BuyerSurface(
    margin: const EdgeInsets.symmetric(vertical: 10),
    padding: EdgeInsets.symmetric(horizontal: 22, vertical: compact ? 22 : 30),
    child: Column(
      children: [
        Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: .08),
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            size: compact ? 27 : 34,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        const SizedBox(height: 18),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -.3,
          ),
        ),
        if (message.isNotEmpty) ...[
          const SizedBox(height: 9),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              height: 1.6,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        if (action != null) ...[const SizedBox(height: 17), action!],
      ],
    ),
  );
}

class BuyerSectionLabel extends StatelessWidget {
  const BuyerSectionLabel(this.title, {super.key, this.subtitle});
  final String title;
  final String? subtitle;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 24, bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontSize: 21,
            fontWeight: FontWeight.w700,
            letterSpacing: -.5,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 5),
          Text(
            subtitle!,
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ],
    ),
  );
}

class BuyerFact extends StatelessWidget {
  const BuyerFact({super.key, required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(
        icon,
        size: 18,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
      const SizedBox(width: 6),
      Flexible(
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    ],
  );
}

String buyerReadableValue(Object? value) => value is String
    ? value
          .split('_')
          .map(
            (part) => part.isEmpty
                ? ''
                : '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}',
          )
          .join(' ')
    : '$value';

String buyerPrice(Map<String, dynamic> data) {
  final amount = num.tryParse('${data['price']}');
  if (amount == null) return 'Price on request';
  final currency = data['currency'] is String ? data['currency'] as String : '';
  final prefix = currency == 'INR'
      ? '₹'
      : currency.isEmpty
      ? ''
      : '$currency ';
  if (currency == 'INR' && amount >= 10000000) {
    return '$prefix${_trimDecimal(amount / 10000000)} Cr';
  }
  if (currency == 'INR' && amount >= 100000) {
    return '$prefix${_trimDecimal(amount / 100000)} lakh';
  }
  final number = _trimDecimal(amount);
  final pieces = number.split('.');
  final whole = pieces.first.replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]},',
  );
  return '$prefix$whole${pieces.length > 1 ? '.${pieces[1]}' : ''}';
}

String _trimDecimal(num value) =>
    value.toStringAsFixed(2).replaceFirst(RegExp(r'\.?0+$'), '');

String buyerInitials(Object? fullName) {
  if (fullName is! String || fullName.trim().isEmpty) return '';
  final parts = fullName.trim().split(RegExp(r'\s+'));
  return parts
      .take(2)
      .map((part) => part.characters.first.toUpperCase())
      .join();
}

String buyerDate(Object? value) {
  final date = value is String ? DateTime.tryParse(value)?.toLocal() : null;
  if (date == null) return 'Date not provided';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${date.day} ${months[date.month - 1]} ${date.year}';
}
