import 'package:flutter/material.dart';
import '../marketplace/marketplace_repository.dart';
import 'role_screen.dart';
import 'auth_screens.dart';

/// Selection is journey context only; permissions always come from the server.
class RoleFirstAuthScreen extends StatelessWidget {
  const RoleFirstAuthScreen({super.key, required this.repository});
  final MarketplaceRepository repository;
  void _open(BuildContext context, String role) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => SignUpScreen(
        selectedRole: role,
        serviceMode: true,
        repository: repository,
      ),
    ),
  );
  @override
  Widget build(BuildContext context) =>
      RoleScreen(onSelected: (role) => _open(context, role));
}
