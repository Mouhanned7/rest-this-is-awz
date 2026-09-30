import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'archive_storage.dart';
import 'archive_io.dart'
    if (dart.library.js_interop) 'archive_web.dart'
    as platform;
import 'order.dart';

class ArchivedOrder {
  ArchivedOrder({
    required this.order,
    required this.action,
    required this.savedAt,
    this.completedAt,
  });
  final DailyOrder order;
  final String action;
  final DateTime savedAt;
  final DateTime? completedAt;
  bool get completed => completedAt != null;
  String get label => !completed
      ? 'À vérifier'
      : action == 'confirm'
      ? 'Confirmée'
      : 'Annulée';
  Map<String, dynamic> toJson() => {
    'id': order.id,
    'order': order.data,
    'action': action,
    'savedAt': savedAt.toUtc().toIso8601String(),
    'completedAt': completedAt?.toUtc().toIso8601String(),
  };
  factory ArchivedOrder.fromJson(Map<String, dynamic> json) {
    if (json['id'] is! String ||
        json['order'] is! Map ||
        !['confirm', 'cancel'].contains(json['action'])) {
      throw const FormatException('Archive invalide');
    }
    return ArchivedOrder(
      order: DailyOrder(json['id'] as String, asMap(json['order'])),
      action: json['action'] as String,
      savedAt: DateTime.parse(json['savedAt'] as String),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
    );
  }
}

class OrderArchive {
  OrderArchive(this.storage);
  final ArchiveStorage storage;
  static final Map<String, OrderArchive> _stores = {};
  static OrderArchive forOwner(String project, String uid) {
    if (project.isEmpty || uid.isEmpty) {
      throw StateError('Compte responsable requis.');
    }
    final scope = base64Url
        .encode(utf8.encode('$project/$uid'))
        .replaceAll('=', '');
    return _stores.putIfAbsent(
      scope,
      () => OrderArchive(platform.createArchiveStorage(scope)),
    );
  }

  Future<void> _queue = Future.value();
  Future<List<ArchivedOrder>> _read() async {
    final raw = await storage.read();
    if (raw == null) return [];
    final json = asMap(jsonDecode(raw));
    if (json['version'] != 1 || json['orders'] is! List) {
      throw const FormatException('Archive invalide');
    }
    return (json['orders'] as List)
        .map((row) => ArchivedOrder.fromJson(asMap(row)))
        .toList();
  }

  Future<List<ArchivedOrder>> load() async {
    await _queue;
    final orders = await _read();
    orders.sort(
      (a, b) =>
          (b.completedAt ?? b.savedAt).compareTo(a.completedAt ?? a.savedAt),
    );
    return orders;
  }

  Future<void> _update(void Function(List<ArchivedOrder>) edit) {
    final task = _queue.then((_) async {
      final orders = await _read();
      edit(orders);
      await storage.write(
        jsonEncode({
          'version': 1,
          'orders': orders.map((o) => o.toJson()).toList(),
        }),
      );
    });
    _queue = task.then<void>(
      (_) {},
      onError: (Object error, StackTrace stack) {},
    );
    return task;
  }

  Future<void> prepare(DailyOrder order, String action) => _update((orders) {
    if (!['confirm', 'cancel'].contains(action)) {
      throw ArgumentError('Action invalide');
    }
    final index = orders.indexWhere((o) => o.order.id == order.id);
    if (index >= 0 && orders[index].completed) return;
    final clean = Map<String, dynamic>.from(order.data)..remove('checkoutUrl');
    final entry = ArchivedOrder(
      order: DailyOrder(order.id, asMap(_jsonValue(clean))),
      action: action,
      savedAt: index >= 0 ? orders[index].savedAt : DateTime.now(),
    );
    if (index >= 0) {
      orders[index] = entry;
    } else {
      orders.add(entry);
    }
  });
  Future<void> importCompleted(DailyOrder order) => _update((orders) {
    final lifecycle = order.data['lifecycle'];
    if (!['confirmed', 'cancelled'].contains(lifecycle)) {
      throw const FormatException(
        'Une commande active ne peut pas être purgée.',
      );
    }
    final clean = Map<String, dynamic>.from(order.data)..remove('checkoutUrl');
    final processed =
        DateTime.tryParse('${clean['processedAt'] ?? ''}') ?? DateTime.now();
    final entry = ArchivedOrder(
      order: DailyOrder(order.id, asMap(_jsonValue(clean))),
      action: lifecycle == 'confirmed' ? 'confirm' : 'cancel',
      savedAt: processed,
      completedAt: processed,
    );
    final index = orders.indexWhere((entry) => entry.order.id == order.id);
    if (index < 0) {
      orders.add(entry);
    } else {
      orders[index] = entry;
    }
  });
  Future<bool> verifyCopy(DailyOrder order) async {
    final clean = Map<String, dynamic>.from(order.data)..remove('checkoutUrl');
    final expected = jsonEncode(_jsonValue(clean));
    return (await load()).any(
      (entry) =>
          entry.order.id == order.id &&
          entry.completed &&
          jsonEncode(entry.order.data) == expected,
    );
  }

  Future<void> complete(String id, String lifecycle) => _update((orders) {
    if (!['confirmed', 'cancelled'].contains(lifecycle)) {
      throw ArgumentError('Statut serveur invalide');
    }
    final index = orders.indexWhere((o) => o.order.id == id);
    if (index < 0) throw StateError('Sauvegarde préalable manquante.');
    final previous = orders[index];
    orders[index] = ArchivedOrder(
      order: DailyOrder(id, {
        ...previous.order.data,
        'lifecycle': lifecycle,
        if (lifecycle == 'confirmed') 'paymentStatus': 'paid',
      }),
      action: lifecycle == 'confirmed' ? 'confirm' : 'cancel',
      savedAt: previous.savedAt,
      completedAt: previous.completedAt ?? DateTime.now(),
    );
  });
  Future<String> process(
    DailyOrder order,
    String action,
    Future<String> Function() send,
  ) async {
    try {
      await prepare(order, action);
    } catch (_) {
      throw Exception(
        'Sauvegarde locale impossible. Aucune action envoyée au restaurant. Libérez de l’espace ou vérifiez le stockage.',
      );
    }
    final lifecycle = await send();
    try {
      await complete(order.id, lifecycle);
    } catch (_) {
      throw Exception(
        'Traitement reçu, mais historique à vérifier. La copie est conservée : reprenez depuis l’historique pour actualiser son état.',
      );
    }
    return lifecycle;
  }
}

Object? _jsonValue(Object? value) {
  if (value is Timestamp) return value.toDate().toUtc().toIso8601String();
  if (value is DateTime) return value.toUtc().toIso8601String();
  if (value is GeoPoint) {
    return {'latitude': value.latitude, 'longitude': value.longitude};
  }
  if (value is Map) {
    return value.map(
      (key, value) => MapEntry(key.toString(), _jsonValue(value)),
    );
  }
  if (value is Iterable) return value.map(_jsonValue).toList();
  if (value == null || value is String || value is num || value is bool) {
    return value;
  }
  throw const FormatException('Champ non compatible JSON');
}
