import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'order.dart';
import 'ticket_pdf_service.dart';
import 'esc_pos_ticket_service.dart';
import 'windows_print_service.dart';

class DesktopPrinting {
  static final instance = DesktopPrinting();
  final pdf = TicketPdfService();
  final windows = WindowsPrintService();
  static const _channel = MethodChannel('daily/raw_printer');
  Future<void> alert() async {
    try {
      await _channel.invokeMethod<void>('alert');
    } on PlatformException {
      /* Sound is optional. */
    }
  }

  Future<void> print(DailyOrder order) async {
    final prefs = await SharedPreferences.getInstance();
    final printer = prefs.getString('daily_printer');
    if (printer == null || printer.isEmpty) {
      throw Exception('Choisissez une imprimante dans les réglages.');
    }
    await windows.printRawBytes(
      EscPosTicketService().buildTicketBytes(order),
      printerName: printer,
      jobName: 'Daily Chicken ${order.reference}',
    );
  }

  Future<String> afterConfirmation(DailyOrder order) async {
    final path = await pdf.generateTicketPdf(order);
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool('daily_auto_print') == true) await print(order);
    return path;
  }
}

class PrinterSettings extends StatefulWidget {
  const PrinterSettings({super.key});
  @override
  State<PrinterSettings> createState() => _PrinterSettingsState();
}

class _PrinterSettingsState extends State<PrinterSettings> {
  List<String> printers = [];
  String? selected, error;
  bool automatic = false, loading = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final names = await DesktopPrinting.instance.windows
          .getInstalledPrinters();
      if (!mounted) return;
      setState(() {
        printers = names;
        final saved = prefs.getString('daily_printer');
        selected = names.contains(saved) ? saved : null;
        automatic = prefs.getBool('daily_auto_print') ?? false;
        loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          loading = false;
          error = 'Réglages indisponibles.';
        });
      }
    }
  }

  Future<void> save() async {
    if (automatic && selected == null) {
      setState(
        () => error = 'Choisissez une imprimante pour activer l’impression.',
      );
      return;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('daily_printer', selected ?? '');
      await prefs.setBool('daily_auto_print', automatic);
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) setState(() => error = 'Impossible de sauvegarder.');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tickets & impression')),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 650),
        child: ListView(
          padding: const EdgeInsets.all(28),
          children: [
            const Text(
              'Votre poste de commande',
              style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            const Text(
              'Tickets thermiques ESC/POS 80 mm. Les PDF sont conservés dans Documents / Daily Chicken / Tickets.',
            ),
            const SizedBox(height: 24),
            if (loading)
              const LinearProgressIndicator()
            else
              DropdownButtonFormField<String>(
                key: ValueKey(selected),
                initialValue: selected,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Imprimante Windows',
                ),
                items: printers
                    .map(
                      (name) =>
                          DropdownMenuItem(value: name, child: Text(name)),
                    )
                    .toList(),
                onChanged: (value) => setState(() => selected = value),
              ),
            if (!loading && printers.isEmpty)
              const Text(
                'Aucune imprimante détectée. Installez son pilote Windows, puis actualisez.',
              ),
            TextButton.icon(
              onPressed: load,
              icon: const Icon(Icons.refresh),
              label: const Text('Actualiser les imprimantes'),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Imprimer après confirmation'),
              subtitle: const Text(
                'Après la confirmation réussie d’une commande payée sur ce poste.',
              ),
              value: automatic,
              onChanged: (value) => setState(() => automatic = value),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () async {
                try {
                  final path = await DesktopPrinting.instance.pdf
                      .getOutputDirectoryPath();
                  if (!await launchUrl(Uri.directory(path))) throw Exception();
                } catch (_) {
                  if (mounted) {
                    setState(() => error = 'Impossible d’ouvrir le dossier.');
                  }
                }
              },
              icon: const Icon(Icons.folder_open),
              label: const Text('Ouvrir les tickets PDF'),
            ),
            if (error != null)
              Text(error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: loading ? null : save,
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    ),
  );
}
