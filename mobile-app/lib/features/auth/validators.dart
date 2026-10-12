abstract final class AuthValidators {
  static String? email(String? value) {
    final email = (value ?? '').trim();
    if (email.isEmpty) return 'Enter your email address.';
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
    if (!RegExp(r'[A-Z]').hasMatch(password) ||
        !RegExp(r'[a-z]').hasMatch(password) ||
        !RegExp(r'[0-9]').hasMatch(password)) {
      return 'Include uppercase, lowercase and a number.';
    }
    return null;
  }

  static String? name(String? value) =>
      (value ?? '').trim().length < 2 ? 'Enter at least 2 characters.' : null;
}
