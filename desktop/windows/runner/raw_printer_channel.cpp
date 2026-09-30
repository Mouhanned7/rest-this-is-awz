#include "raw_printer_channel.h"

#include <flutter/encodable_value.h>
#include <flutter/standard_method_codec.h>
#include <windows.h>
#include <winspool.h>

#include <memory>
#include <sstream>
#include <string>
#include <vector>

namespace {

std::unique_ptr<flutter::MethodChannel<flutter::EncodableValue>> g_channel;

std::wstring Utf8ToWide(const std::string& value) {
  if (value.empty()) {
    return std::wstring();
  }

  const int size_needed = MultiByteToWideChar(
      CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), nullptr, 0);
  if (size_needed <= 0) {
    return std::wstring();
  }

  std::wstring wide(static_cast<size_t>(size_needed), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, value.c_str(),
                      static_cast<int>(value.size()), wide.data(),
                      size_needed);
  return wide;
}

std::string WideToUtf8(const std::wstring& value) {
  if (value.empty()) {
    return std::string();
  }

  const int size_needed = WideCharToMultiByte(
      CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), nullptr, 0,
      nullptr, nullptr);
  if (size_needed <= 0) {
    return std::string();
  }

  std::string utf8(static_cast<size_t>(size_needed), '\0');
  WideCharToMultiByte(CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()),
                      utf8.data(), size_needed, nullptr, nullptr);
  return utf8;
}

std::string GetLastErrorMessage(const std::string& prefix) {
  const DWORD error_code = GetLastError();
  LPWSTR message_buffer = nullptr;
  const DWORD size = FormatMessageW(
      FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM |
          FORMAT_MESSAGE_IGNORE_INSERTS,
      nullptr, error_code, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
      reinterpret_cast<LPWSTR>(&message_buffer), 0, nullptr);

  std::wstring message =
      size > 0 && message_buffer != nullptr ? message_buffer : L"Unknown error";
  if (message_buffer != nullptr) {
    LocalFree(message_buffer);
  }

  std::ostringstream stream;
  stream << prefix << " (Windows error " << error_code << "): "
         << WideToUtf8(message);
  return stream.str();
}

bool SendRawBytesToPrinter(const std::string& printer_name,
                           const std::string& job_name,
                           const std::vector<uint8_t>& bytes,
                           std::string* error_message) {
  HANDLE printer_handle = nullptr;
  const std::wstring wide_printer_name = Utf8ToWide(printer_name);
  if (wide_printer_name.empty()) {
    *error_message = "Printer name is empty or invalid.";
    return false;
  }

  if (!OpenPrinterW(const_cast<LPWSTR>(wide_printer_name.c_str()),
                    &printer_handle, nullptr)) {
    *error_message =
        GetLastErrorMessage("Unable to open the selected printer");
    return false;
  }

  DOC_INFO_1W doc_info{};
  const std::wstring wide_job_name = Utf8ToWide(job_name);
  doc_info.pDocName =
      const_cast<LPWSTR>(wide_job_name.empty() ? L"Daily Chicken Ticket"
                                               : wide_job_name.c_str());
  doc_info.pOutputFile = nullptr;
  doc_info.pDatatype = const_cast<LPWSTR>(L"RAW");

  if (StartDocPrinterW(printer_handle, 1, reinterpret_cast<LPBYTE>(&doc_info)) ==
      0) {
    *error_message = GetLastErrorMessage("Unable to start the print job");
    ClosePrinter(printer_handle);
    return false;
  }

  bool success = true;
  if (!StartPagePrinter(printer_handle)) {
    *error_message = GetLastErrorMessage("Unable to start the printer page");
    success = false;
  } else {
    DWORD written = 0;
    if (!WritePrinter(printer_handle, const_cast<uint8_t*>(bytes.data()),
                      static_cast<DWORD>(bytes.size()), &written) ||
        written != bytes.size()) {
      *error_message = GetLastErrorMessage("Unable to write bytes to printer");
      success = false;
    }
    EndPagePrinter(printer_handle);
  }

  EndDocPrinter(printer_handle);
  ClosePrinter(printer_handle);
  return success;
}

}  // namespace

void RegisterRawPrinterChannel(flutter::PluginRegistrarWindows* registrar) {
  g_channel = std::make_unique<flutter::MethodChannel<flutter::EncodableValue>>(
          registrar->messenger(), "daily/raw_printer",
          &flutter::StandardMethodCodec::GetInstance());

  g_channel->SetMethodCallHandler(
      [](const flutter::MethodCall<flutter::EncodableValue>& call,
         std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>>
             result) {
        if (call.method_name() == "alert") {
          MessageBeep(MB_ICONEXCLAMATION);
          result->Success();
          return;
        }
        if (call.method_name() != "printRawBytes") {
          result->NotImplemented();
          return;
        }

        const auto* arguments =
            std::get_if<flutter::EncodableMap>(call.arguments());
        if (arguments == nullptr) {
          result->Error("bad_args", "Arguments map is required.");
          return;
        }

        const auto printer_it =
            arguments->find(flutter::EncodableValue("printerName"));
        const auto bytes_it = arguments->find(flutter::EncodableValue("bytes"));
        if (printer_it == arguments->end() || bytes_it == arguments->end()) {
          result->Error("bad_args", "printerName and bytes are required.");
          return;
        }

        const auto* printer_name =
            std::get_if<std::string>(&printer_it->second);
        const auto* raw_bytes =
            std::get_if<std::vector<uint8_t>>(&bytes_it->second);
        if (printer_name == nullptr || raw_bytes == nullptr) {
          result->Error(
              "bad_args",
              "printerName must be a String and bytes must be Uint8List.");
          return;
        }

        std::string job_name = "Daily Chicken Ticket";
        const auto job_it = arguments->find(flutter::EncodableValue("jobName"));
        if (job_it != arguments->end()) {
          if (const auto* parsed_job_name =
                  std::get_if<std::string>(&job_it->second)) {
            job_name = *parsed_job_name;
          }
        }

        std::string error_message;
        if (!SendRawBytesToPrinter(*printer_name, job_name, *raw_bytes,
                                   &error_message)) {
          result->Error("print_failed", error_message);
          return;
        }

        result->Success(flutter::EncodableValue(true));
      });
}
