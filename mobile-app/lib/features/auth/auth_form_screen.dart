import 'package:flutter/material.dart';
import '../../shared/ui/auth_components.dart';
import '../../theme/design_tokens.dart';
import 'validators.dart';
import 'sign_in_controller.dart';
import '../../app/session_scope.dart';

enum AuthFormMode { signIn, signUp, forgotPassword, resetPassword }

class AuthFormScreen extends StatefulWidget {
  const AuthFormScreen({super.key, required this.mode, this.signInController});
  final AuthFormMode mode;
  final SignInController? signInController;
  @override
  State<AuthFormScreen> createState() => _AuthFormScreenState();
}

class _AuthFormScreenState extends State<AuthFormScreen> with RouteAware {
  RouteObserver<ModalRoute<dynamic>>? _routeObserver;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _routeObserver?.unsubscribe(this);
    _routeObserver = SessionScope.observerOf(context);
    final route = ModalRoute.of(context);
    if (route != null) _routeObserver?.subscribe(this, route);
  }

  @override
  void didPushNext() {
    _operation?.cancel();
  }

  @override
  void didPop() {
    _operation?.cancel();
  }

  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      email = TextEditingController(),
      password = TextEditingController(),
      confirmation = TextEditingController();
  bool loading = false;
  String? outcome;
  SignInOperation? _operation;
  @override
  void dispose() {
    _routeObserver?.unsubscribe(this);
    _operation?.cancel();
    name.dispose();
    email.dispose();
    password.dispose();
    confirmation.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (loading || !form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      loading = true;
      outcome = null;
    });
    if (widget.mode == AuthFormMode.signIn) {
      final controller = widget.signInController;
      if (controller == null) {
        setState(() {
          loading = false;
          outcome = 'Sign-in is not configured. You are not signed in.';
        });
        return;
      }
      final operation = controller.beginSignIn(email.text, password.text);
      _operation = operation;
      final result = await operation.result;
      if (!mounted) return;
      password.clear();
      setState(() {
        loading = false;
        outcome = result.message;
      });
      if (result.verified && controller.verified) {
        Navigator.pushNamedAndRemoveUntil(context, '/buyer', (route) => false);
      }
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() {
      loading = false;
    });
    switch (widget.mode) {
      case AuthFormMode.signIn:
        setState(
          () => outcome = 'Local preview complete. You are not signed in.',
        );
      case AuthFormMode.signUp:
        Navigator.pushNamed(context, '/success', arguments: 'account');
      case AuthFormMode.forgotPassword:
        Navigator.pushNamed(
          context,
          '/check-email',
          arguments: email.text.trim(),
        );
      case AuthFormMode.resetPassword:
        Navigator.pushNamed(context, '/success', arguments: 'password');
    }
  }

  void socialPreview(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$provider sign-in is a UI preview only. No authentication occurred.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mode = widget.mode;
    final signup = mode == AuthFormMode.signUp,
        reset = mode == AuthFormMode.resetPassword,
        forgot = mode == AuthFormMode.forgotPassword;
    final title = switch (mode) {
      AuthFormMode.signIn => 'Welcome Back',
      AuthFormMode.signUp => 'Create Account',
      AuthFormMode.forgotPassword => 'Reset Password',
      AuthFormMode.resetPassword => 'Set New Password',
    };
    final subtitle = switch (mode) {
      AuthFormMode.signIn => 'Sign in to your account',
      AuthFormMode.signUp => 'Join Homezone and get started',
      AuthFormMode.forgotPassword =>
        'Enter your email to preview reset instructions',
      AuthFormMode.resetPassword => 'Enter your new password',
    };
    final action = switch (mode) {
      AuthFormMode.signIn => 'Sign In',
      AuthFormMode.signUp => 'Create Account',
      AuthFormMode.forgotPassword => 'Send Reset Link',
      AuthFormMode.resetPassword => 'Update Password',
    };
    final selectedRole = ModalRoute.of(context)?.settings.arguments;
    return AuthLayout(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: Space.md),
          Center(
            child: Text(
              title,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ),
          const SizedBox(height: Space.sm),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          if (signup && selectedRole is String)
            Padding(
              padding: const EdgeInsets.only(top: Space.sm),
              child: Text(
                'Selected role: $selectedRole',
                textAlign: TextAlign.center,
              ),
            ),
          const SizedBox(height: Space.xl),
          AutofillGroup(
            child: Form(
              key: form,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              child: Column(
                children: [
                  if (signup) ...[
                    AppInput(
                      label: 'Full name',
                      controller: name,
                      icon: AppIcons.person,
                      validator: AuthValidators.name,
                      autofillHints: const [AutofillHints.name],
                      enabled: !loading,
                    ),
                    const SizedBox(height: Space.md),
                  ],
                  if (!reset) ...[
                    AppInput(
                      label: 'Email address',
                      controller: email,
                      icon: AppIcons.email,
                      validator: AuthValidators.email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      next: !forgot,
                      enabled: !loading,
                    ),
                    const SizedBox(height: Space.md),
                  ],
                  if (!forgot) ...[
                    PasswordInput(
                      label: reset ? 'New password' : 'Password',
                      controller: password,
                      validator: signup || reset
                          ? AuthValidators.newPassword
                          : AuthValidators.requiredPassword,
                      newPassword: signup || reset,
                      enabled: !loading,
                    ),
                    if (signup || reset)
                      Padding(
                        padding: const EdgeInsets.only(top: Space.sm),
                        child: Text(
                          'At least 8 characters, uppercase, lowercase and a number.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    if (reset) ...[
                      const SizedBox(height: Space.md),
                      PasswordInput(
                        label: 'Confirm password',
                        controller: confirmation,
                        validator: (value) =>
                            value == password.text && (value ?? '').isNotEmpty
                            ? null
                            : 'Passwords must match.',
                        newPassword: true,
                        enabled: !loading,
                      ),
                    ],
                  ],
                  if (signup) ...[
                    const SizedBox(height: Space.md),
                    FormField<bool>(
                      initialValue: false,
                      validator: (value) => value == true
                          ? null
                          : 'Please agree to the preview terms and privacy consent.',
                      builder: (field) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            controlAffinity: ListTileControlAffinity.leading,
                            value: field.value ?? false,
                            onChanged: loading ? null : field.didChange,
                            title: const Text(
                              'I agree to Terms & Privacy Policy',
                              style: TextStyle(fontSize: 13),
                            ),
                          ),
                          TextButton(
                            onPressed: loading
                                ? null
                                : () => showDialog<void>(
                                    context: context,
                                    builder: (_) => AlertDialog(
                                      title: const Text(
                                        'Terms & Privacy Policy',
                                      ),
                                      content: const Text(
                                        'UI preview only. Approved legal documents must be supplied before registration is enabled. No consent is stored.',
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(context),
                                          child: const Text('Close'),
                                        ),
                                      ],
                                    ),
                                  ),
                            child: const Text(
                              'View preview consent information',
                            ),
                          ),
                          if (field.hasError)
                            Text(
                              field.errorText!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                  if (mode == AuthFormMode.signIn)
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: loading
                            ? null
                            : () => Navigator.pushNamed(
                                context,
                                '/forgot-password',
                              ),
                        child: const Text('Forgot Password?'),
                      ),
                    ),
                  const SizedBox(height: Space.lg),
                  PrimaryButton(
                    label: action,
                    loading: loading,
                    onPressed: submit,
                  ),
                ],
              ),
            ),
          ),
          if (signup || mode == AuthFormMode.signIn) ...[
            const SizedBox(height: Space.lg),
            Text(
              'or continue with',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: Space.sm),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: Space.md,
              runSpacing: Space.sm,
              children: [
                OutlinedButton(
                  onPressed: loading ? null : () => socialPreview('Google'),
                  child: const Text('Google'),
                ),
                OutlinedButton.icon(
                  onPressed: loading ? null : () => socialPreview('Apple'),
                  icon: const Icon(Icons.apple),
                  label: const Text('Apple'),
                ),
              ],
            ),
          ],
          const SizedBox(height: Space.md),
          Center(
            child: TextButton(
              onPressed: loading
                  ? null
                  : () => mode == AuthFormMode.signIn
                        ? Navigator.pushNamed(context, '/roles')
                        : Navigator.pushNamedAndRemoveUntil(
                            context,
                            '/sign-in',
                            (route) => false,
                          ),
              child: Text(
                mode == AuthFormMode.signIn
                    ? "Don't have an account? Sign Up"
                    : signup
                    ? 'Already have an account? Sign In'
                    : 'Back to Sign In',
              ),
            ),
          ),
          const SizedBox(height: Space.md),
          PreviewNotice(
            message:
                outcome ??
                (reset
                    ? 'Local UI preview. No reset link is verified and no password will change.'
                    : 'Local UI preview. No account, sign-in or email service is connected.'),
          ),
          if (mode == AuthFormMode.signIn)
            TextButton(
              onPressed: loading
                  ? null
                  : () {
                      widget.signInController?.clearLocalSession();
                      Navigator.pushNamed(context, '/buyer');
                    },
              child: const Text('Explore buyer preview'),
            ),
        ],
      ),
    );
  }
}
