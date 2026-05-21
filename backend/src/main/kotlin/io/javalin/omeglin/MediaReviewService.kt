package io.javalin.omeglin

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.S3Configuration
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.ServerSideEncryption
import java.net.URI

object MediaReviewService {

    private const val PICTURES_PROPS_BUCKET = "fristajl-prod-pictures-propositions"
    private const val PICTURES_BUCKET       = "fristajl-prod-pictures"
    private const val BEATS_PROPS_BUCKET    = "fristajl-prod-beats-propositions"
    private const val BEATS_BUCKET          = "fristajl-prod-beats"
    private const val SOUNDS_PROPS_BUCKET   = "fristajl-prod-sounds-propositions"
    private const val SOUNDS_BUCKET         = "fristajl-prod-sounds"

    data class MediaProposal(val key: String, val contentType: String)

    // ── Pictures ──────────────────────────────────────────────────────────────

    fun listPictures(s3Endpoint: String?): List<MediaProposal> =
        buildClient(s3Endpoint).use { client ->
            client.listObjectsV2(
                ListObjectsV2Request.builder().bucket(PICTURES_PROPS_BUCKET).build()
            ).contents().map { obj ->
                val ext = obj.key().substringAfterLast('.', "jpg").lowercase()
                val ct = when (ext) {
                    "png"  -> "image/png"
                    "webp" -> "image/webp"
                    "gif"  -> "image/gif"
                    else   -> "image/jpeg"
                }
                MediaProposal(obj.key(), ct)
            }
        }

    fun approvePictures(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            val currentCount = runCatching {
                client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(PICTURES_BUCKET).key("index").build()
                ).asUtf8String().trim().toInt()
            }.getOrDefault(0)

            var nextIdx = currentCount
            keys.forEach { key ->
                val ext = key.substringAfterLast('.', "jpg").lowercase()
                val ct = when (ext) {
                    "png"  -> "image/png"
                    "webp" -> "image/webp"
                    "gif"  -> "image/gif"
                    else   -> "image/jpeg"
                }
                runCatching {
                    val bytes = client.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(PICTURES_PROPS_BUCKET).key(key).build()
                    ).asByteArray()
                    client.putObject(
                        PutObjectRequest.builder()
                            .bucket(PICTURES_BUCKET).key("$nextIdx.$ext").contentType(ct)
                            .serverSideEncryption(ServerSideEncryption.AES256).build(),
                        RequestBody.fromBytes(bytes)
                    )
                    nextIdx++
                }
            }

            client.putObject(
                PutObjectRequest.builder()
                    .bucket(PICTURES_BUCKET).key("index").contentType("text/plain")
                    .serverSideEncryption(ServerSideEncryption.AES256).build(),
                RequestBody.fromString("$nextIdx", Charsets.UTF_8)
            )

            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(PICTURES_PROPS_BUCKET).key(key).build()
                    )
                }
            }
        }
    }

    fun deletePictures(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(PICTURES_PROPS_BUCKET).key(key).build()
                    )
                }
            }
        }
    }

    // ── Beats ─────────────────────────────────────────────────────────────────

    fun listBeats(s3Endpoint: String?): List<MediaProposal> =
        buildClient(s3Endpoint).use { client ->
            client.listObjectsV2(
                ListObjectsV2Request.builder().bucket(BEATS_PROPS_BUCKET).build()
            ).contents().map { obj ->
                MediaProposal(obj.key(), "audio/mpeg")
            }
        }

    fun approveBeats(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            val currentCount = runCatching {
                client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(BEATS_BUCKET).key("index").build()
                ).asUtf8String().trim().toInt()
            }.getOrDefault(0)

            var nextIdx = currentCount
            keys.forEach { key ->
                runCatching {
                    val bytes = client.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(BEATS_PROPS_BUCKET).key(key).build()
                    ).asByteArray()
                    client.putObject(
                        PutObjectRequest.builder()
                            .bucket(BEATS_BUCKET).key("$nextIdx.mp3").contentType("audio/mpeg")
                            .serverSideEncryption(ServerSideEncryption.AES256).build(),
                        RequestBody.fromBytes(bytes)
                    )
                    nextIdx++
                }
            }

            client.putObject(
                PutObjectRequest.builder()
                    .bucket(BEATS_BUCKET).key("index").contentType("text/plain")
                    .serverSideEncryption(ServerSideEncryption.AES256).build(),
                RequestBody.fromString("$nextIdx", Charsets.UTF_8)
            )

            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(BEATS_PROPS_BUCKET).key(key).build()
                    )
                }
            }
        }
    }

    fun deleteBeats(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(BEATS_PROPS_BUCKET).key(key).build()
                    )
                }
            }
        }
    }

    // ── Sounds ────────────────────────────────────────────────────────────────

    fun listSounds(s3Endpoint: String?): List<MediaProposal> =
        buildClient(s3Endpoint).use { client ->
            client.listObjectsV2(
                ListObjectsV2Request.builder().bucket(SOUNDS_PROPS_BUCKET).build()
            ).contents().map { obj ->
                MediaProposal(obj.key(), "audio/mpeg")
            }
        }

    fun approveSounds(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            val currentCount = runCatching {
                client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(SOUNDS_BUCKET).key("index").build()
                ).asUtf8String().trim().toInt()
            }.getOrDefault(0)

            var nextIdx = currentCount
            keys.forEach { key ->
                runCatching {
                    val bytes = client.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(SOUNDS_PROPS_BUCKET).key(key).build()
                    ).asByteArray()
                    client.putObject(
                        PutObjectRequest.builder()
                            .bucket(SOUNDS_BUCKET).key("$nextIdx.mp3").contentType("audio/mpeg")
                            .serverSideEncryption(ServerSideEncryption.AES256).build(),
                        RequestBody.fromBytes(bytes)
                    )
                    nextIdx++
                }
            }

            client.putObject(
                PutObjectRequest.builder()
                    .bucket(SOUNDS_BUCKET).key("index").contentType("text/plain")
                    .serverSideEncryption(ServerSideEncryption.AES256).build(),
                RequestBody.fromString("$nextIdx", Charsets.UTF_8)
            )

            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(SOUNDS_PROPS_BUCKET).key(key).build()
                    )
                }
            }
        }
    }

    fun deleteSounds(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(SOUNDS_PROPS_BUCKET).key(key).build()
                    )
                }
            }
        }
    }

    private fun buildClient(s3Endpoint: String?): S3Client {
        val builder = S3Client.builder()
            .region(Region.EU_CENTRAL_1)
            .httpClient(UrlConnectionHttpClient.builder().build())
        if (s3Endpoint != null) {
            builder
                .endpointOverride(URI.create(s3Endpoint))
                .credentialsProvider(
                    StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test"))
                )
                .serviceConfiguration(
                    S3Configuration.builder().pathStyleAccessEnabled(true).build()
                )
        }
        return builder.build()
    }
}
