import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'order.dart';

class PaymentEmails {
  static final Map<String, Future<void>> _pending = {};
  static Future<void> send(DailyOrder order) {
    if (!order.paid || order.data['paymentEmailStatus'] == 'accepted') {
      return Future.value();
    }
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return Future.error(Exception('Reconnectez-vous au compte responsable.'));
    }
    final key = '${user.uid}/${order.id}';
    return _pending.putIfAbsent(
      key,
      () => _send(order, user).whenComplete(() => _pending.remove(key)),
    );
  }

  static Future<void> _send(DailyOrder order, User user) async {
    const base = String.fromEnvironment('DAILY_API_BASE_URL');
    final token = await user.getIdToken(true);
    final response = await http
        .post(
          Uri.parse('$base/api/admin/orders/${order.id}/payment-email'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: '{}',
        )
        .timeout(const Duration(seconds: 60));
    Map<String, dynamic> data;
    try {
      data = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw Exception(
        'Service e-mail indisponible. Vérifiez le déploiement du site.',
      );
    }
    if (response.statusCode != 200) {
      throw Exception(data['error'] ?? 'Le reçu n’a pas pu être transmis.');
    }
  }
}
