import 'package:flutter/material.dart';
import '../../shared/ui/auth_components.dart';
import '../../theme/design_tokens.dart';
import 'validators.dart';
import 'sign_in_controller.dart';
import '../../app/session_scope.dart';
import '../../core/api/api_client.dart';
import '../marketplace/marketplace_repository.dart';

enum AuthFormMode { signIn, signUp, forgotPassword, resetPassword }

class AuthFormScreen extends StatefulWidget {
  const AuthFormScreen({
    super.key,
    required this.mode,
    this.signInController,
    this.serviceMode = false,
    this.selectedRole,
    this.repository,
  });
  final AuthFormMode mode;
  final SignInController? signInController;
  final bool serviceMode;
  final String? selectedRole;
  final MarketplaceRepository? repository;
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
    _cancelProfileConfirmation?.call();
    _signInEpoch++;
    _registrationEpoch++;
  }

  @override
  void didPop() {
    _operation?.cancel();
    _cancelProfileConfirmation?.call();
    _signInEpoch++;
    _registrationEpoch++;
  }

  @override
  void didPopNext() {
    if (mounted && loading && widget.mode == AuthFormMode.signIn) {
      setState(() {
        loading = false;
        password.clear();
        outcome = 'Sign-in was interrupted. Please try again.';
      });
    }
    if (mounted && loading && widget.mode == AuthFormMode.signUp) {
      setState(() {
        loading = false;
        _submitted = true;
        outcome = 'A registration request may have completed. Try signing in before registering again.';
      });
    }
  }

  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      email = TextEditingController(),
      password = TextEditingController(),
      confirmation = TextEditingController();
  bool loading = false;
  String? outcome;
  SignInOperation? _operation;
  VoidCallback? _cancelProfileConfirmation;
  bool _termsAccepted = false, _submitted = false;
  int _registrationEpoch = 0;
  int _signInEpoch = 0;
  String? get selectedRole {
    final value = widget.selectedRole ?? ModalRoute.of(context)?.settings.arguments;
    return value is String ? value : null;
  }
  @override
  void dispose() {
    _routeObserver?.unsubscribe(this);
    _operation?.cancel();
    _cancelProfileConfirmation?.call();
    name.dispose();
    email.dispose();
    password.dispose();
    confirmation.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (loading || _submitted || !form.currentState!.validate()) return;
    if (widget.serviceMode && widget.mode == AuthFormMode.signUp) {
      await register();
      return;
    }
    // Recovery still needs the existing secure token/link integration.
    if (widget.serviceMode && widget.mode != AuthFormMode.signIn) {
      setState(() => outcome = 'Password recovery is not available in the app yet. No reset request was sent.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      loading = true;
      outcome = null;
    });
    if (widget.mode == AuthFormMode.signIn) {
      await signIn();
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

  Future<void> signIn() async {
    final controller = widget.signInController;
    final repository = widget.repository;
    final expectedRole = selectedRole;
    const publicRoles = {'USER', 'OWNER', 'BROKER', 'BUILDER', 'SERVICE_PROVIDER'};
    if (controller == null || (widget.serviceMode &&
        (repository == null || !identical(repository.session, controller)))) {
      setState(() {
        loading = false;
        outcome = 'Sign-in is not configured. You are not signed in.';
      });
      return;
    }
    if (widget.serviceMode && expectedRole != null && !publicRoles.contains(expectedRole)) {
      setState(() { loading = false; outcome = 'Go back and choose a supported account type.'; });
      return;
    }
    final epoch = ++_signInEpoch;
    bool current() => mounted && epoch == _signInEpoch;
    VerifiedIdentity? authenticated;
    int? generation;
    bool sameAccount() => authenticated != null && controller.verified &&
        controller.identity?.id == authenticated!.id &&
        controller.identity?.role == authenticated!.role &&
        (repository == null || repository.coordinator.generation == generation);
    Future<bool> rejectSession() async {
      if (!sameAccount()) return false;
      final acknowledged = await controller.signOut();
      // A busy controller may decline logout. Drop only this captured account's
      // authority, never a newer account, and never claim revocation succeeded.
      if (!acknowledged && sameAccount()) controller.clearLocalSession();
      return acknowledged && controller.credentialRemovalConfirmed;
    }
    try {
      final operation = controller.beginSignIn(email.text.trim().toLowerCase(), password.text);
      _operation = operation;
      final result = await operation.result;
      if (!current()) return;
      if (!result.verified || !controller.verified) {
        setState(() => outcome = result.message ?? 'Sign-in could not be confirmed.');
        return;
      }
      authenticated = controller.identity;
      generation = repository?.coordinator.generation;
      _cancelProfileConfirmation = () {
        if (sameAccount()) controller.clearLocalSession();
      };
      final role = widget.serviceMode
          ? (await repository!.confirmedProfile())['role']
          : authenticated!.role;
      if (!current()) return;
      if (!sameAccount()) {
        setState(() => outcome = 'Your session changed. Please sign in again.');
        return;
      }
      if (expectedRole != null && role != expectedRole) {
        final revoked = await rejectSession();
        if (!current()) return;
        setState(() => outcome =
            'This account does not match the selected role. Go back and choose the correct role. No account role was changed.${revoked ? '' : ' Server sign-out or device credential removal could not be confirmed.'}');
        return;
      }
      _cancelProfileConfirmation = null;
      Navigator.pushNamedAndRemoveUntil(context, '/buyer', (_) => false);
    } catch (error) {
      final revoked = await rejectSession();
      if (!current()) return;
      setState(() => outcome =
          '${marketplaceError(error)} Your profile and role could not be confirmed. Please sign in again.${authenticated != null && !revoked ? ' Server sign-out or device credential removal could not be confirmed.' : ''}');
    } finally {
      if (current()) {
        password.clear();
        _operation = null;
        _cancelProfileConfirmation = null;
        setState(() => loading = false);
      }
    }
  }

  Future<void> register() async {
    final repository = widget.repository;
    final role = selectedRole;
    const roles = {'USER', 'OWNER', 'BROKER', 'BUILDER', 'SERVICE_PROVIDER'};
    if (repository == null || !roles.contains(role) || !_termsAccepted) {
      setState(() => outcome = 'Choose a role and acknowledge Terms & Privacy before creating an account.');
      return;
    }
    if (!repository.session.prepareRegistration()) {
      setState(() => outcome = 'Account access is busy. Return to sign-in and try again.');
      return;
    }
    final payload = <String, Object?>{
      'name': name.text.trim(),
      'email': email.text.trim().toLowerCase(),
      'password': password.text,
      'role': role,
      'termsAccepted': _termsAccepted,
    };
    final epoch = ++_registrationEpoch;
    final generation = repository.coordinator.generation;
    bool current() => mounted && epoch == _registrationEpoch &&
        generation == repository.coordinator.generation;
    FocusScope.of(context).unfocus();
    setState(() { loading = true; outcome = null; });
    try {
      final response = await repository.call('POST', '/api/mobile/auth/email-register',
        protected: false, body: payload);
      if (!current()) return;
      if (response['message'] != 'Continue with secure sign-in.' ||
          response['consentRecorded'] != false) {
        throw const ApiException(ApiFailure.invalidResponse);
      }
      password.clear();
      setState(() {
        _submitted = true;
        outcome = 'Registration submitted. Continue to sign in with your email and password. Existing accounts are unchanged. No versioned legal consent was recorded.';
      });
    } catch (error) {
      if (!current()) return;
      final uncertain = error is! ApiException ||
          !{ApiFailure.validation, ApiFailure.forbidden, ApiFailure.unauthorized,
            ApiFailure.rateLimited, ApiFailure.notFound}.contains(error.failure);
      setState(() {
        _submitted = uncertain;
        outcome = '${marketplaceError(error, mutation: true)}${uncertain ? ' The account may exist. Try signing in before registering again.' : ''}';
      });
    } finally {
      if (mounted && epoch == _registrationEpoch) {
        setState(() {
          loading = false;
          if (generation != repository.coordinator.generation) {
            _submitted = true;
            outcome = 'Your account session changed. Return to sign-in before making another registration request.';
          }
        });
      }
    }
  }

  void socialPreview(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          widget.serviceMode
              ? '$provider sign-in is not available in this app yet. No authentication occurred.'
              : '$provider sign-in is a UI preview only. No authentication occurred.',
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
      AuthFormMode.forgotPassword => widget.serviceMode
        ? 'Enter your email address' : 'Enter your email to preview reset instructions',
      AuthFormMode.resetPassword => 'Enter your new password',
    };
    final action = switch (mode) {
      AuthFormMode.signIn => 'Sign In',
      AuthFormMode.signUp => 'Create Account',
      AuthFormMode.forgotPassword => 'Send Reset Link',
      AuthFormMode.resetPassword => 'Update Password',
    };
    final role = selectedRole;
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
          if (role != null && (signup || mode == AuthFormMode.signIn))
            Padding(
              padding: const EdgeInsets.only(top: Space.sm),
              child: Text(
                'Selected role: ${role == 'USER' ? 'Property Buyer' : role.replaceAll('_', ' ')}',
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
                      enabled: !loading && !_submitted,
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
                      enabled: !loading && !_submitted,
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
                      enabled: !loading && !_submitted,
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
                          : 'Please agree to Terms & Privacy Policy.',
                      builder: (field) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            controlAffinity: ListTileControlAffinity.leading,
                            value: field.value ?? false,
                            onChanged: loading || _submitted ? null : (value) {
                              _termsAccepted = value == true;
                              field.didChange(value);
                            },
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
                                      content: Text(
                                        widget.serviceMode
                                            ? 'Approved Terms and Privacy documents have not been supplied in this build. The checkbox acknowledgment is validated during registration, but no versioned legal-consent record is stored.'
                                            : 'UI preview only. Approved legal documents must be supplied before registration is enabled. No consent is stored.',
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
                            child: Text(
                              widget.serviceMode ? 'Terms & Privacy Policy' : 'View preview consent information',
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
                    onPressed: _submitted ? null : submit,
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
                        : Navigator.pushNamed(context, '/sign-in', arguments: selectedRole),
              child: Text(
                mode == AuthFormMode.signIn
                    ? "Don't have an account? Sign Up"
                    : signup
                    ? _submitted ? 'Continue to Sign In' : 'Already have an account? Sign In'
                    : 'Back to Sign In',
              ),
            ),
          ),
          const SizedBox(height: Space.md),
          PreviewNotice(
            message:
                outcome ??
                (widget.serviceMode
                    ? signup
                        ? 'Registration uses the configured HOMEZONE service. Approved policy documents and versioned consent storage are not supplied in this build.'
                        : (forgot || reset)
                            ? 'Password recovery is not connected in this app yet. No reset request has been sent.'
                            : 'Sign-in uses the configured HOMEZONE service. Your session must be confirmed by the server.'
                    : reset
                    ? 'Local UI preview. No reset link is verified and no password will change.'
                    : 'Local UI preview. No account, sign-in or email service is connected.'),
          ),
          if (mode == AuthFormMode.signIn)
            TextButton(
              onPressed: loading
                  ? null
                  : () {
                      widget.signInController?.clearLocalSession();
                      Navigator.pushNamed(
                        context,
                        widget.serviceMode ? '/buyer-preview' : '/buyer',
                      );
                    },
              child: const Text('Explore buyer preview'),
            ),
        ],
      ),
    );
  }
}
