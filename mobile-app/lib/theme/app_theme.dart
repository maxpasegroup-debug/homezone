import 'package:flutter/material.dart';
import 'design_tokens.dart';

abstract final class AppTheme {
  static final light = _build(Brightness.light);
  static final dark = _build(Brightness.dark);
  static ThemeData _build(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final colors =
        ColorScheme.fromSeed(
          seedColor: BrandColors.forest,
          brightness: brightness,
        ).copyWith(
          primary: dark ? const Color(0xFF91CDB5) : BrandColors.forest,
          onPrimary: dark ? BrandColors.forest : Colors.white,
          secondary: dark ? BrandColors.gold : const Color(0xFF855D20),
          surface: dark ? const Color(0xFF10251E) : BrandColors.ivory,
          surfaceContainerLowest: dark ? const Color(0xFF152D24) : Colors.white,
          onSurface: dark ? BrandColors.ivory : const Color(0xFF152923),
          onSurfaceVariant: dark
              ? const Color(0xFFBFCBC4)
              : const Color(0xFF52665D),
        );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: colors,
      brightness: brightness,
    );
    return base.copyWith(
      scaffoldBackgroundColor: colors.surface,
      textTheme: base.textTheme.copyWith(
        headlineLarge: base.textTheme.headlineLarge?.copyWith(
          fontSize: 28,
          fontWeight: FontWeight.w700,
          height: 1.2,
        ),
        headlineMedium: base.textTheme.headlineMedium?.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w700,
        ),
        bodyLarge: base.textTheme.bodyLarge?.copyWith(
          fontSize: 15,
          height: 1.6,
        ),
        bodyMedium: base.textTheme.bodyMedium?.copyWith(height: 1.5),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colors.surface,
        foregroundColor: colors.onSurface,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surfaceContainerLowest,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Space.md,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppShape.inputRadius),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppShape.inputRadius),
          borderSide: BorderSide(color: colors.outlineVariant),
        ),
        errorMaxLines: 3,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppShape.inputRadius),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
    );
  }
}
