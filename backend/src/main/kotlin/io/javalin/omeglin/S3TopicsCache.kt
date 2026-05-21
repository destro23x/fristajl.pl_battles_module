package io.javalin.omeglin

import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.concurrent.atomic.AtomicReference

object S3TopicsCache {

    private val topics = AtomicReference<List<String>>(emptyList())

    val isReady: Boolean get() = topics.get().isNotEmpty()
    val count:   Int     get() = topics.get().size

    fun getRandom(): String? {
        val all = topics.get()
        return if (all.isEmpty()) null else all.random()
    }

    fun load(s3Endpoint: String?, maxAttempts: Int = 20, retryDelayMs: Long = 5_000) {
        val baseUrl = if (s3Endpoint != null) {
            "$s3Endpoint/fristajl-prod-topics"
        } else {
            "https://fristajl-prod-topics.s3.eu-central-1.amazonaws.com"
        }
        val url = "$baseUrl/topics.txt"

        val http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build()

        repeat(maxAttempts) { attempt ->
            try {
                val response = http.send(
                    HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(15))
                        .GET()
                        .build(),
                    HttpResponse.BodyHandlers.ofString()
                )

                if (response.statusCode() == 200) {
                    val loaded = response.body().lines().map { it.trim() }.filter { it.isNotBlank() }
                    topics.set(loaded)
                    println("S3TopicsCache: załadowano ${loaded.size} tematów z $url")
                    return
                }

                println("S3TopicsCache: próba ${attempt + 1}/$maxAttempts — HTTP ${response.statusCode()}, retry za ${retryDelayMs / 1000}s…")
            } catch (e: Exception) {
                println("S3TopicsCache: próba ${attempt + 1}/$maxAttempts — ${e.message}, retry za ${retryDelayMs / 1000}s…")
            }

            if (attempt < maxAttempts - 1) Thread.sleep(retryDelayMs)
        }

        throw RuntimeException("S3TopicsCache: nie udało się pobrać topics.txt po $maxAttempts próbach")
    }
}
