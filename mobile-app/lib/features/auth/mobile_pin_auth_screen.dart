import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../app/session_scope.dart';
import '../../shared/ui/auth_components.dart';
import '../marketplace/marketplace_repository.dart';
import 'sign_in_controller.dart';

/// Active service authentication only. Fictional preview remains a separate route.
class MobilePinAuthScreen extends StatefulWidget {
  const MobilePinAuthScreen({
    super.key,
    required this.repository,
    required this.selectedRole,
    this.register = false,
  });
  final MarketplaceRepository repository;
  final bool register;
  final String selectedRole;
  @override
  State<MobilePinAuthScreen> createState() => _MobilePinAuthState();
}

class _MobilePinAuthState extends State<MobilePinAuthScreen> with RouteAware {
  final _form = GlobalKey<FormState>();
  final _phone = TextEditingController(),
      _pin = TextEditingController(),
      _confirm = TextEditingController();
  RouteObserver<ModalRoute<dynamic>>? _observer;
  SignInOperation? _operation;
  bool _busy = false, _abandoned = false, _submitted = false;
  String? _message;
  int _epoch = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _observer?.unsubscribe(this);
    _observer = SessionScope.observerOf(context);
    final route = ModalRoute.of(context);
    if (route != null) _observer?.subscribe(this, route);
  }

  void _leave() {
    _epoch++;
    _abandoned = true;
    _operation?.cancel();
    _pin.clear();
    _confirm.clear();
  }

  @override
  void didPushNext() => _leave();
  @override
  void didPop() => _leave();
  @override
  void didPopNext() {
    if (mounted) {
      setState(() {
        _abandoned = false;
        _busy = false;
      });
    }
  }

  @override
  void dispose() {
    _observer?.unsubscribe(this);
    _leave();
    _phone.dispose();
    _pin.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? _mobile(String? value) {
    final raw = value ?? '';
    if (raw.length > 32 || RegExp(r'[^+0-9 ()\-]').hasMatch(raw)) {
      return 'Enter a valid Indian mobile number.';
    }
    final compact = raw.replaceAll(RegExp(r'[ ()\-]'), '');
    final national = compact.startsWith('+91')
        ? compact.substring(3)
        : compact.length == 12 && compact.startsWith('91')
        ? compact.substring(2)
        : compact;
    return national.length == 10 &&
            RegExp(r'^[6-9][0-9]{9}$').hasMatch(national)
        ? null
        : 'Enter a valid Indian mobile number (+91).';
  }

  String? _validatePin(String? value) =>
      RegExp(r'^[0-9]{6}$').hasMatch(value ?? '') && value?.length == 6
      ? null
      : 'Enter exactly six digits.';

  Future<void> _submit() async {
    if (_busy || _abandoned || _submitted || !_form.currentState!.validate()) {
      return;
    }
    final mobile = _phone.text.trim(),
        pin = _pin.text,
        confirmation = _confirm.text;
    final repository = widget.repository;
    if (widget.register && !repository.session.prepareRegistration()) {
      setState(
        () => _message =
            'Account access is busy. Return to sign-in and try again.',
      );
      return;
    }
    FocusScope.of(context).unfocus();
    final epoch = ++_epoch, generation = repository.coordinator.generation;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      if (widget.register) {
        final response = await repository.call(
          'POST',
          '/api/mobile/auth/register',
          protected: false,
          body: {
            'mobileNumber': mobile,
            'pin': pin,
            'confirmPin': confirmation,
            'role': widget.selectedRole,
          },
        );
        if (!mounted ||
            _abandoned ||
            epoch != _epoch ||
            generation != repository.coordinator.generation) {
          return;
        }
        if (response['message'] is! String) throw const FormatException();
        _pin.clear();
        _confirm.clear();
        setState(() {
          _submitted = true;
          _message =
              'Registration submitted. Sign in with your mobile number and PIN. Existing accounts are not changed.';
        });
      } else {
        _operation = repository.session.beginSignIn(
          mobile,
          pin,
          mobilePin: true,
        );
        final result = await _operation!.result;
        if (!mounted || _abandoned || epoch != _epoch) return;
        _pin.clear();
        if (result.verified && repository.session.verified) {
          final profileResponse = await repository.call(
            'GET',
            '/api/mobile/account',
            query: {'view': 'profile'},
          );
          if (!mounted || _abandoned || epoch != _epoch) return;
          final profile = object(profileResponse['profile']);
          if (profile['role'] != repository.session.identity?.role ||
              profile['role'] != widget.selectedRole) {
            await repository.session.signOut();
            if (!mounted || _abandoned || epoch != _epoch) return;
            setState(
              () => _message =
                  'This account does not match the selected account type. Go back and choose the correct type. No account role was changed.',
            );
            return;
          }
          Navigator.pushNamedAndRemoveUntil(context, '/buyer', (_) => false);
        } else {
          setState(
            () =>
                _message = result.message ?? 'Sign-in could not be confirmed.',
          );
        }
      }
    } catch (error) {
      if (mounted && !_abandoned && epoch == _epoch) {
        setState(
          () => _message = widget.register
              ? '${marketplaceError(error, mutation: true)} If confirmation was lost, the account may exist. Try signing in before registering again.'
              : marketplaceError(error),
        );
      }
    } finally {
      if (mounted && epoch == _epoch) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AuthLayout(
    child: Form(
      key: _form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.register ? 'Create HOMEZONE account' : 'Welcome Back',
            style: Theme.of(context).textTheme.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Account type: ${widget.selectedRole == 'USER' ? 'Buyer' : widget.selectedRole.replaceAll('_', ' ')}',
          ),
          const Text('Use your Indian mobile number and six-digit PIN.'),
          const SizedBox(height: 20),
          TextFormField(
            controller: _phone,
            enabled: !_busy && !_submitted,
            maxLength: 32,
            keyboardType: TextInputType.phone,
            autocorrect: false,
            validator: _mobile,
            decoration: const InputDecoration(
              labelText: 'Mobile number',
              hintText: '+91',
            ),
          ),
          TextFormField(
            controller: _pin,
            enabled: !_busy && !_submitted,
            obscureText: true,
            maxLength: 6,
            keyboardType: TextInputType.number,
            autocorrect: false,
            enableSuggestions: false,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ],
            validator: _validatePin,
            decoration: const InputDecoration(labelText: '6-digit PIN'),
          ),
          if (widget.register)
            TextFormField(
              controller: _confirm,
              enabled: !_busy && !_submitted,
              obscureText: true,
              maxLength: 6,
              keyboardType: TextInputType.number,
              autocorrect: false,
              enableSuggestions: false,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(6),
              ],
              validator: (value) =>
                  _validatePin(value) ??
                  (value == _pin.text ? null : 'PINs must match.'),
              decoration: const InputDecoration(labelText: 'Confirm PIN'),
            ),
          if (_message != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(_message!),
            ),
          if (!_submitted)
            PrimaryButton(
              label: widget.register ? 'Create account' : 'Sign in',
              loading: _busy,
              onPressed: _busy ? null : _submit,
            ),
          TextButton(
            onPressed: _busy
                ? null
                : () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => MobilePinAuthScreen(
                        repository: widget.repository,
                        selectedRole: widget.selectedRole,
                        register: !widget.register,
                      ),
                    ),
                  ),
            child: Text(
              widget.register ? 'Continue to sign-in' : 'Create a new account',
            ),
          ),
          TextButton(
            onPressed: _busy
                ? null
                : () => Navigator.pushReplacementNamed(context, '/discovery'),
            child: const Text('Browse published properties'),
          ),
        ],
      ),
    ),
  );
}
