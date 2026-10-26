import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Public links only; never exports credentials or uses the authenticated client.
class PublicListingMediaButton extends StatefulWidget {
  const PublicListingMediaButton({
    super.key,
    required this.url,
    required this.label,
  });
  final String? url;
  final String label;
  @override
  State<PublicListingMediaButton> createState() => _MediaButtonState();
}

class _MediaButtonState extends State<PublicListingMediaButton> {
  bool opening = false;
  static const configured = String.fromEnvironment('HOMEZONE_MEDIA_HOSTS');
  List<String> get hosts =>
      configured.split(',').where((v) => v.isNotEmpty).toList();
  bool get available {
    final uri = Uri.tryParse(widget.url ?? '');
    return uri != null &&
        uri.scheme == 'https' &&
        uri.userInfo.isEmpty &&
        !uri.hasFragment &&
        uri.port == 443 &&
        hosts.contains(uri.host.toLowerCase()) &&
        (widget.url?.length ?? 0) <= 2048;
  }

  Future<void> open() async {
    if (!available || opening) return;
    setState(() => opening = true);
    try {
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          scrollable: true,
          title: Text('Open ${widget.label.toLowerCase()}?'),
          content: const Text(
            'This opens a listing-supplied public link in your browser. App credentials are not transferred. The provider controls playback, privacy and availability. No video or tour is fabricated if unavailable.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Open browser'),
            ),
          ],
        ),
      );
      if (yes != true || !mounted) return;
      final result = await const MethodChannel(
        'homezone/public-media-browser',
      ).invokeMethod<bool>('open', {'url': widget.url, 'hosts': hosts});
      if (result != true && mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No supported browser opened. Media availability could not be confirmed.',
            ),
          ),
        );
    } catch (_) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Public-media handoff is unavailable on this platform.',
            ),
          ),
        );
    } finally {
      if (mounted) setState(() => opening = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (available)
        OutlinedButton.icon(
          onPressed: opening ? null : open,
          icon: const Icon(Icons.open_in_new),
          label: Text(widget.label),
        )
      else
        Text(
          widget.url == null
              ? '${widget.label}: not provided.'
              : '${widget.label}: browser access unavailable until its public host is approved.',
        ),
    ],
  );
}
