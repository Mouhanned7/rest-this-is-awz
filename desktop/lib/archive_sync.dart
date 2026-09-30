import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'firebase_config.dart';
import 'order.dart';
import 'order_archive.dart';

Future<void> transferArchives({
  required OrderArchive archive,
  required List<Map<String, dynamic>> records,
  required Future<void> Function(String id, String digest) acknowledge,
}) async {
  for (final record in records) {
    final id = record['id'], digest = record['digest'];
    if (id is! String || digest is! String || record['order'] is! Map) {
      throw const FormatException('Archive distante invalide.');
    }
    final order = DailyOrder(id, asMap(record['order']));
    await archive.importCompleted(order);
    // Re-read the saved JSON before allowing any remote deletion.
    if (!await archive.verifyCopy(order)) {
      throw Exception(
        'Copie locale non vérifiée : archive conservée dans Firebase.',
      );
    }
    await acknowledge(id, digest);
  }
}

class ArchiveSync {
  static final Map<String, Future<void>> _pending = {};
  static Future<void> run() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return Future.value();
    return _pending.putIfAbsent(
      user.uid,
      () => _run(user).whenComplete(() => _pending.remove(user.uid)),
    );
  }

  static Future<void> _run(User user) async {
    const base = String.fromEnvironment('DAILY_API_BASE_URL');
    final token = await user.getIdToken(true);
    if (token == null) {
      throw Exception('Reconnectez-vous pour sauvegarder les archives.');
    }
    final headers = {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
    final response = await http
        .get(Uri.parse('$base/api/admin/archives'), headers: headers)
        .timeout(const Duration(seconds: 25));
    if (response.statusCode != 200) {
      throw Exception(
        'Transfert des archives indisponible. La copie Firebase est conservée.',
      );
    }
    final payload = jsonDecode(response.body);
    if (payload is! Map || payload['archives'] is! List) {
      throw const FormatException('Réponse d’archive invalide.');
    }
    final archive = OrderArchive.forOwner(FirebaseConfig.projectId, user.uid);
    await transferArchives(
      archive: archive,
      records: (payload['archives'] as List).map(asMap).toList(),
      acknowledge: (id, digest) async {
        final result = await http
            .post(
              Uri.parse(
                '$base/api/admin/archives/${Uri.encodeComponent(id)}/ack',
              ),
              headers: headers,
              body: jsonEncode({'digest': digest}),
            )
            .timeout(const Duration(seconds: 25));
        if (result.statusCode != 200) {
          throw Exception(
            'Copie locale sauvegardée. Nettoyage Firebase à réessayer.',
          );
        }
      },
    );
  }
}
