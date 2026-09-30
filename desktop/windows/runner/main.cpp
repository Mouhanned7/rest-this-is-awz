#include <flutter/dart_project.h>
#include <flutter/flutter_view_controller.h>
#include <windows.h>

#include "flutter_window.h"
#include "utils.h"

// Returns true if this machine's CPU or GPU may not support hardware rendering.
// Checks for known old AMD Piledriver/Bulldozer APUs that crash with 0xc000001d
// (STATUS_ILLEGAL_INSTRUCTION) due to missing AVX2/FMA3 support in the GPU driver.
static bool NeedsSoftwareRendering() {
  // Check env-var override: set DASHBOARDD_DISABLE_GPU=1 to force software rendering.
  wchar_t env_val[4] = {};
  if (::GetEnvironmentVariableW(L"DASHBOARDD_DISABLE_GPU", env_val,
                                _countof(env_val)) > 0) {
    return env_val[0] == L'1';
  }
  return false;
}

int APIENTRY wWinMain(_In_ HINSTANCE instance, _In_opt_ HINSTANCE prev,
                      _In_ wchar_t *command_line, _In_ int show_command) {
  // Attach to console when present (e.g., 'flutter run') or create a
  // new console when running with a debugger.
  if (!::AttachConsole(ATTACH_PARENT_PROCESS) && ::IsDebuggerPresent()) {
    CreateAndAttachConsole();
  }

  // Initialize COM, so that it is available for use in the library and/or
  // plugins.
  ::CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

  flutter::DartProject project(L"data");

  std::vector<std::string> command_line_arguments =
      GetCommandLineArguments();

  // Force software rendering when the env-var override is set, or when
  // --disable-gpu was already passed on the command line by the Inno Setup
  // shortcut (for old AMD A4 / Radeon HD hardware).
  bool has_disable_gpu = false;
  for (const auto& arg : command_line_arguments) {
    if (arg == "--disable-gpu") { has_disable_gpu = true; break; }
  }
  if (!has_disable_gpu && NeedsSoftwareRendering()) {
    command_line_arguments.push_back("--disable-gpu");
  }

  project.set_dart_entrypoint_arguments(std::move(command_line_arguments));

  FlutterWindow window(project);
  Win32Window::Point origin(10, 10);
  Win32Window::Size size(1280, 720);
  if (!window.Create(L"Daily Chicken - Commandes", origin, size)) {
    return EXIT_FAILURE;
  }
  window.SetQuitOnClose(true);

  ::MSG msg;
  while (::GetMessage(&msg, nullptr, 0, 0)) {
    ::TranslateMessage(&msg);
    ::DispatchMessage(&msg);
  }

  ::CoUninitialize();
  return EXIT_SUCCESS;
}
