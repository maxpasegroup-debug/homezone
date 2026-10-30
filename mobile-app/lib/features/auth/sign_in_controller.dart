import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../core/api/api_client.dart';
import '../../core/api/cookie_request_coordinator.dart';
import '../../core/api/password_auth_protocol.dart';
import '../../core/api/lifecycle_diagnostics.dart';
import '../../core/api/session_vault.dart';

final class VerifiedIdentity {
  const VerifiedIdentity._(this.id, this.role, this.expires);
  final String id;
  final String role;
  final DateTime expires;
  @override
  String toString() => 'Verified in-memory identity';
}

final class SignInOutcome {
  const SignInOutcome._(this.verified, this.message);
  final bool verified;
  final String? message;
  @override
  String toString() => 'Sign-in outcome';
}

final class SignInOperation {
  SignInOperation._(this.result, this.cancel);
  final Future<SignInOutcome> result;
  final VoidCallback cancel;
}

/// App-owned volatile session and protocol lifetime. No credential fields in UI state.
final class SignInController extends ChangeNotifier {
  SignInController(
    this._protocol, {
    DateTime Function()? clock,
    SessionVault? vault,
  }) : _clock = clock ?? DateTime.now,
       _vault = vault {
    _ownsProtocol = _protocol.claimController(_owner);
    if (_ownsProtocol) {
      _protocol.coordinator.addLifecycleListener(_onInvalidation);
    }
  }
  final Object _owner = Object();
  late final bool _ownsProtocol;
  final PasswordAuthProtocol _protocol;
  final SessionVault? _vault;
  bool _storageClearFailed = false;
  bool get credentialRemovalConfirmed => !_storageClearFailed;
  Future<void> _forgetStored() async {
    try {
      await _vault?.clear().timeout(const Duration(seconds: 5));
      _storageClearFailed = false;
    } catch (_) {
      _storageClearFailed = true;
    }
  }

  Future<void> _saveStored(int generation) async {
    try {
      if (_vault?.scope != _protocol.coordinator.credentialScope) return;
      await _vault
          ?.write(
            _protocol.coordinator.exportCredentialHeaders(),
            () =>
                !_disposed &&
                verified &&
                _verifiedGeneration == generation &&
                _protocol.coordinator.generation == generation,
          )
          .timeout(const Duration(seconds: 5));
    } catch (_) {
      /* Authentication stays memory-only if platform storage fails. */
    }
  }

  final DateTime Function() _clock;
  VerifiedIdentity? _identity;
  int? _verifiedGeneration;
  int? _ownedGeneration;
  Timer? _expiry;
  bool _disposed = false;
  bool _pending = false;
  bool _signingOut = false;
  VerifiedIdentity? get identity =>
      !_disposed &&
          _verifiedGeneration == _protocol.coordinator.generation &&
          (_identity?.expires.isAfter(_clock().toUtc()) ?? false)
      ? _identity
      : null;
  bool get verified => identity != null;
  void _onInvalidation() {
    _identity = null;
    _verifiedGeneration = null;
    _expiry?.cancel();
    if (!_disposed) notifyListeners();
  }

  void clearLocalSession() {
    if (_disposed || !_ownsProtocol) return;
    // Check authority at mutation time, including undisposed obsolete owners.
    if (_ownedGeneration != null &&
        _protocol.coordinator.generation == _ownedGeneration) {
      unawaited(_forgetStored());
      _protocol.coordinator.invalidateForLogout();
    } else {
      _onInvalidation(); // Drop only this owner's stale local identity.
    }
  }

  /// Start fresh registration after logout or failed session restoration.
  /// Never interrupt restoration, sign-in/out, or an authenticated account.
  bool prepareRegistration() {
    if (_disposed || !_ownsProtocol || _pending || _signingOut || verified) {
      return false;
    }
    try {
      final generation = _protocol.prepareRegistrationOwned(_owner);
      return !_disposed && !_pending && !_signingOut && !verified &&
          _protocol.coordinator.generation == generation &&
          _protocol.coordinator.boundary == CookieLifecycleBoundary.ready;
    } catch (_) {
      return false;
    }
  }

