import 'dart:convert';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:daily_desktop/design.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daily_desktop/archive_storage.dart';
import 'package:daily_desktop/archive_io.dart';
import 'package:daily_desktop/order_archive.dart';
import 'package:daily_desktop/order.dart';
import 'package:daily_desktop/history_screen.dart';
import 'package:daily_desktop/main.dart';

class MemoryStorage implements ArchiveStorage {
  String? value;
  bool failWrites = false;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String json) async {
    if (failWrites) throw const FileSystemException('No space');
    value = json;
  }
}

DailyOrder sample(String id) => DailyOrder(id, {
  'reference': 'DAILY-$id',
  'paymentStatus': 'paid',
  'paymentMethod': 'online',
  'orderDate': Timestamp.fromDate(DateTime.utc(2026, 9, 25, 12, 30)),
  'mode': 'delivery',
  'totalPrice': 25.5,
  'note': 'Interphone 3',
  'checkoutUrl': 'https://checkout.stripe.com/private',
  'customer': {
    'name': 'Client $id',
    'email': 'test@example.com',
    'phone': '0612345678',
    'address': '40 rue Bourneil, Auxerre',
    'location': {'latitude': 47.8, 'longitude': 3.57, 'accuracy': 10},
  },
  'items': [
    {
      'name': 'Regina',
      'quantity': 1,
      'price': 25.5,
      'lineTotal': 25.5,
      'options': 'Senior, sans olives',
    },
  ],
});

void main() {
  test(
    'JSON keeps full details and dates; writes before any remote action and survives reopening',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'daily-archive-test-',
      );
      addTearDown(() async {
        if (directory.absolute.parent.path ==
            Directory.systemTemp.absolute.path) {
          await directory.delete(recursive: true);
        }
      });
      final file = File('${directory.path}/orders.json');
      final archive = OrderArchive(FileArchiveStorage(() async => file));
      await archive.process(sample('1'), 'confirm', () async {
        expect(await file.exists(), true);
        final pending = await OrderArchive(
          FileArchiveStorage(() async => file),
        ).load();
        expect(pending.single.completed, false);
        return 'confirmed';
      });
      final saved = (await OrderArchive(
        FileArchiveStorage(() async => file),
      ).load()).single;
      expect(saved.completed, true);
      expect(saved.label, 'Confirmée');
      expect(saved.order.date, DateTime.utc(2026, 9, 25, 12, 30));
      expect(saved.order.customer['phone'], '0612345678');
      expect(saved.order.mapsUri!.queryParameters['destination'], '47.8,3.57');
      expect(saved.order.items.single['options'], 'Senior, sans olives');
      expect(saved.order.note, 'Interphone 3');
      expect(saved.order.total, 25.5);
      expect(saved.order.data.containsKey('checkoutUrl'), false);
      expect(jsonDecode(await file.readAsString())['version'], 1);
      expect(await File('${file.path}.tmp').exists(), false);
    },
  );
  test('full disk prevents the remote deletion', () async {
    final storage = MemoryStorage()..failWrites = true;
    var called = false;
    await expectLater(
      OrderArchive(storage).process(sample('1'), 'confirm', () async {
        called = true;
        return 'confirmed';
      }),
      throwsException,
    );
    expect(called, false);
  });
  test(
    'lost response and failed final write preserve a pending copy, then retry without duplicates',
    () async {
      final storage = MemoryStorage(), archive = OrderArchive(MemoryStorage());
      await expectLater(
        archive.process(
          sample('1'),
          'confirm',
          () async => throw Exception('network'),
        ),
        throwsException,
      );
      expect((await archive.load()).single.completed, false);
      final local = OrderArchive(storage);
      await expectLater(
        local.process(sample('2'), 'confirm', () async {
          storage.failWrites = true;
          return 'confirmed';
        }),
        throwsException,
      );
      storage.failWrites = false;
      expect((await local.load()).single.completed, false);
      await local.process(sample('2'), 'confirm', () async => 'confirmed');
      await local.prepare(sample('2'), 'confirm');
      expect((await local.load()).length, 1);
      expect((await local.load()).single.completed, true);
    },
  );
  test(
    'concurrent saves do not drop orders and corruption is never silently overwritten',
    () async {
      final storage = MemoryStorage(), archive = OrderArchive(MemoryStorage());
      await Future.wait(
        List.generate(20, (i) => archive.prepare(sample('$i'), 'confirm')),
      );
      expect((await archive.load()).length, 20);
      storage.value = 'broken JSON';
      var called = false;
      await expectLater(
        OrderArchive(storage).process(sample('x'), 'cancel', () async {
          called = true;
          return 'cancelled';
        }),
        throwsException,
      );
      expect(called, false);
      expect(storage.value, 'broken JSON');
    },
  );
  test('local archives are separated by Firebase project and account', () {
    expect(
      identical(
        OrderArchive.forOwner('project', 'owner'),
        OrderArchive.forOwner('project', 'owner'),
      ),
      true,
    );
    expect(
      identical(
        OrderArchive.forOwner('project', 'owner'),
        OrderArchive.forOwner('project', 'other'),
      ),
      false,
    );
    expect(
      identical(
        OrderArchive.forOwner('project', 'owner'),
        OrderArchive.forOwner('other', 'owner'),
      ),
      false,
    );
  });
  testWidgets(
    'history filters and opens complete details without Firebase or mutation buttons',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final archive = OrderArchive(MemoryStorage());
      await archive.process(sample('paid'), 'confirm', () async => 'confirmed');
      await archive.process(
        sample('cancel'),
        'cancel',
        () async => 'cancelled',
      );
      await archive.prepare(sample('pending'), 'confirm');
      await tester.pumpWidget(
        MaterialApp(
          home: HistoryScreen(
            archive: archive,
            openOrder: (entry) =>
                OrderDetail(order: entry.order, localEntry: entry),
          ),
        ),
      );
      await tester.pumpAndSettle();
      for (final label in ['Toutes', 'Confirmées', 'Annulées', 'À vérifier']) {
        final chip = tester.widget<ChoiceChip>(
          find.widgetWithText(ChoiceChip, label),
        );
        expect(
          (chip.label as Text).style!.color,
          label == 'Toutes' ? Colors.white : forest,
        );
      }
      await tester.tap(find.text('Confirmées'));
      await tester.pumpAndSettle();
      expect(find.text('Client paid'), findsOneWidget);
      expect(find.text('Client cancel'), findsNothing);
      await tester.tap(find.text('Client paid'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Confirmée · historique'), findsOneWidget);
      expect(find.text('Confirmer la commande payée'), findsNothing);
      expect(find.text('Reprendre le traitement'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
