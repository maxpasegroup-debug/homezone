package com.example.homezone_mobile
import android.app.Activity
import android.content.Intent
import android.provider.OpenableColumns
import android.util.Base64
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/** Documents stay in memory until the user explicitly chooses an export destination. */
class DocumentBridge(private val activity: Activity) {
    private var pending: MethodChannel.Result? = null
    private var pendingOperation: String? = null
    private var exportBytes: ByteArray? = null
    private var nextCode = 7400
    private var pendingCode: Int? = null
    private var exporting = false
    private val maximum = 524288
    fun handle(call: MethodCall, result: MethodChannel.Result) {
        val operation = call.argument<String>("operation")
        if (call.method == "cancel") {
            if (operation != null && operation == pendingOperation) {
                val old = pending; val oldCode = pendingCode; pending = null; pendingOperation = null; exportBytes = null; pendingCode = null
                try { if (oldCode != null) activity.finishActivity(oldCode) } catch (_: Exception) { }
                old?.success(null)
            }
            result.success(null); return
        }
        if (operation == null || !operation.matches(Regex("[a-f0-9]{32}"))) { result.error("invalid", "Document action unavailable.", null); return }
        if (call.method != "pick" && call.method != "export") { result.notImplemented(); return }
        if (pending != null) { result.error("busy", "A document action is already active.", null); return }
        try {
            require(nextCode < 65500)
            val requestCode = nextCode++; pendingCode = requestCode; exporting = call.method == "export"
            if (call.method == "pick") {
                pending = result; pendingOperation = operation
                activity.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    type = "application/pdf"; addCategory(Intent.CATEGORY_OPENABLE)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }, requestCode)
            } else {
                val raw = call.argument<String>("base64") ?: throw IllegalArgumentException()
                require(raw.length <= 700000)
                val bytes = Base64.decode(raw, Base64.NO_WRAP)
                require(bytes.size in 5..maximum && String(bytes.copyOfRange(0, 5), Charsets.US_ASCII) == "%PDF-")
                val name = (call.argument<String>("fileName") ?: "document.pdf").replace(Regex("[^A-Za-z0-9 ._-]"), "_").take(140)
                pending = result; pendingOperation = operation; exportBytes = bytes
                activity.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    type = "application/pdf"; addCategory(Intent.CATEGORY_OPENABLE)
                    putExtra(Intent.EXTRA_TITLE, name)
                }, requestCode)
            }
        } catch (_: Exception) { pending = null; pendingOperation = null; exportBytes = null; result.error("unavailable", "Document action unavailable.", null) }
    }
    fun onActivityResult(code: Int, resultCode: Int, data: Intent?): Boolean {
        if (code < 7400 || code >= nextCode) return false
        if (code != pendingCode) return true
        val result = pending ?: return true
        val bytesToExport = exportBytes
        val wasExporting = exporting
        pending = null; pendingOperation = null; exportBytes = null; pendingCode = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) { result.success(null); return true }
        try {
            if (wasExporting) {
                require(bytesToExport != null)
                val stream = activity.contentResolver.openOutputStream(uri) ?: throw IllegalStateException()
                stream.use { it.write(bytesToExport); it.flush() }; result.success(true)
            } else {
                val output = java.io.ByteArrayOutputStream()
                activity.contentResolver.openInputStream(uri)?.use { input ->
                    val buffer = ByteArray(8192)
                    while (output.size() <= maximum) { val read = input.read(buffer); if (read < 0) break; output.write(buffer, 0, read) }
                } ?: throw IllegalStateException()
                val bytes = output.toByteArray()
                require(bytes.size in 5..maximum && String(bytes.copyOfRange(0, 5), Charsets.US_ASCII) == "%PDF-")
                val name = activity.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) cursor.getString(0) else null
                } ?: "document.pdf"
                result.success(mapOf("fileName" to name.take(180), "base64" to Base64.encodeToString(bytes, Base64.NO_WRAP)))
            }
        } catch (_: Exception) { result.error("unavailable", "Choose a readable PDF up to 512 KiB, or retry the export.", null) }
        return true
    }
    fun dispose() { pending?.error("closed", "Document action ended.", null); pending = null; pendingOperation = null; exportBytes = null }
}
