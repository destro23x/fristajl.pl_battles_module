package io.javalin.omeglin

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.concurrent.atomic.AtomicReference

data class GeneratedTopics(val topics: List<String>, val model: String)
class RateLimitException(message: String, val retryAfterSeconds: Int) : RuntimeException(message)
class InvalidApiKeyException(message: String) : RuntimeException(message)

// ─── In-memory topic cache ────────────────────────────────────────────────────
object TopicCache {
    private val _topics = AtomicReference<List<String>>(emptyList())
    private val _model  = AtomicReference<String>("")

    val isReady:   Boolean get() = _topics.get().isNotEmpty()
    val count:     Int     get() = _topics.get().size
    val lastModel: String  get() = _model.get()

    fun getRandomTopics(n: Int): List<String> {
        val all = _topics.get()
        return if (all.isEmpty()) emptyList() else all.shuffled().take(n.coerceAtMost(all.size))
    }

    fun populate(result: GeneratedTopics) {
        _topics.set(result.topics)
        _model.set(result.model)
        println("TopicCache: załadowano ${result.topics.size} tematów z modelu ${result.model}")
    }
}

private data class EndpointHealth(val uptimePercent: Double?, val latencyP50Seconds: Double?)

// ─── AI topic generator ───────────────────────────────────────────────────────
object AiTopicGenerator {

    private const val MIN_UPTIME_PERCENT = 98.0
    private const val MAX_LATENCY_SECONDS = 4.0

    /** Static fallback used only if the live OpenRouter models list can't be fetched. */
    val FALLBACK_FREE_MODELS = listOf(
        "z-ai/glm-4.5-air:free",
        "openai/gpt-oss-120b:free",
        "openai/gpt-oss-20b:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "nvidia/nemotron-nano-9b-v2:free",
        "arcee-ai/trinity-large-thinking:free",
        "poolside/laguna-m.1:free",
        "poolside/laguna-xs.2:free",
        "baidu/cobuddy:free",
    )

