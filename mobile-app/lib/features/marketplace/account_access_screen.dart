import 'package:flutter/material.dart';
import '../auth/validators.dart';
import 'marketplace_repository.dart';

class AccountAccessScreen extends StatefulWidget {
  const AccountAccessScreen({
    super.key,
    required this.repository,
    this.reset = false,
  });
  final MarketplaceRepository repository;
  final bool reset;
  @override
  State<AccountAccessScreen> createState() => _AccountAccessScreenState();
}

class _AccountAccessScreenState extends State<AccountAccessScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController(),
      token = TextEditingController(),
      password = TextEditingController();
  bool busy = false, complete = false;
  String? error;
  @override
  void dispose() {
    email.dispose();
    token.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || complete || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final response = await widget.repository.call(
        'POST',
        widget.reset ? '/api/auth/password/reset' : '/api/auth/password/forgot',
        protected: false,
        body: widget.reset
            ? {'token': token.text.trim(), 'password': password.text}
            : {'email': email.text.trim().toLowerCase()},
      );
      if (response['message'] is! String) throw const FormatException();
      if (mounted) {
        password.clear();
        token.clear();
        setState(() => complete = true);
      }
    } catch (failure) {
      if (mounted) {
        setState(() => error = marketplaceError(failure, mutation: true));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.reset ? 'Reset password' : 'Recover account'),
    ),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (complete)
            Text(
              widget.reset
                  ? 'The server confirmed the password reset. Sign in again.'
                  : 'If an account exists and email delivery is available, reset instructions will be sent. Delivery is not confirmed by this response.',
            )
          else ...[
            if (!widget.reset)
              TextFormField(
                controller: email,
                enabled: !busy,
                keyboardType: TextInputType.emailAddress,
                validator: AuthValidators.email,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
            if (widget.reset) ...[
              const Text(
                'Use the reset token from your approved HOMEZONE reset link. Automatic app-link handling is not configured.',
              ),
              TextFormField(
                controller: token,
                enabled: !busy,
                obscureText: true,
                enableSuggestions: false,
                autocorrect: false,
                maxLength: 256,
                decoration: const InputDecoration(labelText: 'Reset token'),
                validator: (value) => (value?.trim().length ?? 0) < 32
                    ? 'Enter a valid reset token.'
                    : null,
              ),
              TextFormField(
                controller: password,
                enabled: !busy,
                obscureText: true,
                enableSuggestions: false,
                autocorrect: false,
                maxLength: 128,
                validator: AuthValidators.newPassword,
                decoration: const InputDecoration(labelText: 'New password'),
              ),
            ],
            if (error != null) Text(error!),
            FilledButton(
              onPressed: busy ? null : submit,
              child: Text(
                busy
                    ? 'Submitting…'
                    : widget.reset
                    ? 'Reset password'
                    : 'Request instructions',
              ),
            ),
          ],
          if (!widget.reset)
            TextButton(
              onPressed: busy
                  ? null
                  : () => Navigator.pushNamed(context, '/reset-password'),
              child: const Text('I have a reset token'),
            ),
          TextButton(
            onPressed: busy
                ? null
                : () => Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/sign-in',
                    (_) => false,
                  ),
            child: const Text('Back to sign in'),
          ),
        ],
      ),
    ),
  );
}

class RegistrationUnavailableScreen extends StatelessWidget {
  const RegistrationUnavailableScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Account registration')),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'Registration is not enabled in this mobile build. Approved privacy, consent, support and account-deletion workflows are required before enabling account creation. Existing accounts can sign in.',
        ),
        FilledButton(
          onPressed: () => Navigator.pushNamedAndRemoveUntil(
            context,
            '/sign-in',
            (_) => false,
          ),
          child: const Text('Sign in'),
        ),
      ],
    ),
  );
}
