import 'dart:convert';

/// UI routing only. Firestore rules and the API independently verify the signed
/// Firebase token and dailyAdmin on every protected operation.
/// Firebase Auth's Windows bridge returns the token without populating claims.
bool hasDailyAdminAccess({
  required Map<String, dynamic>? claims,
  required String? token,
  required String projectId,
  required String userId,
  DateTime? now,
}) {
  if (claims != null) return claims['dailyAdmin'] == true;
  if (token == null || projectId.isEmpty || userId.isEmpty) return false;
  try {
    final parts = token.split('.');
    if (parts.length != 3 || parts.any((part) => part.isEmpty)) return false;
    final payload = jsonDecode(
      utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
    );
    if (payload is! Map<String, dynamic>) return false;
    final expiry = payload['exp'];
    return payload['aud'] == projectId &&
        payload['iss'] == 'https://securetoken.google.com/$projectId' &&
        payload['sub'] == userId &&
        expiry is num &&
        expiry > (now ?? DateTime.now()).millisecondsSinceEpoch ~/ 1000 &&
        payload['dailyAdmin'] == true;
  } on FormatException {
    return false;
  }
}
