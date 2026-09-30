import 'package:web/web.dart' as web;
import 'archive_storage.dart';

ArchiveStorage createArchiveStorage(String scope) =>
    BrowserArchiveStorage(scope);

class BrowserArchiveStorage implements ArchiveStorage {
  BrowserArchiveStorage(String scope) : key = 'daily.order-history.v1.$scope';
  final String key;
  @override
  Future<String?> read() async => web.window.localStorage.getItem(key);
  @override
  Future<void> write(String json) async =>
      web.window.localStorage.setItem(key, json);
}
