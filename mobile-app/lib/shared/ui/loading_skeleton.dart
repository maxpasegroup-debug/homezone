import 'package:flutter/material.dart';

/// One animation per loading section; decorative shapes never impersonate data.
class Shimmer extends StatefulWidget {
  const Shimmer({
    super.key,
    required this.child,
    this.label = 'Loading content',
  });

  final Widget child;
  final String label;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );
  bool _animate = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _animate =
        !MediaQuery.disableAnimationsOf(context) &&
        TickerMode.valuesOf(context).enabled;
    if (_animate) {
      if (!_animation.isAnimating) _animation.repeat();
    } else {
      _animation.stop();
    }
  }

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final base = colors.surfaceContainerHighest;
    final highlight = Color.lerp(base, colors.surface, .8)!;
    final direction = Directionality.of(context) == TextDirection.rtl ? -1 : 1;
    return Semantics(
      container: true,
      label: widget.label,
      child: ExcludeSemantics(
        child: IgnorePointer(
          child: _animate
              ? AnimatedBuilder(
                  animation: _animation,
                  child: widget.child,
                  builder: (context, child) {
                    final offset = (_animation.value * 4 - 2) * direction;
                    return ShaderMask(
                      blendMode: BlendMode.srcATop,
                      shaderCallback: (bounds) => LinearGradient(
                        begin: Alignment(-1 + offset, 0),
                        end: Alignment(1 + offset, 0),
                        colors: [base, highlight, base],
                        stops: const [.25, .5, .75],
                      ).createShader(bounds),
                      child: child,
                    );
                  },
                )
              : widget.child,
        ),
      ),
    );
  }
}

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    required this.height,
    this.width,
    this.borderRadius = 12,
  });

  final double height;
  final double? width;
  final double borderRadius;

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(borderRadius),
    ),
  );
}

class SkeletonLine extends StatelessWidget {
  const SkeletonLine({super.key, this.widthFactor = 1, this.height = 14})
    : assert(widthFactor > 0 && widthFactor <= 1);

  final double widthFactor;
  final double height;

  @override
  Widget build(BuildContext context) => FractionallySizedBox(
    widthFactor: widthFactor,
    alignment: AlignmentDirectional.centerStart,
    child: SkeletonBox(height: height, borderRadius: 5),
  );
}

enum SkeletonLayout { listings, detail, rows, profile, metrics, gallery }

/// Noninteractive placeholders for a pending read, never an empty/error result.
/// Use [scrollable] for a whole screen, and leave it false inside a list/column.
class LoadingSkeleton extends StatelessWidget {
  const LoadingSkeleton({
    super.key,
    this.layout = SkeletonLayout.rows,
    this.itemCount = 3,
    this.padding = EdgeInsets.zero,
    this.label = 'Loading content',
    this.scrollable = false,
  }) : assert(itemCount > 0);

  final SkeletonLayout layout;
  final int itemCount;
  final EdgeInsetsGeometry padding;
  final String label;
  final bool scrollable;

  Widget _card(BuildContext context, Widget child) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: child,
  );

  Widget _lines() => const Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SkeletonLine(widthFactor: .7, height: 20),
      SizedBox(height: 12),
      SkeletonLine(widthFactor: .9),
      SizedBox(height: 8),
      SkeletonLine(widthFactor: .5),
    ],
  );

  Widget _listing(BuildContext context) => _card(
    context,
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SkeletonBox(height: 180, borderRadius: 16),
        const SizedBox(height: 20),
        _lines(),
      ],
    ),
  );

  Widget _row(BuildContext context) => _card(
    context,
    Row(
      children: [
        const SkeletonBox(height: 48, width: 48),
        const SizedBox(width: 16),
        Expanded(child: _lines()),
      ],
    ),
  );

  Widget _metrics(BuildContext context) => Column(
    children: [
      for (var index = 0; index < itemCount; index += 2) ...[
        if (index > 0) const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var column = 0; column < 2; column++) ...[
              if (column > 0) const SizedBox(width: 12),
              Expanded(
                child: index + column >= itemCount
                    ? const SizedBox.shrink()
                    : _card(
                        context,
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: SkeletonBox(height: 28, width: 28),
                            ),
                            SizedBox(height: 16),
                            SkeletonLine(widthFactor: .4, height: 28),
                            SizedBox(height: 12),
                            SkeletonLine(widthFactor: .8),
                          ],
                        ),
                      ),
              ),
            ],
          ],
        ),
      ],
    ],
  );

  @override
  Widget build(BuildContext context) {
    final content = switch (layout) {
      SkeletonLayout.metrics => _metrics(context),
      SkeletonLayout.gallery => const SkeletonBox(
        height: 220,
        borderRadius: 16,
      ),
      SkeletonLayout.profile => _card(
        context,
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(
              child: SkeletonBox(height: 72, width: 72, borderRadius: 36),
            ),
            const SizedBox(height: 24),
            _lines(),
            const SizedBox(height: 32),
            _lines(),
            const SizedBox(height: 24),
            const SkeletonBox(height: 48),
          ],
        ),
      ),
      SkeletonLayout.detail => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SkeletonBox(height: 260, borderRadius: 24),
          const SizedBox(height: 24),
          _lines(),
          const SizedBox(height: 24),
          _metrics(context),
          const SizedBox(height: 24),
          _lines(),
        ],
      ),
      SkeletonLayout.listings || SkeletonLayout.rows => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var index = 0; index < itemCount; index++) ...[
            if (index > 0) const SizedBox(height: 16),
            layout == SkeletonLayout.listings
                ? _listing(context)
                : _row(context),
          ],
        ],
      ),
    };
    final placeholder = Padding(
      padding: padding,
      child: Shimmer(label: label, child: content),
    );
    return scrollable
        ? SingleChildScrollView(
            physics: const NeverScrollableScrollPhysics(),
            child: placeholder,
          )
        : placeholder;
  }
}
