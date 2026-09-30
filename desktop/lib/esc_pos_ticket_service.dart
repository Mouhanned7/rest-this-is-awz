import 'dart:convert';
import 'dart:typed_data';
import 'order.dart';
import 'ticket_data.dart';

class EscPosTicketService {
  Uint8List buildTicketBytes(DailyOrder order) => Uint8List.fromList([
    0x1b,
    0x40,
    for (final line in ticketLines(order))
      ...ascii.encode('${wrapTicketLine(line).join('\n')}\n'),
    0x0a,
    0x0a,
    0x0a,
    0x1d,
    0x56,
    0x41,
    0x10,
  ]);
}
