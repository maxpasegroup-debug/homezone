import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/shared/ui/loading_skeleton.dart';
import 'package:homezone_mobile/theme/app_theme.dart';

Widget _host(
  Widget child, {
  Brightness brightness = Brightness.light,
  bool disableAnimations = false,
  bool tickerEnabled = true,
  double textScale = 1,
}) => MaterialApp(
  theme: brightness == Brightness.dark ? AppTheme.dark : AppTheme.light,
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(
      disableAnimations: disableAnimations,
      textScaler: TextScaler.linear(textScale),
    ),
    child: child!,
  ),
  home: Scaffold(
    body: TickerMode(enabled: tickerEnabled, child: child),
  ),
);

void main() {
  for (final layout in SkeletonLayout.values) {
    for (final brightness in Brightness.values) {
      testWidgets(
        '${layout.name} loading fits narrow large-text ${brightness.name} layouts',
        (tester) async {
          tester.view.physicalSize = const Size(320, 640);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);

          await tester.pumpWidget(
            _host(
              LoadingSkeleton(
                layout: layout,
                itemCount: 4,
                padding: const EdgeInsets.all(16),
                scrollable: true,
              ),
              brightness: brightness,
              textScale: 2,
            ),
          );
          await tester.pump(const Duration(milliseconds: 250));
          expect(find.byType(SkeletonBox), findsWidgets);
          expect(find.byType(CircularProgressIndicator), findsNothing);
          expect(tester.takeException(), isNull);

          final scrollable = find.byType(Scrollable);
          if (scrollable.evaluate().isNotEmpty) {
            await tester.drag(scrollable.first, const Offset(0, -350));
            await tester.pump(const Duration(milliseconds: 250));
            expect(tester.takeException(), isNull);
          }

          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('loading has one announcement and no decorative semantics', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        _host(
          const LoadingSkeleton(
            layout: SkeletonLayout.listings,
            label: 'Loading published properties',
            scrollable: true,
          ),
        ),
      );
      await tester.pump();
      expect(
        find.bySemanticsLabel('Loading published properties'),
        findsOneWidget,
      );
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      semantics.dispose();
    }
  });

  testWidgets('shimmer ignores decorative child actions and announcements', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      var taps = 0;
      await tester.pumpWidget(
        _host(
          Shimmer(
            label: 'Loading account',
            child: Semantics(
              label: 'Decorative placeholder',
              button: true,
              child: GestureDetector(
                onTap: () => taps++,
                child: const SizedBox(
                  key: ValueKey('decorative-skeleton'),
                  width: 180,
                  height: 80,
                  child: Text('Placeholder content'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.bySemanticsLabel('Loading account'), findsOneWidget);
      expect(find.bySemanticsLabel('Decorative placeholder'), findsNothing);
      expect(find.bySemanticsLabel('Placeholder content'), findsNothing);
      await tester.tap(
        find.byKey(const ValueKey('decorative-skeleton')),
        warnIfMissed: false,
      );
      expect(taps, 0);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      semantics.dispose();
    }
  });

  testWidgets('reduced motion keeps placeholders without repeating frames', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const LoadingSkeleton(layout: SkeletonLayout.profile),
        disableAnimations: true,
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 2));
    expect(find.byType(SkeletonBox), findsWidgets);
    expect(tester.binding.transientCallbackCount, 0);
    expect(tester.binding.hasScheduledFrame, isFalse);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('hidden ticker mode suspends shimmer frames', (tester) async {
    await tester.pumpWidget(
      _host(const LoadingSkeleton(), tickerEnabled: false),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 2));
    expect(find.byType(SkeletonBox), findsWidgets);
    expect(tester.binding.transientCallbackCount, 0);
    expect(tester.binding.hasScheduledFrame, isFalse);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('animation runs and safely stops when removed', (tester) async {
    await tester.pumpWidget(_host(const LoadingSkeleton()));
    await tester.pump(const Duration(milliseconds: 200));
    expect(tester.binding.transientCallbackCount, greaterThan(0));
    expect(tester.binding.hasScheduledFrame, isTrue);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 2));
    expect(tester.binding.transientCallbackCount, 0);
    expect(tester.binding.hasScheduledFrame, isFalse);
    expect(tester.takeException(), isNull);
  });
}
