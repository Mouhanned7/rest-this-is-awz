import 'order.dart';

// One receipt model for PDF and thermal output.
List<String> ticketLines(DailyOrder order) => [
  'DAILY CHICKEN PIZZA',
  '40 rue Bourneil, 89000 Auxerre',
  '03 86 31 17 17',
  'www.dailychickenpizza.fr',
  '------------------------------------------',
  'Commande : ${order.reference}',
  'Date : ${order.formattedDate}',
  order.delivery ? 'LIVRAISON' : 'A EMPORTER',
  'Client : ${order.name}',
  'Tel : ${order.customer['phone'] ?? ''}',
  if (order.delivery) 'Adresse : ${order.address}',
  if (order.delivery && order.mapsUri != null) 'GPS : ${order.mapsUri}',
  'Paiement : ${order.paymentDetail}',
  if (order.data['lifecycle'] == 'cancelled') 'COMMANDE ANNULEE',
  '------------------------------------------',
  for (final item in order.items) ...[
    '${item['quantity']} x ${item['name']}',
    if ('${item['options'] ?? ''}'.trim().isNotEmpty) '${item['options']}',
    '  ${euro(item['lineTotal'] ?? ((item['price'] as num? ?? 0) * (item['quantity'] as num? ?? 1)))}',
  ],
  '------------------------------------------',
  if (order.data['subtotal'] is num)
    'Sous-total : ${euro(order.data['subtotal'])}',
  if ((order.data['pizzaDiscount'] as num? ?? 0) > 0)
    '${order.data['promotion'] ?? 'Remise'} : -${euro(order.data['pizzaDiscount'])}',
  if (order.data['deliveryFee'] is num)
    'Livraison : ${euro(order.data['deliveryFee'])}',
  'TOTAL : ${euro(order.total)}',
  order.paid ? 'DEJA PAYE' : 'A REGLER : ${euro(order.total)}',
  if (order.note.isNotEmpty) ...['REMARQUE', order.note],
  'Merci pour votre commande !',
];

// Strip control characters from customer input before sending ESC/POS commands.
String printerText(String value) {
  const groups = {
    'a': 'àâäáãå',
    'A': 'ÀÂÄÁÃÅ',
    'e': 'éèêë',
    'E': 'ÉÈÊË',
    'i': 'îïíì',
    'I': 'ÎÏÍÌ',
    'o': 'ôöóòõ',
    'O': 'ÔÖÓÒÕ',
    'u': 'ùûüú',
    'U': 'ÙÛÜÚ',
    'c': 'ç',
    'C': 'Ç',
  };
  var text = value
      .replaceAll('€', 'EUR')
      .replaceAll('œ', 'oe')
      .replaceAll('’', "'")
      .replaceAll('·', '-');
  for (final entry in groups.entries) {
    for (final char in entry.value.split('')) {
      text = text.replaceAll(char, entry.key);
    }
  }
  return text.replaceAll(RegExp(r'[^\x20-\x7E]'), ' ');
}

List<String> wrapTicketLine(String value, [int width = 42]) {
  var remaining = printerText(value);
  final lines = <String>[];
  while (remaining.length > width) {
    var cut = remaining.lastIndexOf(' ', width);
    if (cut < width ~/ 2) cut = width;
    lines.add(remaining.substring(0, cut));
    remaining = remaining.substring(cut).trimLeft();
  }
  return [...lines, remaining];
}
