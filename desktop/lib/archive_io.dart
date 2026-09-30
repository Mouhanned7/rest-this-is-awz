import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'archive_storage.dart';

ArchiveStorage createArchiveStorage(String scope) =>
    FileArchiveStorage(() async {
      final directory = await getApplicationSupportDirectory();
      return File('${directory.path}/order-history/$scope/orders.json');
    });

class FileArchiveStorage implements ArchiveStorage {
  FileArchiveStorage(this.file);
  final Future<File> Function() file;
  @override
  Future<String?> read() async {
    final target = await file();
    return await target.exists() ? target.readAsString() : null;
  }

  @override
  Future<void> write(String json) async {
    final target = await file();
    await target.parent.create(recursive: true);
    // Commit only a complete, flushed file. An interrupted write keeps the old JSON.
    final pending = File('${target.path}.tmp');
    await pending.writeAsString(json, flush: true);
    await pending.rename(target.path);
  }
}
