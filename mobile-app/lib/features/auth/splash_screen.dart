import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? timer;
  @override
  void initState() {
    super.initState();
    timer = Timer(const Duration(milliseconds: 1200), () {
      if (mounted) Navigator.pushReplacementNamed(context, '/onboarding');
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          'assets/images/residence-evening.jpg',
          fit: BoxFit.cover,
          alignment: const Alignment(0.4, 0),
          excludeFromSemantics: true,
        ),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xF0063F32), Color(0x70063F32), Color(0xC0063F32)],
            ),
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(Space.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'HOMEZONE',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    letterSpacing: 3,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: Space.md),
                const Text(
                  'Find. Buy. Rent. Build. Invest.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white, fontSize: 15),
                ),
                const SizedBox(height: Space.xl),
                Semantics(
                  label: 'Loading local UI preview',
                  child: const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: BrandColors.gold,
                      strokeWidth: 2,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
