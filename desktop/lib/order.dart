import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

String euro(Object? value) => NumberFormat.currency(
  locale: 'fr_FR',
  symbol: '€',
).format(value is num ? value : 0);
Map<String, dynamic> asMap(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : {};

class DailyOrder {
  DailyOrder(this.id, this.data);
  final String id;
  final Map<String, dynamic> data;
  String get reference => data['reference'] as String? ?? id;
  bool get paid => data['paymentStatus'] == 'paid';
  bool get delivery => data['mode'] == 'delivery';
  String get status => paid ? 'Payée' : 'Juste commandée';
  Map<String, dynamic> get customer => asMap(data['customer']);
  List<Map<String, dynamic>> get items =>
      (data['items'] as List? ?? []).map(asMap).toList();
  num get total => data['totalPrice'] is num ? data['totalPrice'] as num : 0;
  String get name => customer['name'] as String? ?? 'Client';
  String get note => data['note'] as String? ?? '';
  String get address => customer['address'] as String? ?? '';
  DateTime? get date {
    final value = data['orderDate'];
    return value is Timestamp
        ? value.toDate()
        : DateTime.tryParse(
            value is String ? value : data['createdAt'] as String? ?? '',
          );
  }

  String get formattedDate => date == null
      ? 'À l’instant'
      : DateFormat('dd/MM/yyyy · HH:mm').format(date!.toLocal());
  String get paymentDetail {
    if (paid) return 'Paiement Stripe confirmé';
    if (data['paymentMethod'] == 'on_collection') {
      return delivery ? 'À régler à la livraison' : 'À régler au retrait';
    }
    return switch (data['paymentState']) {
      'expired' => 'Session Stripe expirée',
      'failed' => 'Paiement non abouti',
      _ => 'En attente du paiement Stripe',
    };
  }

  Uri? get mapsUri {
    final location = asMap(customer['location']);
    final lat = location['latitude'], lng = location['longitude'];
    if (lat is num && lng is num && lat.abs() <= 90 && lng.abs() <= 180) {
      return Uri.https('www.google.com', '/maps/dir/', {
        'api': '1',
        'destination': '$lat,$lng',
        'travelmode': 'driving',
      });
    }
    if (address.isNotEmpty) {
      return Uri.https('www.google.com', '/maps/search/', {
        'api': '1',
        'query': address,
      });
    }
    return null;
  }
}

// This data is only used in the labelled demo; it never enters Firestore.
final demoOrders = [
  DailyOrder('demo-1', {
    'reference': 'DÉMO-001',
    'paymentStatus': 'paid',
    'paymentMethod': 'online',
    'mode': 'delivery',
    'createdAt': DateTime.now().toIso8601String(),
    'totalPrice': 25.5,
    'subtotal': 25.5,
    'customer': {
      'name': 'Client de démonstration',
      'email': 'demo@example.com',
      'phone': '',
      'address': '40 rue Bourneil, 89000 Auxerre',
      'location': null,
    },
    'items': [
      {
        'name': 'Regina',
        'quantity': 1,
        'price': 17.9,
        'lineTotal': 17.9,
        'options': 'Senior · Sans olives',
      },
      {
        'name': 'Tenders',
        'quantity': 1,
        'price': 7.6,
        'lineTotal': 7.6,
        'options': '4 pièces · Coca-Cola',
      },
    ],
    'note': 'Exemple : sonner à l’interphone.',
  }),
  DailyOrder('demo-2', {
    'reference': 'DÉMO-002',
    'paymentStatus': 'pending',
    'paymentMethod': 'on_collection',
    'mode': 'pickup',
    'createdAt': DateTime.now()
        .subtract(const Duration(minutes: 5))
        .toIso8601String(),
    'totalPrice': 15,
    'subtotal': 15,
    'customer': {
      'name': 'Autre client fictif',
      'email': 'exemple@example.com',
      'phone': '',
    },
    'items': [
      {
        'name': 'Double Cheese',
        'quantity': 2,
        'price': 7.5,
        'lineTotal': 15,
        'options': 'Frites · Fanta',
      },
    ],
  }),
];