  SignInOperation beginSignIn(String email, String password) {
    if (_disposed || _pending || _signingOut || !_ownsProtocol) {
      return SignInOperation._(
        Future.value(
          const SignInOutcome._(false, 'A sign-in attempt is already active.'),
        ),
        () {},
      );
    }
    late final PasswordSignInAttempt attempt;
    try {
      attempt = _protocol.admitSignIn(
        email: email,
        password: password,
        owner: _owner,
      );
    } catch (_) {
      return SignInOperation._(
        Future.value(
          const SignInOutcome._(
            false,
            'Unable to start sign-in. Please try again.',
          ),
        ),
        () {},
      );
    }
    _pending = true;
    final pending = attempt.result;
    final generation = attempt.generation;
    _ownedGeneration = generation;
    unawaited(_forgetStored());
    var complete = false;
    var cancelled = false;
    void cancel() {
      if (complete || cancelled) return;
      cancelled = true;
      if (!_disposed && _protocol.coordinator.generation == generation) {
        clearLocalSession();
      }
    }

    final result = () async {
      try {
        final session = await pending;
        if (_disposed ||
            cancelled ||
            _protocol.coordinator.generation != generation ||
            !session.authenticatedSnapshot) {
          return const SignInOutcome._(
            false,
            'This sign-in attempt was cancelled. Please try again.',
          );
        }
        final expires = session.expires!;
        if (!expires.isAfter(_clock().toUtc())) {
          clearLocalSession();
          return const SignInOutcome._(
            false,
            'Unable to verify your session. Please try again.',
          );
        }
        _identity = VerifiedIdentity._(
          session.user!['id'] as String,
          session.user!['role'] as String,
          expires,
        );
        _verifiedGeneration = generation;
        _expiry?.cancel();
        _expiry = Timer(expires.difference(_clock().toUtc()), () {
          if (!_disposed && _verifiedGeneration == generation) {
            clearLocalSession();
          }
        });
        notifyListeners();
        await _saveStored(generation);
        if (_disposed ||
            generation != _protocol.coordinator.generation ||
            !verified) {
          return const SignInOutcome._(
            false,
            'The session changed. Please sign in again.',
          );
        }
        return const SignInOutcome._(true, null);
      } on CookieLifecycleInvalidated {
        return const SignInOutcome._(
          false,
          'This sign-in attempt was cancelled. Please try again.',
        );
      } on ApiException catch (error) {
        final message = switch (error.failure) {
          ApiFailure.unauthorized =>
            'Unable to sign in. Check your email and password.',
          ApiFailure.timeout => 'The request timed out. Please try again.',
          ApiFailure.network =>
            'Unable to connect. Check your connection and try again.',
          ApiFailure.forbidden =>
            'Sign-in verification failed. Please try again.',
          ApiFailure.rateLimited =>
            'Too many attempts. Please wait before trying again.',
          _ => 'Unable to verify sign-in. Please try again.',
        };
        return SignInOutcome._(false, message);
      } catch (_) {
        return const SignInOutcome._(
          false,
          'Unable to verify sign-in. Please try again.',
        );
      } finally {
        complete = true;
        _pending = false;
      }
    }();
    return SignInOperation._(result, cancel);
  }

  Future<bool> signOut() async {
    if (_disposed ||
        !_ownsProtocol ||
        _pending ||
        _signingOut ||
        _ownedGeneration != _protocol.coordinator.generation) {
      return false;
    }
    _signingOut = true;
    final generation = _ownedGeneration;
    try {
      return await _protocol.signOutOwned(_owner);
    } finally {
      if (!_disposed && generation == _protocol.coordinator.generation) {
        clearLocalSession();
        await _forgetStored();
      }
      _signingOut = false;
    }
  }

