import 'package:flutter/material.dart';
import 'auth_form_screen.dart';
import 'sign_in_controller.dart';

class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key, this.controller, this.serviceMode = false});
  final SignInController? controller;
  final bool serviceMode;
  @override
  Widget build(BuildContext context) => AuthFormScreen(
    mode: AuthFormMode.signIn,
    signInController: controller,
    serviceMode: serviceMode,
  );
}

class SignUpScreen extends StatelessWidget {
  const SignUpScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const AuthFormScreen(mode: AuthFormMode.signUp);
}

class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const AuthFormScreen(mode: AuthFormMode.forgotPassword);
}

class ResetPasswordScreen extends StatelessWidget {
  const ResetPasswordScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const AuthFormScreen(mode: AuthFormMode.resetPassword);
}
