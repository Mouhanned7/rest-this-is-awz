import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'order.dart';
import 'ticket_data.dart';

class TicketPdfService {
  Future<String> getOutputDirectoryPath() async {
    final base = await getApplicationDocumentsDirectory();
    final directory = Directory('${base.path}/Daily Chicken/Tickets');
    await directory.create(recursive: true);
    return directory.path;
  }

  Future<String> generateTicketPdf(DailyOrder order) async {
    final lines = ticketLines(
      order,
    ).expand((line) => wrapTicketLine(line)).toList();
    final pdf = pw.Document();
    // Explicit pages preserve large orders and long notes without clipping.
    for (var offset = 0; offset < lines.length; offset += 70) {
      pdf.addPage(
        pw.Page(
          pageFormat: const PdfPageFormat(
            80 * PdfPageFormat.mm,
            297 * PdfPageFormat.mm,
            marginAll: 4 * PdfPageFormat.mm,
          ),
          build: (_) => pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: lines
                .skip(offset)
                .take(70)
                .map(
                  (line) => pw.Text(
                    line,
                    style: pw.TextStyle(
                      font: pw.Font.courier(),
                      fontSize: 7.5,
                      lineSpacing: 2,
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      );
    }
    final reference = order.reference.replaceAll(
      RegExp(r'[^a-zA-Z0-9_-]'),
      '_',
    );
    final file = File(
      '${await getOutputDirectoryPath()}/ticket_${reference}_${DateTime.now().microsecondsSinceEpoch}.pdf',
    );
    await file.writeAsBytes(await pdf.save(), flush: true);
    return file.path;
  }
}
