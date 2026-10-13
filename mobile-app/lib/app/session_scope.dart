import 'package:flutter/widgets.dart';
import '../features/auth/sign_in_controller.dart';

/// RouteObserver handles push/pop; replacement must also abandon the old screen.
class SessionRouteObserver extends RouteObserver<ModalRoute<dynamic>> {
  final _subscriptions = <ModalRoute<dynamic>, Set<RouteAware>>{};
  @override
  void subscribe(RouteAware routeAware, ModalRoute<dynamic> route) {
    (_subscriptions[route] ??= {}).add(routeAware);
    super.subscribe(routeAware, route);
  }

  @override
  void unsubscribe(RouteAware routeAware) {
    for (final listeners in _subscriptions.values) {
      listeners.remove(routeAware);
    }
    _subscriptions.removeWhere((_, listeners) => listeners.isEmpty);
    super.unsubscribe(routeAware);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    if (oldRoute is ModalRoute<dynamic>) {
      for (final listener in List.of(
        _subscriptions[oldRoute] ?? <RouteAware>{},
      )) {
        listener.didPop();
      }
    }
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
  }
}

class SessionScope extends InheritedNotifier<SignInController> {
  final RouteObserver<ModalRoute<dynamic>> routeObserver;
  const SessionScope({
    super.key,
    required SignInController? controller,
    required this.routeObserver,
    required super.child,
  }) : super(notifier: controller);
  static SignInController? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SessionScope>()?.notifier;
  static RouteObserver<ModalRoute<dynamic>>? observerOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SessionScope>()?.routeObserver;
}