  /// Reverify the active session after resume; OS storage never establishes identity.
  Future<void> revalidateSession() async {
    if (_disposed || !_ownsProtocol || _pending || _signingOut || !verified) {
      return;
    }
    final generation = _ownedGeneration;
    final previousId = identity!.id;
    _pending = true;
    try {
      final result = await _protocol.verifyOwned(_owner);
      if (_disposed || generation != _protocol.coordinator.generation) return;
      if (!result.authenticatedSnapshot ||
          result.user!['id'] != previousId ||
          result.expires == null ||
          !result.expires!.isAfter(_clock().toUtc())) {
        clearLocalSession();
        return;
      }
      _identity = VerifiedIdentity._(
        previousId,
        result.user!['role'] as String,
        result.expires!,
      );
      _expiry?.cancel();
      _expiry = Timer(result.expires!.difference(_clock().toUtc()), () {
        if (!_disposed && _verifiedGeneration == generation) {
          clearLocalSession();
        }
      });
      notifyListeners();
      await _saveStored(generation!);
    } catch (_) {
      if (!_disposed && generation == _protocol.coordinator.generation) {
        clearLocalSession();
      }
    } finally {
      _pending = false;
    }
  }

  /// Restore credentials only through OS storage, then require owned HTTP provenance.
  Future<void> restoreSession() async {
    if (_vault == null ||
        _disposed ||
        !_ownsProtocol ||
        _pending ||
        verified ||
        _signingOut)
      return;
    if (_vault!.scope != _protocol.coordinator.credentialScope) return;
    _pending = true;
    final generation = _protocol.coordinator.generation;
    try {
      final headers = await _vault.read().timeout(const Duration(seconds: 5));
      if (_vault.scope != _protocol.coordinator.credentialScope) return;
      if (_disposed ||
          generation != _protocol.coordinator.generation ||
          headers == null ||
          headers.isEmpty)
        return;
      _ownedGeneration = generation;
      if (!_protocol.coordinator.restoreCredentialHeaders(
        headers,
        generation,
      )) {
        clearLocalSession();
        return;
      }
      final result = await _protocol.verifyOwned(_owner);
      if (_disposed || generation != _protocol.coordinator.generation) return;
      if (!result.authenticatedSnapshot ||
          result.expires == null ||
          !result.expires!.isAfter(_clock().toUtc())) {
        clearLocalSession();
        return;
      }
      _identity = VerifiedIdentity._(
        result.user!['id'] as String,
        result.user!['role'] as String,
        result.expires!,
      );
      _verifiedGeneration = generation;
      _expiry?.cancel();
      _expiry = Timer(result.expires!.difference(_clock().toUtc()), () {
        if (!_disposed && _verifiedGeneration == generation)
          clearLocalSession();
      });
      notifyListeners();
      await _saveStored(generation);
    } catch (_) {
      if (!_disposed && generation == _protocol.coordinator.generation) {
        _ownedGeneration = generation;
        clearLocalSession();
      }
    } finally {
      _pending = false;
    }
  }

  @override
  void dispose() {
    if (_disposed) return;
    // Reentrant callbacks cannot restart or republish this owner's state.
    _disposed = true;
    _identity = null;
    _verifiedGeneration = null;
    void cleanup(VoidCallback action) {
      try {
        action();
      } catch (_) {
        LifecycleDiagnostics.report(LifecycleFailure.disposal);
      }
    }

    cleanup(() => _expiry?.cancel());
    if (_ownsProtocol) {
      cleanup(
        () => _protocol.coordinator.removeLifecycleListener(_onInvalidation),
      );
    }
    if (_ownsProtocol && _protocol.coordinator.generation == _ownedGeneration) {
      unawaited(_forgetStored());
      cleanup(_protocol.coordinator.invalidateForLogout);
    }
    if (_ownsProtocol) cleanup(() => _protocol.disposeOwned(_owner));
    cleanup(() => super.dispose());
  }
}
