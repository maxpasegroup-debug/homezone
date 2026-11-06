import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/features/engagement/chat_presentation.dart';
import 'package:homezone_mobile/features/engagement/engagement_repository.dart';
import 'package:homezone_mobile/theme/app_theme.dart';

Conversation _conversation({DateTime? updatedAt, bool blocked = false}) =>
    Conversation.parse({
      'id': 'conversation-0001',
      'propertyId': 'property-0001',
      'propertyTitle': 'A long property title with useful listing context',
      'peerName': 'A long synthetic participant name',
      'blocked': blocked,
      'blockedByMe': blocked,
      'updatedAt': (updatedAt ?? DateTime.now()).toUtc().toIso8601String(),
    });

void main() {
  for (final brightness in Brightness.values) {
    testWidgets(
      'chat presentation fits a narrow large-text ${brightness.name} screen',
      (tester) async {
        tester.view.physicalSize = const Size(320, 720);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final search = TextEditingController();
        try {
          await tester.pumpWidget(
            MaterialApp(
              theme: brightness == Brightness.light
                  ? AppTheme.light
                  : AppTheme.dark,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(2)),
                child: child!,
              ),
              home: Scaffold(
                appBar: AppBar(
                  title: const ChatThreadTitle(
                    peerName: 'A long synthetic participant name',
                  ),
                ),
                body: ListView(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: ChatInboxSearch(
                        controller: search,
                        onChanged: (_) {},
                      ),
                    ),
                    ChatInboxTile(
                      conversation: _conversation(blocked: true),
                      onTap: () {},
                    ),
                    const ChatDateSeparator(label: 'Today'),
                    const ChatInboxEmpty(),
                  ],
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.byType(ChatAvatar), findsNWidgets(2));
          expect(find.text('Messaging blocked'), findsOneWidget);
          expect(tester.takeException(), isNull);
          await tester.drag(find.byType(ListView), const Offset(0, -400));
          await tester.pumpAndSettle();
          expect(find.text('No conversations yet'), findsOneWidget);
          expect(tester.takeException(), isNull);
        } finally {
          await tester.pumpWidget(const SizedBox.shrink());
          search.dispose();
        }
      },
    );
  }

  testWidgets('search clear reports the changed query and has a 48px target', (
    tester,
  ) async {
    final controller = TextEditingController();
    final queries = <String>[];
    try {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ChatInboxSearch(
              controller: controller,
              onChanged: queries.add,
            ),
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), 'Kochi');
      await tester.pump();
      final clear = find.byTooltip('Clear search');
      final rect = tester.getRect(clear);
      expect(rect.width, greaterThanOrEqualTo(48));
      expect(rect.height, greaterThanOrEqualTo(48));
      await tester.tap(clear);
      await tester.pump();
      expect(controller.text, isEmpty);
      expect(queries, ['Kochi', '']);
      expect(find.byTooltip('Clear search'), findsNothing);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    }
  });

  testWidgets('avatar initials preserve grapheme clusters', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: ChatAvatar(name: '👩🏽‍💻 Example')),
      ),
    );
    expect(find.text('👩🏽‍💻E'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });

  testWidgets('inbox timestamp comes from the actual conversation update', (
    tester,
  ) async {
    final now = DateTime.now();
    final updated = DateTime(now.year, now.month, now.day - 1, 9);
    var opened = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ChatInboxTile(
            conversation: _conversation(updatedAt: updated),
            onTap: () => opened = true,
          ),
        ),
      ),
    );
    expect(find.text('Yesterday'), findsOneWidget);
    expect(find.text('Messaging blocked'), findsNothing);
    await tester.tap(find.byType(ChatInboxTile));
    expect(opened, isTrue);
    expect(find.byType(Badge), findsNothing);
  });

  testWidgets('empty search is distinct from an empty inbox', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: ChatInboxEmpty(searching: true))),
    );
    expect(find.text('No matching conversations'), findsOneWidget);
    expect(find.text('Try a different name or property.'), findsOneWidget);
    expect(find.text('No conversations yet'), findsNothing);
  });
}
