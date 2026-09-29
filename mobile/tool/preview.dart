// Local visual preview only. The signed APK uses lib/main.dart and Firebase Auth.
import 'package:flutter/material.dart';
import 'package:daily_orders/main.dart' as daily;
import 'package:daily_orders/design.dart';
import 'package:daily_orders/order.dart';
import 'package:daily_orders/order_archive.dart';
import 'package:daily_orders/archive_storage.dart';
import 'package:daily_orders/history_screen.dart';

class PreviewStorage implements ArchiveStorage {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String json) async {
    value = json;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final archive = OrderArchive(PreviewStorage());
  await archive.process(demoOrders.first, 'confirm', () async => 'confirmed');
  await archive.process(demoOrders.last, 'cancel', () async => 'cancelled');
  final screen = Uri.base.queryParameters['screen'];
  runApp(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Daily · Aperçu fictif',
      theme: dailyTheme(),
      home: screen == 'login'
          ? const daily.LoginScreen()
          : screen == 'history'
          ? HistoryScreen(
              archive: archive,
              openOrder: (entry) => daily.OrderDetail(
                order: entry.order,
                localEntry: entry,
                demo: true,
              ),
            )
          : const daily.OrdersScreen(demo: true),
    ),
  );
}
