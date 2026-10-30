import 'package:flutter/material.dart';
import 'auth_form_screen.dart';
import 'sign_in_controller.dart';
import '../marketplace/marketplace_repository.dart';

class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key, this.controller, this.serviceMode = false,
    this.repository});
  final SignInController? controller;
  final MarketplaceRepository? repository;
  final bool serviceMode;
  @override
  Widget build(BuildContext context) => AuthFormScreen(
    mode: AuthFormMode.signIn,
    signInController: controller,
    serviceMode: serviceMode,
    repository: repository,
  );
}

class SignUpScreen extends StatelessWidget {
  const SignUpScreen({super.key, this.selectedRole, this.serviceMode = false,
    this.repository});
  final MarketplaceRepository? repository;
  final String? selectedRole;
  final bool serviceMode;
  @override
  Widget build(BuildContext context) =>
      AuthFormScreen(mode: AuthFormMode.signUp, selectedRole: selectedRole,
        serviceMode: serviceMode, repository: repository);
}

class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key, this.serviceMode = false});
  final bool serviceMode;
  @override
  Widget build(BuildContext context) =>
      AuthFormScreen(mode: AuthFormMode.forgotPassword, serviceMode: serviceMode);
}

class ResetPasswordScreen extends StatelessWidget {
  const ResetPasswordScreen({super.key, this.serviceMode = false});
  final bool serviceMode;
  @override
  Widget build(BuildContext context) =>
      AuthFormScreen(mode: AuthFormMode.resetPassword, serviceMode: serviceMode);
}
