import Flutter
import UIKit
import Security
import UniformTypeIdentifiers

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var documentBridge: HomezoneDocumentPicker?
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    guard let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "HomezoneSessionVault") else { return }
    documentBridge = HomezoneDocumentPicker()
    FlutterMethodChannel(name: "homezone/private-documents", binaryMessenger: registrar.messenger())
      .setMethodCallHandler { [weak self] call, result in self?.documentBridge?.handle(call, result: result) }
    FlutterMethodChannel(name: "homezone/account-browser", binaryMessenger: registrar.messenger())
      .setMethodCallHandler { call, result in
        guard call.method == "open" else { result(FlutterMethodNotImplemented); return }
        guard let args = call.arguments as? [String: Any], let raw = args["url"] as? String,
          let base = args["origin"] as? String, let url = URLComponents(string: raw), let origin = URLComponents(string: base),
          url.scheme == "https", url.host != nil, url.host == origin.host, url.port == origin.port,
          url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
          (url.path == "/dashboard" || url.path.hasPrefix("/dashboard/")), let destination = url.url else { result(false); return }
        UIApplication.shared.open(destination, options: [:]) { result($0) }
      }
    FlutterMethodChannel(name: "homezone/session-vault", binaryMessenger: registrar.messenger())
      .setMethodCallHandler { call, result in
        guard let args = call.arguments as? [String: Any], let scope = args["scope"] as? String,
              !scope.isEmpty, scope.count <= 1024 else {
          result(FlutterError(code: "SESSION_STORAGE", message: "Protected session storage unavailable", details: nil)); return
        }
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
          kSecAttrService as String: "homezone.session.v1", kSecAttrAccount as String: scope,
          kSecAttrSynchronizable as String: false]
        switch call.method {
        case "delete":
          let status = SecItemDelete(query as CFDictionary)
          if status == errSecSuccess || status == errSecItemNotFound { result(nil) }
          else { result(FlutterError(code: "SESSION_STORAGE", message: "Protected session storage unavailable", details: nil)) }
        case "write":
          guard let value = args["value"] as? String, value.utf8.count <= 32768 else {
            result(FlutterError(code: "SESSION_STORAGE", message: "Protected session storage unavailable", details: nil)); return
          }
          let attributes: [String: Any] = [kSecValueData as String: Data(value.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
          var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
          if status == errSecItemNotFound {
            var add = query; attributes.forEach { add[$0.key] = $0.value }
            status = SecItemAdd(add as CFDictionary, nil)
          }
          if status == errSecSuccess { result(nil) }
          else { result(FlutterError(code: "SESSION_STORAGE", message: "Protected session storage unavailable", details: nil)) }
        case "read":
          var read = query; read[kSecReturnData as String] = true; read[kSecMatchLimit as String] = kSecMatchLimitOne
          var item: CFTypeRef?; let status = SecItemCopyMatching(read as CFDictionary, &item)
          if status == errSecItemNotFound { result(nil) }
          else if status == errSecSuccess, let data = item as? Data, data.count <= 32768 { result(String(data: data, encoding: .utf8)) }
          else { result(FlutterError(code: "SESSION_STORAGE", message: "Protected session storage unavailable", details: nil)) }
        default: result(FlutterMethodNotImplemented)
        }
      }
  }
}

// Uses system pick/export UI. Only explicitly exported copies outlive the action.
private final class HomezoneDocumentPicker: NSObject, UIDocumentPickerDelegate {
  private var pending: FlutterResult?
  private var exporting = false
  private var operation: String?
  private weak var activePicker: UIDocumentPickerViewController?
  private var temporary: URL?
  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let args = call.arguments as? [String: Any]
    let requestedOperation = args?["operation"] as? String
    if call.method == "cancel" {
      if requestedOperation != nil && requestedOperation == operation { let old = pending; activePicker?.dismiss(animated: true); cleanup(); old?(nil) }
      result(nil); return
    }
    guard let requestedOperation = requestedOperation, requestedOperation.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil else { result(FlutterError(code: "invalid", message: "Document action unavailable.", details: nil)); return }
    guard call.method == "pick" || call.method == "export" else { result(FlutterMethodNotImplemented); return }
    guard pending == nil else { result(FlutterError(code: "busy", message: "A document action is already active.", details: nil)); return }
    guard #available(iOS 14.0, *) else { result(FlutterError(code: "unavailable", message: "Use the authenticated website document controls.", details: nil)); return }
    guard var presenter = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).flatMap({ $0.windows }).first(where: { $0.isKeyWindow })?.rootViewController else { result(FlutterError(code: "unavailable", message: "Document action unavailable.", details: nil)); return }
    while let next = presenter.presentedViewController { presenter = next }
    do {
      let picker: UIDocumentPickerViewController
      exporting = call.method == "export"
      if exporting {
        guard let args = call.arguments as? [String: Any], let encoded = args["base64"] as? String, encoded.count <= 700000,
          let data = Data(base64Encoded: encoded), data.count <= 524288, String(data: data.prefix(5), encoding: .ascii) == "%PDF-" else { throw NSError(domain: "Document", code: 1) }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".pdf")
        temporary = url; try data.write(to: url, options: .completeFileProtection)
        picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
      } else { picker = UIDocumentPickerViewController(forOpeningContentTypes: [.pdf], asCopy: true) }
      operation = requestedOperation; activePicker = picker
      pending = result; picker.delegate = self; picker.allowsMultipleSelection = false
      presenter.present(picker, animated: true)
    } catch { cleanup(); result(FlutterError(code: "unavailable", message: "Document action unavailable.", details: nil)) }
  }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    guard controller === activePicker else { return }
    let result = pending; let wasExporting = exporting; cleanup(); result?(wasExporting ? false : nil)
  }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    guard controller === activePicker else { return }
    let result = pending
    defer { cleanup() }
    guard let url = urls.first else { result?(nil); return }
    if exporting { result?(true); return }
    let scoped = url.startAccessingSecurityScopedResource()
    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
    do {
      let handle = try FileHandle(forReadingFrom: url); defer { try? handle.close() }
      guard let data = try handle.read(upToCount: 524289), data.count <= 524288,
        String(data: data.prefix(5), encoding: .ascii) == "%PDF-" else { throw NSError(domain: "Document", code: 1) }
      result?(["fileName": String(url.lastPathComponent.prefix(180)), "base64": data.base64EncodedString()])
    } catch { result?(FlutterError(code: "unavailable", message: "Choose a readable PDF up to 512 KiB.", details: nil)) }
  }
  private func cleanup() {
    pending = nil; operation = nil; activePicker = nil
    if let url = temporary { try? FileManager.default.removeItem(at: url) }
    temporary = nil; exporting = false
  }
}
