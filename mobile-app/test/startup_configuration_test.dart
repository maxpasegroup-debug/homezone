import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homezone_mobile/app/homezone_app.dart';
import 'package:homezone_mobile/main.dart' as entry;

void main() {
  testWidgets('missing build configuration cannot silently become demo auth', (tester) async {
    await entry.main();
    await tester.pumpAndSettle();
    expect(find.byType(HomezoneApp), findsNothing);
    expect(find.textContaining('No connection was started.'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
