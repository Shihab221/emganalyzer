import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate900 = Color(0xFF0F172A);
  static const Color redBrand = Color(0xFFEF4444);
  static const Color orangeBrand = Color(0xFFF97316);

  static ThemeData light([BuildContext? _]) {
    final base = ThemeData(
      brightness: Brightness.light,
      useMaterial3: true,
      canvasColor: slate50,
    );
    return base.copyWith(
      scaffoldBackgroundColor: slate50,
      colorScheme: ColorScheme.fromSeed(
        seedColor: redBrand,
        brightness: Brightness.light,
      ),
      textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(bodyColor: const Color(0xFF1E293B)),
      appBarTheme: const AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: Color(0xFF1E293B),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: redBrand,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  static ThemeData dark([BuildContext? _]) {
    final base = ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
    );
    return base.copyWith(
      scaffoldBackgroundColor: slate900,
      colorScheme: ColorScheme.fromSeed(
        seedColor: redBrand,
        brightness: Brightness.dark,
      ),
      textTheme: GoogleFonts.interTextTheme(base.textTheme),
      appBarTheme: const AppBarTheme(
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Color(0xFFF1F5F9),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1E293B),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: redBrand,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  /// Page shell: soft gradient blobs like the web backdrop.
  static BoxDecoration screenBackdrop(bool dark) => BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: dark
              ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
              : [const Color(0xFFF8FAFC), const Color(0xFFE2E8F0)],
        ),
      );
}

/// Frosted-ish surface similar to `.glass-card` (fallback without BackdropFilter for perf).
Widget glassSurface({
  required Widget child,
  EdgeInsetsGeometry padding = const EdgeInsets.all(20),
  double radius = 20,
}) {
  return Container(
    padding: padding,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(radius),
      color: Colors.white.withValues(alpha: 0.76),
      border: Border.all(color: Colors.white.withValues(alpha: 0.65)),
      boxShadow: [
        BoxShadow(
          blurRadius: 16,
          offset: const Offset(0, 8),
          color: Colors.black.withValues(alpha: 0.06),
        ),
      ],
    ),
    child: child,
  );
}

Widget glassSurfaceDark(BuildContext ctx, Widget child,
    {EdgeInsetsGeometry padding = const EdgeInsets.all(20), double radius = 20}) {
  final isDark = Theme.of(ctx).brightness == Brightness.dark;
  if (!isDark) return glassSurface(padding: padding, radius: radius, child: child);
  return Container(
    padding: padding,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(radius),
      color: const Color(0xFF1E293B).withValues(alpha: 0.88),
      border: Border.all(color: const Color(0xFF475569).withValues(alpha: 0.5)),
      boxShadow: [
        BoxShadow(blurRadius: 16, offset: const Offset(0, 8), color: Colors.black.withValues(alpha: 0.25)),
      ],
    ),
    child: child,
  );
}
