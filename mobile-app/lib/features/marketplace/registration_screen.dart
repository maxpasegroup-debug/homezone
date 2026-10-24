import 'dart:async';
import 'package:flutter/material.dart';
import '../../app/session_scope.dart';
import '../../core/api/api_client.dart';
import '../auth/sign_in_controller.dart';
import '../auth/validators.dart';
import 'marketplace_repository.dart';

/// Registration never creates trusted identity. Only the owned sign-in protocol
/// can publish it, after a separate Auth.js session response has been verified.
class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key, required this.repository, this.clock});
  final MarketplaceRepository repository;
  // Display/cooldown feedback only. Actual expiry is always server-enforced.
  final DateTime Function()? clock;
  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen>
    with RouteAware {
  DateTime get _now => (widget.clock ?? DateTime.now)();
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController(),
      _email = TextEditingController(),
      _password = TextEditingController(),
      _confirmation = TextEditingController(),
      _code = TextEditingController();
  RouteObserver<ModalRoute<dynamic>>? _observer;
  SignInOperation? _operation;
  Timer? _timer;
  String? _challenge, _message;
  DateTime? _expires, _resendAt, _retryAt;
  bool _retryUnknown = false;
  bool _busy = false, _emailVerified = false, _abandoned = false;
  int _epoch = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _observer?.unsubscribe(this);
    _observer = SessionScope.observerOf(context);
    final route = ModalRoute.of(context);
    if (route != null) _observer?.subscribe(this, route);
  }

  void _abandon() {
    _epoch++;
    _abandoned = true;
    _operation?.cancel();
    _timer?.cancel();
    _password.clear();
    _confirmation.clear();
    _code.clear();
  }

  @override
  void didPushNext() => _abandon();
  @override
  void didPop() => _abandon();
  @override
  void didPopNext() {
    if (!mounted) return;
    setState(() {
      _abandoned = false;
      _busy = false;
      _challenge = null;
      _emailVerified = false;
    });
  }

  @override
  void dispose() {
    _observer?.unsubscribe(this);
    _abandon();
    _timer?.cancel();
    for (final field in [_name, _email, _password, _confirmation, _code]) {
      field.dispose();
    }
    super.dispose();
  }

  bool get _expired => _expires != null && !_now.isBefore(_expires!);
  bool get _retryBlocked =>
      _retryUnknown || (_retryAt != null && _now.isBefore(_retryAt!));
  bool get _canResend =>
      !_retryBlocked &&
      !_expired &&
      _resendAt != null &&
      !_now.isBefore(_resendAt!);
  int _secondsUntil(DateTime? deadline) => deadline == null
      ? 0
      : (deadline.difference(_now).inMicroseconds /
                Duration.microsecondsPerSecond)
            .ceil()
            .clamp(0, 86400);
  void _tick() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  bool _current(int epoch, int generation) =>
      mounted &&
      !_abandoned &&
      epoch == _epoch &&
      widget.repository.coordinator.generation == generation;

  Future<void> _submit({bool resend = false}) async {
    if (_busy ||
        _abandoned ||
        _retryBlocked ||
        (resend && !_canResend) ||
        (!resend && _challenge != null && !_emailVerified && _expired)) {
      return;
    }
    if (!resend && !_emailVerified && !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    final epoch = ++_epoch;
    final generation = widget.repository.coordinator.generation;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      if (_challenge == null || resend) {
        final data = await widget.repository.call(
          'POST',
          resend
              ? '/api/auth/password/signup/resend'
              : '/api/auth/password/signup',
          protected: false,
          body: resend
              ? {'challengeId': _challenge}
              : {
                  'name': _name.text.trim(),
                  'email': _email.text.trim().toLowerCase(),
                  'password': _password.text,
                },
        );
        if (!_current(epoch, generation)) return;
        final expiresIn = data['expiresIn'], resendAfter = data['resendAfter'];
        final expires = data['expiresAt'] is String
            ? DateTime.tryParse(data['expiresAt'] as String)
            : null;
        final resendAt = data['resendAt'] is String
            ? DateTime.tryParse(data['resendAt'] as String)
            : null;
        if (data['challengeId'] is! String ||
            !RegExp(
              r'^[a-f0-9]{64}$',
            ).hasMatch(data['challengeId'] as String) ||
            expiresIn is! int ||
            expiresIn < 1 ||
            expiresIn > 600 ||
            resendAfter is! int ||
            resendAfter < 0 ||
            resendAfter > 86400 ||
            expires == null ||
            resendAt == null) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
        setState(() {
          _challenge = data['challengeId'] as String;
          final relativeExpiry = _now.add(Duration(seconds: expiresIn));
          final relativeResend = _now.add(Duration(seconds: resendAfter));
          _expires = expires.isBefore(relativeExpiry)
              ? expires
              : relativeExpiry;
          _resendAt = resendAt.isAfter(relativeResend)
              ? resendAt
              : relativeResend;
          _retryAt = null;
          _retryUnknown = false;
          _message =
              'Check your email. Existing accounts can use sign-in or password recovery.';
          _code.clear();
          _confirmation.clear();
        });
        _tick();
        return;
      }
      if (!_emailVerified) {
        final data = await widget.repository.call(
          'POST',
          '/api/auth/password/signup/verify',
          protected: false,
          body: {'challengeId': _challenge, 'code': _code.text.trim()},
        );
        if (!_current(epoch, generation)) return;
        if (data['verified'] != true) {
          throw const ApiException(ApiFailure.invalidResponse);
        }
        _emailVerified = true;
        _code.clear();
        _timer?.cancel();
      }
      if (!_current(epoch, generation)) return;
      final operation = widget.repository.session.beginSignIn(
        _email.text.trim().toLowerCase(),
        _password.text,
      );
      _operation = operation;
      final outcome = await operation.result;
      if (!mounted || _abandoned || epoch != _epoch) return;
      if (outcome.verified && widget.repository.session.verified) {
        _password.clear();
        Navigator.pushNamedAndRemoveUntil(context, '/buyer', (_) => false);
      } else {
        setState(
          () => _message =
              'Email verified. ${outcome.message ?? 'Secure sign-in could not be confirmed.'} You can retry or use sign-in/password recovery.',
        );
      }
    } catch (error) {
      if (_current(epoch, generation)) {
        setState(
          () => _message =
              error is ApiException && error.status == 400 && _challenge != null
              ? 'Code incorrect, expired or exhausted. Request a new code after the cooldown, or restart if the challenge is unavailable.'
              : marketplaceError(error, mutation: true),
        );
        if (error is ApiException && error.failure == ApiFailure.rateLimited) {
          final seconds = error.retryAfterSeconds;
          setState(() {
            if (seconds == null || seconds < 1 || seconds > 86400) {
              _retryUnknown = true;
              _message =
                  'Too many attempts. The wait time could not be confirmed. Please leave registration and try later.';
            } else {
              final deadline = _now.add(Duration(seconds: seconds));
              if (_retryAt == null || deadline.isAfter(_retryAt!)) {
                _retryAt = deadline;
              }
              if (_resendAt == null || deadline.isAfter(_resendAt!)) {
                _resendAt = deadline;
              }
              _message =
                  'Too many attempts. Wait for the server retry timer before trying again.';
            }
          });
          _tick();
        }
      }
    } finally {
      if (mounted && epoch == _epoch) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final verifying = _challenge != null;
    final remaining = _secondsUntil(_resendAt);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          verifying ? 'Verify your email' : 'Create HOMEZONE account',
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                verifying ? 'One more step' : 'Find your next home',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 12),
              Text(
                verifying
                    ? 'Enter the six-digit code for your email. Verification is followed by secure sign-in. Profile details can be completed later.'
                    : 'Create a buyer account with your name, email and password. Your email must be verified before a new account can be used.',
              ),
              const SizedBox(height: 24),
              if (!verifying) ...[
                TextFormField(
                  controller: _name,
                  enabled: !_busy,
                  maxLength: 120,
                  validator: AuthValidators.name,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                TextFormField(
                  controller: _email,
                  enabled: !_busy,
                  maxLength: 254,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  validator: AuthValidators.email,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                TextFormField(
                  controller: _password,
                  enabled: !_busy,
                  maxLength: 128,
                  obscureText: true,
                  enableSuggestions: false,
                  autocorrect: false,
                  validator: AuthValidators.newPassword,
                  decoration: const InputDecoration(labelText: 'Password'),
                ),
                TextFormField(
                  controller: _confirmation,
                  enabled: !_busy,
                  maxLength: 128,
                  obscureText: true,
                  enableSuggestions: false,
                  autocorrect: false,
                  validator: (value) =>
                      value == _password.text ? null : 'Passwords must match.',
                  decoration: const InputDecoration(
                    labelText: 'Confirm password',
                  ),
                ),
                const Text(
                  'Your registration details are used to create your account. No marketing consent is assumed. Only proceed on an authorized HOMEZONE environment.',
                ),
              ] else if (!_emailVerified) ...[
                TextFormField(
                  controller: _code,
                  enabled: !_busy,
                  maxLength: 6,
                  keyboardType: TextInputType.number,
                  enableSuggestions: false,
                  autocorrect: false,
                  validator: (value) =>
                      RegExp(r'^\d{6}$').hasMatch(value?.trim() ?? '')
                      ? null
                      : 'Enter the six-digit code.',
                  decoration: const InputDecoration(
                    labelText: 'Verification code',
                  ),
                ),
                Text(
                  _expired
                      ? 'Code expired. Restart registration to request a new challenge.'
                      : 'Use the newest code before it expires. The server enforces expiry and attempts.',
                ),
                TextButton(
                  onPressed: !_busy && _canResend
                      ? () => _submit(resend: true)
                      : null,
                  child: Text(
                    _expired
                        ? 'Restart required'
                        : _canResend
                        ? 'Resend code'
                        : 'Resend available in ${remaining}s',
                  ),
                ),
              ],
              if (_message != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(_message!, semanticsLabel: _message),
                ),
              if (_retryAt != null && _now.isBefore(_retryAt!))
                Text('Try again in ${_secondsUntil(_retryAt)}s'),
              FilledButton(
                onPressed:
                    _busy ||
                        _retryBlocked ||
                        (verifying && !_emailVerified && _expired)
                    ? null
                    : _submit,
                child: Text(
                  _busy
                      ? 'Please wait...'
                      : _emailVerified
                      ? 'Retry secure sign-in'
                      : verifying
                      ? 'Verify and continue'
                      : 'Create account',
                ),
              ),
              if (verifying)
                TextButton(
                  onPressed: _busy
                      ? null
                      : () {
                          setState(() {
                            _challenge = null;
                            _emailVerified = false;
                            _code.clear();
                            _message = null;
                          });
                          if (_retryAt != null && _now.isBefore(_retryAt!)) {
                            _tick();
                          } else {
                            _timer?.cancel();
                          }
                        },
                  child: const Text('Restart registration'),
                ),
              TextButton(
                onPressed: _busy
                    ? null
                    : () => Navigator.pushReplacementNamed(context, '/sign-in'),
                child: const Text('Already have an account? Sign in'),
              ),
              const Text(
                'Account access is service-backed. Offline buyer preview is available separately. Credentials remain in memory only.',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
