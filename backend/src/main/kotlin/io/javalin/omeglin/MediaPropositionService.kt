package io.javalin.omeglin

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.S3Configuration
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.ServerSideEncryption
import java.net.URI
import java.util.UUID

object MediaPropositionService {

    // Per-type buckets provisioned in infrastructure/stacks/catalog/storage.yaml (s3-pictures-propositions, s3-beats-propositions, s3-sounds-propositions).
    private const val PICTURES_BUCKET = "fristajl-prod-pictures-propositions"
    private const val BEATS_BUCKET    = "fristajl-prod-beats-propositions"
    private const val SOUNDS_BUCKET   = "fristajl-prod-sounds-propositions"

    val ALLOWED_IMAGE_TYPES = setOf("image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif")
    val ALLOWED_BEAT_TYPES  = setOf("audio/mpeg", "audio/mp3", "audio/x-mpeg", "audio/x-mp3")

    const val MAX_IMAGE_BYTES = 5L  * 1024 * 1024  // 5 MB
    const val MAX_BEAT_BYTES  = 20L * 1024 * 1024  // 20 MB

    fun proposePicture(bytes: ByteArray, contentType: String, s3Endpoint: String?) {
        val ext = when (contentType) {
            "image/png"  -> "png"
            "image/webp" -> "webp"
            "image/gif"  -> "gif"
            else         -> "jpg"
        }
        upload(bytes, PICTURES_BUCKET, "${UUID.randomUUID()}.$ext", contentType, s3Endpoint)
    }

    fun proposeBeat(bytes: ByteArray, s3Endpoint: String?) {
        upload(bytes, BEATS_BUCKET, "${UUID.randomUUID()}.mp3", "audio/mpeg", s3Endpoint)
    }

    fun proposeSound(bytes: ByteArray, s3Endpoint: String?) {
        upload(bytes, SOUNDS_BUCKET, "${UUID.randomUUID()}.mp3", "audio/mpeg", s3Endpoint)
    }

    private fun upload(bytes: ByteArray, bucket: String, key: String, contentType: String, s3Endpoint: String?) {
        buildClient(s3Endpoint).use { client ->
            client.putObject(
                PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .build(),
                RequestBody.fromBytes(bytes)
            )
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
