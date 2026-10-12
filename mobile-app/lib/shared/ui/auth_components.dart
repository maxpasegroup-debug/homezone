import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

class AuthLayout extends StatelessWidget {
  const AuthLayout({super.key, required this.child, this.back = true});
  final Widget child;
  final bool back;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(automaticallyImplyLeading: back),
    body: SafeArea(
      child: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.all(Space.lg),
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: child,
          ),
        ),
      ),
    ),
  );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.eyebrow,
  });
  final String title, subtitle;
  final String? eyebrow;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      if (eyebrow != null) ...[
        Text(
          eyebrow!,
          style: TextStyle(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: Space.md),
      ],
      Text(title, style: Theme.of(context).textTheme.headlineLarge),
      const SizedBox(height: Space.md),
      Text(
        subtitle,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    ],
  );
}

class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(Space.lg),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(AppShape.radius),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      boxShadow: const [AppShape.shadow],
    ),
    child: child,
  );
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: loading ? 'Loading local preview' : null,
    child: FilledButton(
      onPressed: loading ? null : onPressed,
      child: loading
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Text(label),
    ),
  );
}

class AppInput extends StatelessWidget {
  const AppInput({
    super.key,
    required this.label,
    required this.controller,
    required this.icon,
    this.validator,
    this.keyboardType,
    this.autofillHints,
    this.next = true,
    this.enabled = true,
  });
  final String label;
  final TextEditingController controller;
  final IconData icon;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final bool next, enabled;
  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    enabled: enabled,
    validator: validator,
    keyboardType: keyboardType,
    autofillHints: autofillHints,
    autocorrect: false,
    textInputAction: next ? TextInputAction.next : TextInputAction.done,
    decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
  );
}

class PasswordInput extends StatefulWidget {
  const PasswordInput({
    super.key,
    required this.label,
    required this.controller,
    required this.validator,
    this.newPassword = false,
    this.enabled = true,
  });
  final String label;
  final TextEditingController controller;
  final String? Function(String?) validator;
  final bool newPassword, enabled;
  @override
  State<PasswordInput> createState() => _PasswordInputState();
}

class _PasswordInputState extends State<PasswordInput> {
  bool hidden = true;
  @override
  Widget build(BuildContext context) => TextFormField(
    controller: widget.controller,
    validator: widget.validator,
    enabled: widget.enabled,
    obscureText: hidden,
    autocorrect: false,
    enableSuggestions: false,
    autofillHints: [
      widget.newPassword ? AutofillHints.newPassword : AutofillHints.password,
    ],
    textInputAction: TextInputAction.done,
    decoration: InputDecoration(
      labelText: widget.label,
      prefixIcon: const Icon(AppIcons.password),
      suffixIcon: IconButton(
        tooltip: hidden
            ? 'Show ${widget.label.toLowerCase()}'
            : 'Hide ${widget.label.toLowerCase()}',
        onPressed: widget.enabled
            ? () => setState(() => hidden = !hidden)
            : null,
        icon: Icon(
          hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined,
        ),
      ),
    ),
  );
}

class PreviewNotice extends StatelessWidget {
  const PreviewNotice({
    super.key,
    this.message = 'UI preview only. No account or backend connection.',
  });
  final String message;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(AppShape.inputRadius),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSecondaryContainer,
        ),
      ),
    ),
  );
}
