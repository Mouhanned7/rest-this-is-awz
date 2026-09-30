import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';

class WindowsPrintService {
  static const MethodChannel _channel = MethodChannel('daily/raw_printer');

  Future<List<String>> getInstalledPrinters() async {
    if (!Platform.isWindows) {
      return const <String>[];
    }

    try {
      final ProcessResult result = await Process.run('powershell', <String>[
        '-NoProfile',
        '-Command',
        r"Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress",
      ]);

      if (result.exitCode != 0) {
        throw Exception(result.stderr.toString().trim());
      }

      final String raw = result.stdout.toString().trim();
      if (raw.isEmpty) {
        return const <String>[];
      }

      final dynamic decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .map((dynamic item) => item.toString().trim())
            .where((String item) => item.isNotEmpty)
            .toList(growable: false);
      }

      final String single = decoded.toString().trim();
      return single.isEmpty ? const <String>[] : <String>[single];
    } catch (_) {
      return const <String>[];
    }
  }

  Future<String?> getDefaultPrinterName() async {
    if (!Platform.isWindows) {
      return null;
    }

    try {
      final ProcessResult result = await Process.run('powershell', <String>[
        '-NoProfile',
        '-Command',
        r"(Get-Printer | Where-Object Default -eq $true | Select-Object -ExpandProperty Name | Select-Object -First 1)",
      ]);

      if (result.exitCode != 0) {
        return null;
      }

      final String printerName = result.stdout.toString().trim();
      return printerName.isEmpty ? null : printerName;
    } catch (_) {
      return null;
    }
  }

  Future<void> printRawBytes(
    Uint8List bytes, {
    String? printerName,
    String jobName = 'Daily Chicken Ticket',
  }) async {
    if (!Platform.isWindows) {
      throw UnsupportedError(
        'Raw ESC/POS printing is only supported on Windows.',
      );
    }

    final String effectivePrinter = printerName?.trim().isNotEmpty == true
        ? printerName!.trim()
        : (await getDefaultPrinterName() ?? '');

    if (effectivePrinter.isEmpty) {
      throw Exception('No Windows printer selected.');
    }

    await _channel.invokeMethod<void>('printRawBytes', <String, dynamic>{
      'printerName': effectivePrinter,
      'jobName': jobName,
      'bytes': bytes,
    });
  }
}
