import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';

import '../../core/api/api_configuration.dart';

/// Public invalidation hints only. Listing/account data still comes from HTTP.
abstract interface class ListingRealtimeConnection {
  Stream<Object?> get messages;
  Future<void> close();
}

typedef ListingRealtimeConnector =
    Future<ListingRealtimeConnection> Function(Uri uri);

/// One read-only socket shared by visible listing screens in a repository.
/// It has no access to the auth protocol, cookie coordinator or session vault.
final class ListingRealtime extends ChangeNotifier {
  ListingRealtime({
    required this.configuration,
    ListingRealtimeConnector? connector,
    double Function()? randomFraction,
    this.connectTimeout = const Duration(seconds: 8),
    this.readyTimeout = const Duration(seconds: 8),
    this.debounce = const Duration(milliseconds: 200),
  }) : _connector = connector ?? _connectPublic,
       _randomFraction = randomFraction ?? Random().nextDouble {
    if (connectTimeout <= Duration.zero ||
        readyTimeout <= Duration.zero ||
        debounce < Duration.zero) {
      throw const ApiConfigurationException();
    }
    uri = configuration
        .endpoint('/api/mobile/properties/live', null)
        .replace(
          scheme: configuration.baseUri.scheme == 'https' ? 'wss' : 'ws',
        );
  }

  final ApiConfiguration configuration;
  final ListingRealtimeConnector _connector;
  final double Function() _randomFraction;
  final Duration connectTimeout, readyTimeout, debounce;
  late final Uri uri;
  final ValueNotifier<int> changes = ValueNotifier<int>(0);
  final Set<Object> _leases = Set<Object>.identity();
  ListingRealtimeConnection? _connection;
  StreamSubscription<Object?>? _subscription;
  Timer? _retry, _readyDeadline, _debounceTimer;
  var _epoch = 0;
  var _failures = 0;
  var _disposed = false;
  var _connecting = false;
  var _ready = false;
  var _pendingChangeDiagnostic = false;

  bool get ready => !_disposed && _ready;

  void acquire(Object observer) {
    if (_disposed || !_leases.add(observer)) return;
    if (_leases.length == 1) _start();
  }

  void release(Object observer) {
    if (!_leases.remove(observer) || _leases.isNotEmpty) return;
    _stop();
    _failures = 0;
  }

  bool _current(int epoch) =>
      !_disposed && _leases.isNotEmpty && epoch == _epoch;

  void _setReady(bool value) {
    if (_ready == value) return;
    _ready = value;
    if (!_disposed) notifyListeners();
  }

  void _start() {
    if (_disposed ||
        _leases.isEmpty ||
        _connecting ||
        _connection != null ||
        _retry != null) {
      return;
    }
    final epoch = ++_epoch;
    _connecting = true;
    unawaited(_open(epoch));
  }

  Future<void> _open(int epoch) async {
    try {
      // A connector completing after its deadline must not leak a connection.
      var expired = false;
      final pending = _connector(uri).then((connection) {
        if (expired || !_current(epoch)) {
          unawaited(_close(connection));
        }
        return connection;
      });
      final connection = await pending.timeout(
        connectTimeout,
        onTimeout: () {
          expired = true;
          throw TimeoutException('Public update connection deadline');
        },
      );
      if (!_current(epoch)) return;
      _connecting = false;
      _connection = connection;
      _readyDeadline = Timer(readyTimeout, () => _lost(epoch));
      _subscription = connection.messages.listen(
        (message) => _receive(epoch, message),
        onError: (Object _, StackTrace _) => _lost(epoch),
        onDone: () => _lost(epoch),
        cancelOnError: true,
      );
    } catch (_) {
      // No raw transport errors, host values or server payloads are logged.
      if (_current(epoch)) _lost(epoch);
    }
  }

  void _receive(int epoch, Object? message) {
    if (!_current(epoch)) return;
    if (message is! String || message.length > 128) {
      _lost(epoch);
      return;
    }
    Object? decoded;
    try {
      decoded = jsonDecode(message);
    } on FormatException {
      _lost(epoch);
      return;
    }
    if (decoded is! Map<String, dynamic> ||
        decoded.length != 2 ||
        decoded['v'] != 1 ||
        decoded['v'] is! int ||
        !const ['ready', 'properties.changed'].contains(decoded['type']) ||
        (!_ready && decoded['type'] != 'ready')) {
      _lost(epoch);
      return;
    }
    if (decoded['type'] == 'ready') {
      _readyDeadline?.cancel();
      _readyDeadline = null;
      _failures = 0;
      _setReady(true);
      if (kDebugMode) debugPrint('[HomeZone realtime] ready');
    } else {
      _pendingChangeDiagnostic = true;
    }
    // Ready also invalidates: recover changes missed during a disconnection.
    _debounceTimer ??= Timer(debounce, () {
      _debounceTimer = null;
      if (_current(epoch) && _ready) {
        if (_pendingChangeDiagnostic && kDebugMode) {
          debugPrint('[HomeZone realtime] change_received');
        }
        _pendingChangeDiagnostic = false;
        changes.value++;
      }
    });
  }

