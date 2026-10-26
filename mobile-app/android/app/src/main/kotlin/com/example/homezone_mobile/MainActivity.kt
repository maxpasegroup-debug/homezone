package com.example.homezone_mobile

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.content.Intent
import android.content.ActivityNotFoundException
import android.net.Uri
import android.app.Activity
import android.util.Base64

class MainActivity : FlutterActivity() {
    private var documents: DocumentBridge? = null
    private var photoResult: MethodChannel.Result? = null
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        documents = DocumentBridge(this)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "homezone/private-documents")
            .setMethodCallHandler { call, result -> documents?.handle(call, result) }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "homezone/account-browser")
            .setMethodCallHandler { call, result ->
                if (call.method != "open") result.notImplemented()
                else try {
                    val uri = Uri.parse(call.argument<String>("url") ?: "")
                    val origin = Uri.parse(call.argument<String>("origin") ?: "")
                    require(uri.scheme == "https" && uri.host != null && uri.host == origin.host && uri.port == origin.port &&
                        uri.encodedUserInfo == null && uri.query == null && uri.fragment == null &&
                        (uri.path == "/dashboard" || uri.path?.startsWith("/dashboard/") == true))
                    startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); result.success(true)
                } catch (_: Exception) { result.success(false) }
            }
        val vault = SessionVaultBridge(applicationContext)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "homezone/media-picker")
            .setMethodCallHandler { call, result ->
                if (call.method != "image") result.notImplemented()
                else if (photoResult != null) result.error("busy", "A photograph is already being selected.", null)
                else {
                    photoResult = result
                    try {
                        startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                            type = "image/*"
                            addCategory(Intent.CATEGORY_OPENABLE)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }, 7301)
                    } catch (_: Exception) {
                        photoResult = null
                        result.error("unavailable", "Photograph selection is unavailable.", null)
                    }
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "homezone/session-vault")
            .setMethodCallHandler { call, result -> vault.handle(call, result) }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "homezone/listing-location")
            .setMethodCallHandler { call, result ->
                if (call.method != "open") {
                    result.notImplemented()
                } else {
                    val latitude = call.argument<Number>("latitude")?.toDouble()
                    val longitude = call.argument<Number>("longitude")?.toDouble()
                    if (latitude == null || longitude == null || !latitude.isFinite() || !longitude.isFinite() ||
                        latitude !in -90.0..90.0 || longitude !in -180.0..180.0) {
                        result.success(false)
                    } else {
                        val coordinates = "$latitude,$longitude"
                        try {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("geo:$coordinates?q=$coordinates")))
                            result.success(true)
                        } catch (_: ActivityNotFoundException) {
                            result.success(false)
                        } catch (_: SecurityException) {
                            result.success(false)
                        }
                    }
                }
            }
    }
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (documents?.onActivityResult(requestCode, resultCode, data) == true) return
        if (requestCode != 7301) return
        val result = photoResult ?: return
        photoResult = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) { result.success(null); return }
        try {
            val bytes = contentResolver.openInputStream(uri)?.use { input ->
                val output = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                while (output.size() <= 6 * 1024 * 1024) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    output.write(buffer, 0, count)
                }
                output.toByteArray()
            }
            if (bytes == null || bytes.isEmpty() || bytes.size > 6 * 1024 * 1024) {
                result.error("size", "Choose a photograph smaller than 6 MB.", null)
            } else result.success(mapOf("base64" to Base64.encodeToString(bytes, Base64.NO_WRAP)))
        } catch (_: Exception) { result.error("unavailable", "The photograph could not be read.", null) }
    }
    override fun onDestroy() {
        documents?.dispose(); documents = null
        photoResult?.error("closed", "Photograph selection ended.", null)
        photoResult = null
        super.onDestroy()
    }
}
