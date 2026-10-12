import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int page = 0;
  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final colors = Theme.of(context).colorScheme;
    final footer = page == 0 ? colors.surface : BrandColors.forest;
    final footerText = page == 0 ? colors.onSurface : Colors.white;
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final height = math.max(740.0, constraints.maxHeight);
          return SingleChildScrollView(
            child: SizedBox(
              height: height,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    page == 0
                        ? 'assets/images/residence-day.jpg'
                        : 'assets/images/residence-evening.jpg',
                    fit: BoxFit.cover,
                    alignment: const Alignment(.25, 0),
                    excludeFromSemantics: true,
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        stops: const [0, .25, .48, .72, 1],
                        colors: [
                          colors.surface,
                          colors.surface.withValues(alpha: .96),
                          colors.surface.withValues(alpha: .82),
                          dark
                              ? const Color(0x4010251E)
                              : const Color(0x00FAF9F4),
                          const Color(0x30063F32),
                        ],
                      ),
                    ),
                  ),
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: Space.lg),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                tooltip: 'Previous onboarding screen',
                                onPressed: page == 1
                                    ? () => setState(() => page = 0)
                                    : () => Navigator.maybePop(context),
                                icon: const Icon(
                                  Icons.arrow_back_ios_new,
                                  size: 18,
                                ),
                              ),
                              TextButton(
                                onPressed: () =>
                                    Navigator.pushNamed(context, '/roles'),
                                child: const Text('Skip'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 64),
                          Text(
                            page == 0
                                ? 'Find Your Perfect Home'
                                : 'Smarter Property Decisions',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.headlineLarge,
                          ),
                          const SizedBox(height: Space.md),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: Space.lg,
                            ),
                            child: Text(
                              page == 0
                                  ? 'A personalised real estate journey for a better tomorrow.'
                                  : 'AI-assisted discovery and expert guidance. Coming soon; not connected in this preview.',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                          if (page == 1) ...[
                            const SizedBox(height: Space.lg),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                for (final icon in [
                                  Icons.lock_outline,
                                  Icons.insights_outlined,
                                  Icons.home_outlined,
                                ])
                                  Container(
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                    ),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: icon == Icons.home_outlined
                                          ? BrandColors.forest
                                          : BrandColors.gold,
                                      shape: BoxShape.circle,
                                      boxShadow: const [AppShape.shadow],
                                    ),
                                    child: Icon(
                                      icon,
                                      color: icon == Icons.home_outlined
                                          ? Colors.white
                                          : BrandColors.forest,
                                      size: 24,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  Align(
                    alignment: Alignment.bottomCenter,
                    child: ClipPath(
                      clipper: _WaveClipper(),
                      child: Container(height: 180, color: footer),
                    ),
                  ),
                  Positioned(
                    bottom: 24 + MediaQuery.paddingOf(context).bottom,
                    left: Space.lg,
                    right: Space.lg,
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Semantics(
                              label: 'Onboarding page ${page + 1} of 2',
                              child: Row(
                                children: [
                                  for (var i = 0; i < 2; i++)
                                    Container(
                                      margin: const EdgeInsets.symmetric(
                                        horizontal: 4,
                                      ),
                                      width: page == i ? 18 : 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: page == i
                                            ? (page == 0
                                                  ? BrandColors.forest
                                                  : BrandColors.gold)
                                            : footerText.withValues(alpha: .3),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Column(
                              children: [
                                IconButton.filled(
                                  tooltip: page == 0 ? 'Next' : 'Get started',
                                  style: IconButton.styleFrom(
                                    backgroundColor: page == 0
                                        ? BrandColors.forest
                                        : BrandColors.gold,
                                    foregroundColor: page == 0
                                        ? Colors.white
                                        : BrandColors.forest,
                                    minimumSize: const Size(52, 52),
                                  ),
                                  onPressed: () => page == 0
                                      ? setState(() => page = 1)
                                      : Navigator.pushNamed(context, '/roles'),
                                  icon: const Icon(Icons.arrow_forward),
                                ),
                                Text(
                                  page == 0 ? 'Next' : 'Get started',
                                  style: TextStyle(
                                    color: footerText,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        TextButton(
                          style: TextButton.styleFrom(
                            foregroundColor: footerText,
                          ),
                          onPressed: () =>
                              Navigator.pushNamed(context, '/sign-in'),
                          child: const Text('Already have an account? Sign In'),
                        ),
                        Text(
                          'Local UI preview only',
                          style: TextStyle(color: footerText, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _WaveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) => Path()
    ..moveTo(0, 42)
    ..quadraticBezierTo(size.width * .5, 100, size.width, 0)
    ..lineTo(size.width, size.height)
    ..lineTo(0, size.height)
    ..close();
  @override
  bool shouldReclip(_WaveClipper oldClipper) => false;
}
