import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:daily_desktop/archive_sync.dart';
import 'package:daily_desktop/archive_storage.dart';
import 'package:daily_desktop/order_archive.dart';

class Storage implements ArchiveStorage {
  String? raw;
  bool fail = false, corrupt = false;
  @override
  Future<String?> read() async => raw;
  @override
  Future<void> write(String value) async {
    if (fail) throw Exception('disk full');
    raw = corrupt ? '{broken' : value;
  }
}

void main() {
  final record = <String, dynamic>{
    'id': 'order',
    'digest': 'checksum',
    'order': {
      'lifecycle': 'confirmed',
      'paymentStatus': 'paid',
      'totalPrice': 26.85,
      'subtotal': 35.8,
      'pizzaDiscount': 8.95,
      'customer': {'name': 'Test'},
      'items': [
        {'quantity': 2, 'name': 'Regina', 'options': 'Senior'},
      ],
    },
  };
  test(
    'local readback precedes acknowledgement; retry keeps one complete order',
    () async {
      final disk = Storage(), archive = OrderArchive(Storage());
      final saved = OrderArchive(disk);
      var acks = 0;
      Future<void> ack(String id, String digest) async {
        expect(
          jsonDecode(disk.raw!)['orders'].single['order']['pizzaDiscount'],
          8.95,
        );
        acks++;
        if (acks == 1) throw Exception('network');
      }

      await expectLater(
        transferArchives(archive: saved, records: [record], acknowledge: ack),
        throwsException,
      );
      expect((await saved.load()).single.completed, true);
      await transferArchives(
        archive: saved,
        records: [record],
        acknowledge: ack,
      );
      expect((await saved.load()).length, 1);
      expect(acks, 2);
      expect(await archive.load(), isEmpty);
    },
  );
  test(
    'disk failure and corrupt readback prevent all deletion acknowledgements',
    () async {
      for (final corrupt in [false, true]) {
        final disk = Storage()
          ..fail = !corrupt
          ..corrupt = corrupt;
        var called = false;
        await expectLater(
          transferArchives(
            archive: OrderArchive(disk),
            records: [record],
            acknowledge: (_, _) async {
              called = true;
            },
          ),
          throwsException,
        );
        expect(called, false);
      }
    },
  );
  test('active orders cannot be transferred or acknowledged', () async {
    var called = false;
    await expectLater(
      transferArchives(
        archive: OrderArchive(Storage()),
        records: [
          {
            ...record,
            'order': {'lifecycle': 'active'},
          },
        ],
        acknowledge: (_, _) async {
          called = true;
        },
      ),
      throwsFormatException,
    );
    expect(called, false);
  });
}
