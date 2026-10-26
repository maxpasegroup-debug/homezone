package com.example.homezone_mobile

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Device-bound Keystore AES-GCM. Preferences contain ciphertext only; backup disabled. */
class SessionVaultBridge(context: Context) {
    private val prefs = context.getSharedPreferences("homezone_session_v1", Context.MODE_PRIVATE)
    private val alias = "homezone_session_v1"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true).build())
        }.generateKey()
    }
    fun handle(call: MethodCall, result: MethodChannel.Result) {
        try {
            val scope = call.argument<String>("scope") ?: throw IllegalArgumentException()
            require(scope.length in 1..1024)
            val name = MessageDigest.getInstance("SHA-256").digest(scope.toByteArray()).joinToString("") { "%02x".format(it) }
            when (call.method) {
                "delete" -> { check(prefs.edit().remove(name).commit()); result.success(null) }
                "write" -> {
                    val value = call.argument<String>("value") ?: throw IllegalArgumentException()
                    require(value.length <= 32768)
                    val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()); updateAAD(scope.toByteArray()) }
                    val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
                    val encoded = Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)
                    check(prefs.edit().putString(name, encoded).commit()); result.success(null)
                }
                "read" -> {
                    val encoded = prefs.getString(name, null)
                    if (encoded == null) result.success(null) else {
                        val bytes = Base64.decode(encoded, Base64.NO_WRAP)
                        require(bytes.size in 29..65536)
                        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
                            init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12))); updateAAD(scope.toByteArray())
                        }
                        result.success(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
                    }
                }
                else -> result.notImplemented()
            }
        } catch (_: Exception) { result.error("SESSION_STORAGE", "Protected session storage unavailable", null) }
    }
}