  void _lost(int epoch) {
    if (!_current(epoch)) return;
    _stop();
    if (_leases.isEmpty || _disposed) return;
    _failures = (_failures + 1).clamp(1, 6);
    // Bounded exponential backoff and jitter prevent a reconnect stampede.
    final seconds = min(30, 1 << (_failures - 1));
    final jitter = _randomFraction().clamp(0.0, 1.0);
    final delay = Duration(
      milliseconds: (seconds * 1000 * (1 + jitter)).round(),
    );
    _retry = Timer(delay, () {
      _retry = null;
      _start();
    });
  }

  void _stop() {
    final wasActive = _connecting || _ready || _connection != null;
    _epoch++;
    _connecting = false;
    _retry?.cancel();
    _retry = null;
    _readyDeadline?.cancel();
    _readyDeadline = null;
    _debounceTimer?.cancel();
    _debounceTimer = null;
    _pendingChangeDiagnostic = false;
    final subscription = _subscription;
    _subscription = null;
    if (subscription != null) unawaited(subscription.cancel());
    final connection = _connection;
    _connection = null;
    if (connection != null) unawaited(_close(connection));
    _setReady(false);
    if (wasActive && kDebugMode) debugPrint('[HomeZone realtime] disconnected');
  }

  static Future<void> _close(ListingRealtimeConnection connection) async {
    try {
      await connection.close();
    } catch (_) {
      // Closing an already disconnected public socket is best effort.
    }
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _leases.clear();
    _stop();
    changes.dispose();
    super.dispose();
  }
}

Future<ListingRealtimeConnection> _connectPublic(Uri uri) async {
  final client = _PinnedUpgradeClient(uri);
  final deadline = Timer(const Duration(seconds: 8), () {
    client.close(force: true);
  });
  try {
    // dart:core assigns no default port to ws/wss. Pin the real HTTP upgrade
    // port explicitly before the SDK converts its URI to http/https.
    final upgradeUri = uri.hasPort
        ? uri
        : uri.replace(port: uri.scheme == 'wss' ? 443 : 80);
    final socket = await WebSocket.connect(
      upgradeUri.toString(),
      customClient: client,
      compression: CompressionOptions.compressionOff,
    );
    socket.pingInterval = const Duration(seconds: 20);
    return _IoListingConnection(socket, client);
  } catch (_) {
    client.close(force: true);
    rethrow;
  } finally {
    deadline.cancel();
  }
}

final class _IoListingConnection implements ListingRealtimeConnection {
  _IoListingConnection(this.socket, this.client);
  final WebSocket socket;
  final HttpClient client;
  @override
  Stream<Object?> get messages => socket;
  @override
  Future<void> close() async {
    try {
      await socket
          .close(WebSocketStatus.normalClosure)
          .timeout(const Duration(seconds: 2));
    } finally {
      client.close(force: true);
    }
  }
}

/// WebSocket.connect otherwise permits HttpClient redirects. Pin its single
/// upgrade request to the configured origin/path with default TLS validation.
final class _PinnedUpgradeClient implements HttpClient {
  _PinnedUpgradeClient(Uri websocketUri)
    : expected = websocketUri.replace(
        scheme: websocketUri.scheme == 'wss' ? 'https' : 'http',
      );
  final Uri expected;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 8);

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async {
    // The SDK reconstructs the handshake URI with explicit empty query and
    // fragment components. Compare their contents, then use our canonical URI.
    if (method != 'GET' ||
        url.scheme != expected.scheme ||
        url.host != expected.host ||
        url.port != expected.port ||
        url.path != expected.path ||
        url.userInfo.isNotEmpty ||
        url.query.isNotEmpty ||
        url.fragment.isNotEmpty) {
      throw const ApiConfigurationException();
    }
    final request = await _client.openUrl(method, expected);
    request.followRedirects = false;
    request.cookies.clear();
    return request;
  }

  @override
  void close({bool force = false}) => _client.close(force: force);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
