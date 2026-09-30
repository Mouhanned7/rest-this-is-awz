abstract class ArchiveStorage {
  Future<String?> read();
  Future<void> write(String json);
}