    private val http: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(30))
        .build()

    /** Fetches the current list of free model ids from OpenRouter (ids ending with ":free"). */
    private fun fetchFreeModels(): List<String> {
        val request = HttpRequest.newBuilder()
            .uri(URI.create("https://openrouter.ai/api/v1/models"))
            .timeout(Duration.ofSeconds(30))
            .GET()
            .build()

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        check(response.statusCode() == 200) { "OpenRouter /models returned ${response.statusCode()}" }

        return mapper.readTree(response.body())
            .path("data")
            .mapNotNull { it.path("id").asText(null) }
            .filter { it.endsWith(":free") }
    }

    /** Fetches uptime/latency stats for a model's endpoints (best across providers). */
    private fun fetchEndpointHealth(modelId: String): EndpointHealth {
        val (author, slug) = modelId.split("/", limit = 2).let { it[0] to it.getOrElse(1) { "" } }
        val request = HttpRequest.newBuilder()
            .uri(URI.create("https://openrouter.ai/api/v1/models/$author/$slug/endpoints"))
            .timeout(Duration.ofSeconds(15))
            .GET()
            .build()

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() != 200) return EndpointHealth(null, null)

        val endpoints = mapper.readTree(response.body()).path("data").path("endpoints")
        val uptimes = endpoints.mapNotNull { it.path("uptime_last_30m").takeIf { n -> n.isNumber }?.asDouble() }
        val latencies = endpoints.mapNotNull { it.path("latency_last_30m").path("p50").takeIf { n -> n.isNumber }?.asDouble() }

        // Best-case across providers: highest uptime, lowest observed p50 latency.
        return EndpointHealth(uptimePercent = uptimes.maxOrNull(), latencyP50Seconds = latencies.minOrNull())
    }

    /** Keeps models meeting uptime/latency thresholds; if none qualify, falls back to the 5 best. */
    private fun selectHealthyModels(models: List<String>): List<String> {
        val ranked = models.map { it to runCatching { fetchEndpointHealth(it) }.getOrDefault(EndpointHealth(null, null)) }

        val healthy = ranked.filter { (_, health) ->
            val uptimeOk = health.uptimePercent?.let { it > MIN_UPTIME_PERCENT } ?: true
            val latencyOk = health.latencyP50Seconds?.let { it <= MAX_LATENCY_SECONDS } ?: true
            uptimeOk && latencyOk
        }.map { it.first }

        if (healthy.isNotEmpty()) return healthy

        return ranked
            .sortedWith(
                compareByDescending<Pair<String, EndpointHealth>> { it.second.uptimePercent ?: -1.0 }
                    .thenBy { it.second.latencyP50Seconds ?: Double.MAX_VALUE }
            )
            .take(5)
            .map { it.first }
    }

    private val mapper: ObjectMapper = jacksonObjectMapper()

    // Extracts the first JSON array from the model response, even if wrapped in markdown fences.
    private val arrayRegex = Regex("""\[[\s\S]*?]""")

    /**
     * Fetches the live list of free models and generates [count] topics.
     * Falls back through the full shuffled list on 429 / 402 errors.
     */
    fun generateBatch(count: Int = 100): GeneratedTopics {
        val apiKey = System.getenv("OPENROUTER_API_KEY")?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("OPENROUTER_API_KEY is not set or empty")

        val freeModels = runCatching { fetchFreeModels() }
            .onFailure { println("TopicCache: nie udało się pobrać listy modeli (${it.message}), używam listy zapasowej") }
            .getOrNull()
            ?.takeIf { it.isNotEmpty() }
            ?: FALLBACK_FREE_MODELS

        val healthyModels = runCatching { selectHealthyModels(freeModels) }
            .onFailure { println("TopicCache: nie udało się sprawdzić uptime/latency modeli (${it.message})") }
            .getOrNull()
            ?.takeIf { it.isNotEmpty() }
            ?: freeModels

        val shuffled = healthyModels.shuffled()
        var lastException: Exception = RuntimeException("Brak dostępnych modeli")

        for (modelId in shuffled) {
            try {
                println("TopicCache: próbuję model $modelId...")
                return callModel(apiKey, modelId, count)
            } catch (e: InvalidApiKeyException) {
                // Bad key affects every model - no point trying the rest of the list.
                throw e
            } catch (e: RateLimitException) {
                println("TopicCache: $modelId przeciążony, przechodzę dalej")
                lastException = e; continue
            } catch (e: Exception) {
                // Includes 403 (e.g. models requiring an agentic harness) and any other
                // per-model failure - skip to the next model instead of aborting the batch.
                println("TopicCache: $modelId niedostępny (${e.message}), przechodzę dalej")
                lastException = e; continue
            }
        }
        throw lastException
    }

    private fun callModel(apiKey: String, modelId: String, count: Int): GeneratedTopics {
        val prompt = "Wygeneruj $count unikalnych, kreatywnych tematów do freestyle rapu po polsku. " +
            "Tematy powinny być różnorodne, zaskakujące i nadające się do bitew freestyle'owych. " +
            "Zwróć TYLKO tablicę JSON ze stringami, zero dodatkowego tekstu. " +
            "Przykład: [\"pierwsza miłość\",\"kosmiczny karp\"]"

        val body = mapper.writeValueAsString(
            mapOf(
                "model"       to modelId,
                "messages"    to listOf(mapOf("role" to "user", "content" to prompt)),
                "temperature" to 0.9
            )
        )

        val request = HttpRequest.newBuilder()
            .uri(URI.create("https://openrouter.ai/api/v1/chat/completions"))
            .timeout(Duration.ofSeconds(60))
            .header("Authorization", "Bearer $apiKey")
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://fristajl.pl")
            .header("X-Title", "Fristajl.pl")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())

        when (response.statusCode()) {
            200  -> { /* ok */ }
            429  -> {
                val retryAfter = runCatching {
                    mapper.readTree(response.body())
                        .path("error").path("metadata").path("retry_after_seconds").asInt(30)
                }.getOrDefault(30)
                throw RateLimitException("Model $modelId przeciążony ($retryAfter s).", retryAfter)
            }
            402  -> throw IllegalStateException(
                "Model $modelId wymaga kredytów u dostawcy. Ustaw OPENROUTER_API_KEY z własnym kluczem OpenRouter."
            )
            401  -> throw InvalidApiKeyException(
                "OPENROUTER_API_KEY jest nieprawidłowy lub wygasł (401: ${response.body()})."
            )
            else -> throw RuntimeException("OpenRouter returned ${response.statusCode()}: ${response.body()}")
        }

        val content = mapper.readTree(response.body())
            .path("choices").get(0)
            .path("message").path("content")
            .asText()

        val jsonArray = arrayRegex.find(content)?.value
            ?: throw RuntimeException("Model did not return a JSON array. Raw response: $content")

        val topics = mapper.readTree(jsonArray)
            .map { it.asText() }
            .filter { it.isNotBlank() }

        return GeneratedTopics(topics = topics, model = modelId)
    }
}
