import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';

/// Native OS protected storage only. Never stores passwords or trusted identity.
/// Operations are ordered so a late write cannot overtake a queued deletion.
final class SessionVault {
  SessionVault(this.scope) {
    _owners[scope] = _lease;
  }
  final String scope;
  final Object _lease = Object();
  static final _owners = <String, Object>{};
  bool get _current => identical(_owners[scope], _lease);
  static const _channel = MethodChannel('homezone/session-vault');
  static final _tails = <String, Future<void>>{};
  Future<T> _ordered<T>(Future<T> Function() action) {
    final result = (_tails[scope] ?? Future<void>.value()).then(
      (_) => action(),
    );
    _tails[scope] = result.then<void>((_) {}, onError: (Object _) {});
    return result;
  }

  Future<List<String>?> read() => _ordered(() async {
    if (!_current) return null;
    final raw = await _channel.invokeMethod<String>('read', {'scope': scope});
    if (!_current) return null;
    if (raw == null) return null;
    if (raw.length > 32768) throw const FormatException('Session unavailable');
    final value = jsonDecode(raw);
    if (value is! List || value.length > 12 || value.any((v) => v is! String)) {
      throw const FormatException('Session unavailable');
    }
    return value.cast<String>();
  });
  Future<void> write(List<String> headers, bool Function() current) =>
      _ordered(() async {
        if (!_current || !current()) return;
        await _channel.invokeMethod<void>('write', {
          'scope': scope,
          'value': jsonEncode(headers),
        });
      });
  Future<void> clear() => _ordered(() async {
    if (!_current) return;
    await _channel.invokeMethod<void>('delete', {'scope': scope});
  });
  @override
  String toString() => 'Protected session vault';
}
