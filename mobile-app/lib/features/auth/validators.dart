abstract final class AuthValidators {
  static String? email(String? value) {
    final email = (value ?? '').trim();
    if (email.isEmpty) return 'Enter your email address.';
    if (email.length > 254) return 'Use no more than 254 characters.';
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      return 'Enter a valid email address.';
    }
    return null;
  }

  static String? requiredPassword(String? value) =>
      (value ?? '').isEmpty ? 'Enter your password.' : null;
  static String? newPassword(String? value) {
    final password = value ?? '';
    if (password.length < 8) return 'Use at least 8 characters.';
    if (password.length > 128) return 'Use no more than 128 characters.';
    if (!RegExp(r'[A-Z]').hasMatch(password) ||
        !RegExp(r'[a-z]').hasMatch(password) ||
        !RegExp(r'[0-9]').hasMatch(password)) {
      return 'Include uppercase, lowercase and a number.';
    }
    return null;
  }

  static String? name(String? value) {
    final name = (value ?? '').trim();
    if (name.length < 2) return 'Enter at least 2 characters.';
    if (name.length > 120) return 'Use no more than 120 characters.';
    return null;
  }
}
