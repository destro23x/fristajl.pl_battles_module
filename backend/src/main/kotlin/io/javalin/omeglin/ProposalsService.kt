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

object ProposalsService {

    private const val PROPS_BUCKET  = "fristajl-prod-topics-propositions"
    private const val TOPICS_BUCKET = "fristajl-prod-topics"
    private const val TOPICS_KEY    = "topics.txt"

    data class Proposal(val key: String, val topic: String)

    fun list(s3Endpoint: String?): List<Proposal> =
        buildClient(s3Endpoint).use { client ->
            client.listObjectsV2(
                ListObjectsV2Request.builder().bucket(PROPS_BUCKET).build()
            ).contents().map { obj ->
                val content = client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(PROPS_BUCKET).key(obj.key()).build()
                ).asUtf8String().trim()
                Proposal(obj.key(), content)
            }
        }

    fun approve(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->

            // Fetch topics for each key
            val newTopics = keys.mapNotNull { key ->
                runCatching {
                    client.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(PROPS_BUCKET).key(key).build()
                    ).asUtf8String().trim()
                }.getOrNull()
            }.filter { it.isNotBlank() }

            if (newTopics.isNotEmpty()) {
                // Download existing topics.txt (may not exist yet)
                val existing = runCatching {
                    client.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(TOPICS_BUCKET).key(TOPICS_KEY).build()
                    ).asUtf8String()
                }.getOrDefault("")

                val updated = buildString {
                    val trimmed = existing.trimEnd()
                    if (trimmed.isNotEmpty()) {
                        append(trimmed)
                        append("\n")
                    }
                    append(newTopics.joinToString("\n"))
                }

                client.putObject(
                    PutObjectRequest.builder()
                        .bucket(TOPICS_BUCKET)
                        .key(TOPICS_KEY)
                        .contentType("text/plain; charset=utf-8")
                        .serverSideEncryption(ServerSideEncryption.AES256)
                        .build(),
                    RequestBody.fromString(updated, Charsets.UTF_8)
                )
            }

            // Delete approved proposals
            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(PROPS_BUCKET).key(key).build()
                    )
                }
            }

            // Reload S3TopicsCache in background
            Thread {
                try { S3TopicsCache.load(System.getenv("S3_ENDPOINT"), maxAttempts = 1) }
                catch (e: Exception) { println("S3TopicsCache reload after approval failed: ${e.message}") }
            }.also { it.isDaemon = true }.start()
        }
    }

    fun delete(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(PROPS_BUCKET).key(key).build()
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
