import 'package:flutter/material.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

class BuyerEnquiriesScreen extends StatelessWidget {
  const BuyerEnquiriesScreen({
    super.key,
    required this.showExamples,
    required this.onExamples,
    required this.onOpen,
  });
  final bool showExamples;
  final ValueChanged<bool> onExamples;
  final ValueChanged<DemoProperty> onOpen;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('My Enquiries')),
    body: SafeArea(
      child: BuyerPage(
        children: [
          const Text(
            'Offline preview only. No enquiry has been sent, and no owner or agent is contacted.',
          ),
          const SizedBox(height: 16),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Show fictional examples'),
            value: showExamples,
            onChanged: onExamples,
          ),
          if (!showExamples)
            const EmptySection(
              title: 'No enquiries yet',
              message:
                  'This preview has no customer submissions. You can inspect fictional examples without sending anything.',
              icon: Icons.chat_bubble_outline,
            )
          else ...[
            const Text(
              'FICTIONAL EXAMPLE · Not submitted · No submission date',
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(demoProperties.first.title),
              subtitle: const Text('Preview status: example only'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onOpen(demoProperties.first),
            ),
          ],
        ],
      ),
    ),
  );
}
