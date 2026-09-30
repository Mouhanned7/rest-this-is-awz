import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:daily_desktop/admin_access.dart';

void main() {
  final now = DateTime.utc(2026, 9, 30);
  final valid = <String, dynamic>{
    'aud': 'daily-project',
    'iss': 'https://securetoken.google.com/daily-project',
    'sub': 'owner',
    'exp': now.millisecondsSinceEpoch ~/ 1000 + 3600,
    'dailyAdmin': true,
  };
  String token(Object? payload) =>
      'header.${base64Url.encode(utf8.encode(jsonEncode(payload))).replaceAll('=', '')}.signature';
  bool check(String? jwt, {Map<String, dynamic>? claims}) =>
      hasDailyAdminAccess(
        claims: claims,
        token: jwt,
        projectId: 'daily-project',
        userId: 'owner',
        now: now,
      );
  test(
    'Windows missing claims uses the current Firebase SDK token for UI routing',
    () {
      expect(check(token(valid)), true);
      expect(check(null, claims: {'dailyAdmin': true}), true);
    },
  );
  test(
    'Missing role and false or string roles cannot open the owner screen',
    () {
      expect(check(token({...valid}..remove('dailyAdmin'))), false);
      expect(check(token({...valid, 'dailyAdmin': false})), false);
      expect(check(token({...valid, 'dailyAdmin': 'true'})), false);
      expect(check(token(valid), claims: {'dailyAdmin': false}), false);
    },
  );
  test(
    'Rejects a token for another project, another account or an expired session',
    () {
      for (final override in [
        {'aud': 'other'},
        {'iss': 'https://example.com'},
        {'sub': 'other'},
        {'exp': now.millisecondsSinceEpoch ~/ 1000},
        {'exp': 'invalid'},
      ]) {
        expect(check(token({...valid, ...override})), false);
      }
    },
  );
  test('Malformed and absent tokens fail closed without crashing', () {
    for (final jwt in [
      null,
      '',
      'broken',
      'a.b.c',
      'a.%%%.c',
      token([]),
      token(null),
    ]) {
      expect(check(jwt), false);
    }
  });
}
