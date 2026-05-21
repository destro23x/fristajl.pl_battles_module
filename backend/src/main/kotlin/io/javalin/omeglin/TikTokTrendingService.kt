package io.javalin.omeglin

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
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
import java.util.UUID

object TikTokTrendingService {

    private val mapper = jacksonObjectMapper()
    private const val BUCKET            = "fristajl-prod-tiktoks"
    private const val KEY               = "trending.json"
    private const val PROPOSALS_BUCKET  = "fristajl-prod-tiktoks-propositions"

    data class TikTokProposal(val key: String, val url: String)

    // ── JSON helpers ──────────────────────────────────────────────────────────

    /** Reads the full trending.json. Returns {"manual": [], "auto": []} on error. */
    private fun loadData(s3Endpoint: String?): Map<String, MutableList<String>> {
        return try {
            buildClient(s3Endpoint).use { client ->
                val bytes = client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(BUCKET).key(KEY).build()
                ).asByteArray()
                val raw = mapper.readValue<Map<String, Any?>>(bytes)
                fun toList(key: String) =
                    (raw[key] as? List<*>)?.filterIsInstance<String>()?.toMutableList()
                        ?: mutableListOf()
                mapOf("manual" to toList("manual"), "auto" to toList("auto"))
            }
        } catch (e: Exception) {
            System.err.println("[TikTokTrendingService] loadData failed for bucket=$BUCKET key=$KEY: ${e::class.simpleName}: ${e.message}")
            mapOf("manual" to mutableListOf(), "auto" to mutableListOf())
        }
    }

    private fun saveData(data: Map<String, List<String>>, s3Endpoint: String?) {
        buildClient(s3Endpoint).use { client ->
            val json = mapper.writeValueAsBytes(data)
            client.putObject(
                PutObjectRequest.builder()
                    .bucket(BUCKET)
                    .key(KEY)
                    .contentType("application/json")
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .build(),
                RequestBody.fromBytes(json)
            )
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Returns combined list: manual-added first, then auto-fetched, deduped.
     * This is what the frontend receives.
     */
    fun list(s3Endpoint: String?): List<String> {
        val data = loadData(s3Endpoint)
        val manual = data["manual"] ?: emptyList()
        val auto   = data["auto"]   ?: emptyList()
        val seen   = manual.toMutableSet()
        return manual + auto.filter { seen.add(it) }
    }

    /** Adds a URL to the manual section. */
    fun add(url: String, s3Endpoint: String?) {
        val data = loadData(s3Endpoint)
        val manual = data["manual"]!!
        if (url !in manual) {
            manual.add(0, url)  // prepend so it shows first
            saveData(data, s3Endpoint)
        }
    }

    /** Removes URLs from the manual section. */
    fun remove(urls: List<String>, s3Endpoint: String?) {
        val data = loadData(s3Endpoint)
        data["manual"]!!.removeAll(urls.toSet())
        saveData(data, s3Endpoint)
    }

    /** Returns only the manually-added URLs (for the admin panel). */
    fun listManual(s3Endpoint: String?): List<String> =
        loadData(s3Endpoint)["manual"] ?: emptyList()

    // ── User proposals ────────────────────────────────────────────────────────

    /** Saves a user-proposed TikTok URL to the proposals bucket. */
    fun proposeUrl(url: String, s3Endpoint: String?) {
        buildClient(s3Endpoint).use { client ->
            val key = "${UUID.randomUUID()}.txt"
            client.putObject(
                PutObjectRequest.builder()
                    .bucket(PROPOSALS_BUCKET).key(key).contentType("text/plain")
                    .serverSideEncryption(ServerSideEncryption.AES256).build(),
                RequestBody.fromString(url, Charsets.UTF_8)
            )
        }
    }

    /** Lists all user-proposed TikTok URLs pending moderation. */
    fun listProposals(s3Endpoint: String?): List<TikTokProposal> =
        buildClient(s3Endpoint).use { client ->
            client.listObjectsV2(
                ListObjectsV2Request.builder().bucket(PROPOSALS_BUCKET).build()
            ).contents().mapNotNull { obj ->
                runCatching {
                    val url = client.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(PROPOSALS_BUCKET).key(obj.key()).build()
                    ).asUtf8String().trim()
                    TikTokProposal(obj.key(), url)
                }.getOrNull()
            }
        }

    /** Approves proposals: adds URLs to manual section of trending.json, then deletes proposals. */
    fun approveProposals(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            val proposals = keys.mapNotNull { key ->
                runCatching {
                    client.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(PROPOSALS_BUCKET).key(key).build()
                    ).asUtf8String().trim()
                }.getOrNull()
            }
            // Add to manual section
            val data = loadData(s3Endpoint)
            val manual = data["manual"]!!
            val existing = manual.toSet()
            proposals.filter { it !in existing }.forEach { manual.add(0, it) }
            saveData(data, s3Endpoint)
            // Delete approved proposals
            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(PROPOSALS_BUCKET).key(key).build()
                    )
                }
            }
        }
    }

    /** Deletes proposals without approving them. */
    fun deleteProposals(keys: List<String>, s3Endpoint: String?) {
        if (keys.isEmpty()) return
        buildClient(s3Endpoint).use { client ->
            keys.forEach { key ->
                runCatching {
                    client.deleteObject(
                        DeleteObjectRequest.builder().bucket(PROPOSALS_BUCKET).key(key).build()
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
