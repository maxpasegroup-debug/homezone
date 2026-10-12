import 'package:flutter/material.dart';

abstract final class BrandColors {
  // Sampled direction from the approved authentication showcase.
  static const forest = Color(0xFF063F32);
  static const gold = Color(0xFFD5AD62);
  static const ivory = Color(0xFFFAF9F4);
  static const canvas = ivory;
  static const success = forest;
  static const warning = Color(0xFF855D20);
}

abstract final class Space {
  static const xs = 4.0, sm = 8.0, md = 16.0, lg = 24.0, xl = 32.0, xxl = 48.0;
}

abstract final class AppShape {
  static const radius = 20.0;
  static const inputRadius = 12.0;
  static const borderWidth = 1.0;
  static const shadow = BoxShadow(
    color: Color(0x0C063F32),
    blurRadius: 24,
    offset: Offset(0, 8),
  );
}

abstract final class AppIcons {
  static const email = Icons.mail_outline_rounded;
  static const password = Icons.lock_outline_rounded;
  static const person = Icons.person_outline_rounded;
  static const home = Icons.home_work_outlined;
}
