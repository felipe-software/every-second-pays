package expo.modules.notificationmotion

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.util.LruCache
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

internal class MotionImages(private val context: Context) {
  private val bitmapCache = object : LruCache<String, Bitmap>(4_000_000) {
    override fun sizeOf(key: String, value: Bitmap): Int = value.allocationByteCount
  }
  private val bytesCache = object : LruCache<String, ByteArray>(4_000_000) {
    override fun sizeOf(key: String, value: ByteArray): Int = value.size
  }

  fun decode(source: String): Bitmap {
    bitmapCache.get(source)?.let { return it }
    val bytes = read(source)
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    validateDimensions(bounds.outWidth, bounds.outHeight)
    val bitmap = requireNotNull(BitmapFactory.decodeByteArray(bytes, 0, bytes.size)) {
      "Could not decode notification image."
    }
    bitmapCache.put(source, bitmap)
    return bitmap
  }

  private fun validateDimensions(width: Int, height: Int) {
    require(width in 1..1024 && height in 1..1024 && width.toLong() * height <= 524288) {
      "Images must be at most 1024 per side and 524288 samples in total. Resize before publishing."
    }
  }

  private fun read(source: String): ByteArray {
    bytesCache.get(source)?.let { return it }
    val bytes = when {
      source.startsWith("data:image/") -> {
        require(source.length <= 2_800_000) { "Image data URI is too large." }
        Base64.decode(source.substringAfter(";base64,", ""), Base64.DEFAULT)
      }
      source.startsWith("https://") -> download(source)
      else -> {
        val uri = Uri.parse(source)
        require(uri.scheme == "file" || uri.scheme == "content") {
          "Use an HTTPS URL, local image URI or base64 data URI."
        }
        requireNotNull(context.contentResolver.openInputStream(uri)).use(::readBounded)
      }
    }
    require(bytes.size <= MAX_SOURCE_BYTES) { "Image source exceeds 2 MB." }
    bytesCache.put(source, bytes)
    return bytes
  }

  private fun download(source: String): ByteArray {
    val connection = URL(source).openConnection() as HttpURLConnection
    return try {
      connection.connectTimeout = 5_000
      connection.readTimeout = 8_000
      connection.instanceFollowRedirects = true
      connection.setRequestProperty("Accept", "image/*")
      connection.setRequestProperty("User-Agent", "Noti/0.1")
      require(connection.responseCode in 200..299) {
        "Image download failed with HTTP ${connection.responseCode}."
      }
      val length = connection.contentLengthLong
      require(length < 0 || length <= MAX_SOURCE_BYTES) { "Image source exceeds 2 MB." }
      connection.inputStream.use(::readBounded)
    } finally {
      connection.disconnect()
    }
  }

  private fun readBounded(stream: java.io.InputStream): ByteArray {
    val output = ByteArrayOutputStream()
    val buffer = ByteArray(8192)
    var count = stream.read(buffer)
    while (count != -1) {
      require(output.size() + count <= MAX_SOURCE_BYTES) { "Image source exceeds 2 MB." }
      output.write(buffer, 0, count)
      count = stream.read(buffer)
    }
    return output.toByteArray()
  }

  private companion object {
    const val MAX_SOURCE_BYTES = 2_000_000
    const val MAX_DECODED_BYTES = 3_500_000
  }
}
