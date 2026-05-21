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
import java.security.MessageDigest

object TopicPropositionService {

    private const val BUCKET     = "fristajl-prod-topics-propositions"
    const val MAX_LENGTH = 200

    fun propose(topic: String, s3Endpoint: String?) {
        val key = "topics/${sha256Hex(topic)}.txt"
        buildClient(s3Endpoint).use { client ->
            client.putObject(
                PutObjectRequest.builder()
                    .bucket(BUCKET)
                    .key(key)
                    .contentType("text/plain; charset=utf-8")
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .build(),
                RequestBody.fromString(topic, Charsets.UTF_8)
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
                    StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("test", "test")
                    )
                )
                .serviceConfiguration(
                    S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build()
                )
        }

        return builder.build()
    }

    private fun sha256Hex(input: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
