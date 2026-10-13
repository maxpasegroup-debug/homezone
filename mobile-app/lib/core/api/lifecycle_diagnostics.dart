import 'package:flutter/foundation.dart';

enum LifecycleFailure { listener, disposal }

/// Only a failure category reaches framework diagnostics, never the caught error.
abstract final class LifecycleDiagnostics {
  /// Diagnostic counts saturate at a 16-bit ceiling; never wrap or report again.
  static const int maximumCount = 65535;
  static bool _reporting = false;
  static int _reporterFailures = 0;
  static int _suppressedReports = 0;
  static int get reporterFailures => _reporterFailures;
  static int get suppressedReports => _suppressedReports;
  static int _increment(int count) => count < maximumCount ? count + 1 : count;

  static void report(LifecycleFailure failure) {
    if (_reporting) {
      _suppressedReports = _increment(_suppressedReports);
      return;
    }
    _reporting = true;
    try {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: FlutterError('HOMEZONE lifecycle ${failure.name} failed.'),
          stack: StackTrace.empty,
          library: 'HOMEZONE lifecycle',
        ),
      );
    } catch (_) {
      // A custom diagnostic handler must not abort credential invalidation.
      // Preserve non-sensitive visibility even when that handler itself fails.
      _reporterFailures = _increment(_reporterFailures);
    } finally {
      _reporting = false;
    }
  }
}
