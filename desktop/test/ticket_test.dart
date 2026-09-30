import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:daily_desktop/order.dart';
import 'package:daily_desktop/ticket_data.dart';
import 'package:daily_desktop/esc_pos_ticket_service.dart';

void main() {
  test(
    'Daily schema preserves options, discounted line totals and location',
    () {
      final order = DailyOrder('id', {
        'reference': 'DAILY-123',
        'paymentStatus': 'paid',
        'mode': 'delivery',
        'totalPrice': 15,
        'subtotal': 20,
        'pizzaDiscount': 5,
        'promotion': 'Offre pizza',
        'customer': {
          'name': 'Élodie',
          'phone': '0612345678',
          'address': 'Auxerre',
          'location': {'latitude': 47.8, 'longitude': 3.5},
        },
        'note': 'Sans oignons',
        'items': [
          {
            'name': 'Regina',
            'quantity': 2,
            'price': 10,
            'lineTotal': 15,
            'options': 'Senior · Sans olives',
          },
        ],
      });
      final text = ticketLines(order).join('\n');
      expect(text, contains('DAILY-123'));
      expect(text, contains('Senior · Sans olives'));
      expect(text, contains('Sans oignons'));
      expect(text, contains('DEJA PAYE'));
      expect(text, contains('destination=47.8%2C3.5'));
      expect(text, contains('15,00'));
      expect(text, contains('Offre pizza : -5,00'));
      expect(text, isNot(contains('SPERANZA')));
    },
  );
  test(
    'Long items remain complete and untrusted printer controls are removed',
    () {
      final text = 'Pizza ' * 100;
      final lines = wrapTicketLine(text);
      expect(lines.every((l) => l.length <= 42), true);
      expect(
        lines.join(' ').trim().replaceAll(RegExp(r'\s+'), ' '),
        text.trim(),
      );
      final order = DailyOrder('1', {
        'customer': {'name': 'Élodie 🎉\x1b\x1d'},
        'paymentStatus': 'pending',
      });
      final bytes = EscPosTicketService().buildTicketBytes(order);
      expect(
        bytes.where((b) => b == 0x1b).length,
        1,
      ); // Only our initialization.
      expect(bytes.where((b) => b == 0x1d).length, 1); // Only our paper cut.
      expect(ascii.decode(bytes, allowInvalid: true), contains('Elodie'));
      expect(ascii.decode(bytes, allowInvalid: true), contains('A REGLER'));
    },
  );
}
