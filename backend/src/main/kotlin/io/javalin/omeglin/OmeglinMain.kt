package io.javalin.omeglin

import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder
import io.javalin.http.Context
import io.javalin.http.staticfiles.Location
import org.eclipse.jetty.server.ServerConnector
import org.eclipse.jetty.util.ssl.SslContextFactory
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

// Guards against abuse of the public, unauthenticated /api/topics/refresh endpoint.
private val manualRefreshInProgress = AtomicBoolean(false)
private val lastManualRefreshMs = AtomicLong(0)
private const val MANUAL_REFRESH_MIN_INTERVAL_MS = 10L * 60 * 1000  // 10 min

fun main() {
    val keystorePath = System.getProperty("keystore.path", "keystore.jks")
    val keystorePass = System.getProperty("keystore.pass", "changeit")
    val useHttps     = java.io.File(keystorePath).exists()
    // Must match the ECS containerPort/ALB target group port (see infrastructure/stacks/catalog/app.yaml).
    val port         = System.getenv("PORT")?.toIntOrNull() ?: 4000

    // Auth + user store init.
    // Schema migrations and admin-account seeding are NOT run here anymore -
    // they're handled by the separate db-migrator/db-seed ECS tasks
    // (MigrateMain.kt/SeedMain.kt) before this service is deployed. This
    // service only opens a DML-only connection pool as application_user_fristajl.
    val jwtSecret = System.getenv("JWT_SECRET") ?: "changeme-dev-secret"

    // Prod (ECS service) sets RDS_HOST/RDS_PORT/DB_NAME/DB_USER/DB_SSL/
    // DB_IAM_AUTH (see infrastructure/stacks/catalog/app.yaml) - reuse the
    // same IAM-token resolution as the migrate/seed tasks. Local dev
    // (docker-compose) instead sets DB_URL/DB_USER/DB_PASSWORD directly.
    val (dbUrl, dbUser, dbPassword) = if (System.getenv("RDS_HOST") != null) {
        val creds = DbConnection.resolveFromEnv()
        Triple(creds.jdbcUrl, creds.user, creds.password)
    } else {
        Triple(
            System.getenv("DB_URL") ?: "jdbc:postgresql://localhost:5432/fristajl",
            System.getenv("DB_USER") ?: "postgres",
            System.getenv("DB_PASSWORD") ?: "postgres"
        )
    }
    // IAM auth tokens (see DbConnection) expire after 15 min - UserStore refreshes
    // the Hikari pool's password periodically using this, when applicable.
    val refreshIamToken: (() -> String)? =
        if (System.getenv("RDS_HOST") != null && System.getenv("DB_IAM_AUTH") == "true") {
            val host = System.getenv("RDS_HOST")!!
            val port = System.getenv("RDS_PORT")?.toIntOrNull() ?: 5432
            { DbConnection.generateIamToken(host, port, dbUser) }
        } else null
    AuthService.init(jwtSecret)
    Thread {
        try { UserStore.init(dbUrl, dbUser, dbPassword, refreshIamToken = refreshIamToken) }
        catch (e: Exception) { println("UserStore init failed: ${e.message}") }
    }.also { it.isDaemon = true }.start()

    Javalin.create { config ->
        config.staticFiles.add("src/main/resources/public", Location.EXTERNAL)
        config.http.maxRequestSize = 25L * 1024 * 1024  // 25 MB — allows beat uploads up to 20 MB

        config.bundledPlugins.enableCors { cors ->
            cors.addRule { it.anyHost() }
        }

        config.routes.apiBuilder {
            // ALB target group health check (infrastructure/stacks/catalog/app.yaml) — must always be cheap/fast.
            ApiBuilder.get("/health") { ctx: Context ->
                ctx.status(200).json(mapOf("status" to "ok"))
            }

            // S3 topics endpoint
            ApiBuilder.get("/api/topics/s3-random") { ctx: Context ->
                val topic = S3TopicsCache.getRandom()
                if (topic == null) {
                    ctx.status(503).json(mapOf("error" to "Tematy z S3 jeszcze się ładują."))
                } else {
                    ctx.json(mapOf("topic" to topic, "total" to S3TopicsCache.count))
                }
            }

            // Pre-generated AI topic cache endpoints
            ApiBuilder.get("/api/topics/random") { ctx: Context ->
                val count = ctx.queryParam("count")?.toIntOrNull()?.coerceIn(1, 100) ?: 10
                if (!TopicCache.isReady) {
                    ctx.status(503).json(mapOf(
                        "error"      to "Tematy są generowane, spróbuj za chwilę.",
                        "generating" to true
                    ))
                    return@get
                }
                ctx.json(mapOf(
                    "topics" to TopicCache.getRandomTopics(count),
                    "model"  to TopicCache.lastModel,
                    "total"  to TopicCache.count
                ))
            }

            ApiBuilder.get("/api/topics/refresh") { ctx: Context ->
                val now = System.currentTimeMillis()
                val last = lastManualRefreshMs.get()
                if (now - last < MANUAL_REFRESH_MIN_INTERVAL_MS || !manualRefreshInProgress.compareAndSet(false, true)) {
                    ctx.status(429).json(mapOf(
                        "error" to "Odświeżanie tematów jest już w trakcie lub było uruchomione zbyt niedawno."
                    ))
                    return@get
                }
                lastManualRefreshMs.set(now)
                Thread {
                    try {
                        TopicCache.populate(AiTopicGenerator.generateBatch(100))
                    } catch (e: Exception) {
                        println("TopicCache refresh failed: ${e.message}")
                    } finally {
                        manualRefreshInProgress.set(false)
                    }
                }.also { it.isDaemon = true }.start()
                ctx.json(mapOf(
                    "message"      to "Regeneracja tematów uruchomiona w tle.",
                    "currentCount" to TopicCache.count
                ))
            }

            // WebSocket matchmaking
            ApiBuilder.ws("/api/matchmaking", Matchmaker::websocket)

            ApiBuilder.get("/api/matchmaking/stats") { ctx: Context ->
                ctx.json(mapOf("waiting" to Matchmaker.waitingCount(), "online" to Matchmaker.onlineCount()))
            }

            // ── Auth ──────────────────────────────────────────────────────
            ApiBuilder.post("/api/auth/login") { ctx: Context ->
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                val username = b["username"] as? String ?: ""
                val password = b["password"] as? String ?: ""
                val token = AuthService.login(username, password)
                if (token == null) ctx.status(401).json(mapOf("error" to "Nieprawidłowe dane logowania"))
                else ctx.json(mapOf("token" to token))
            }

            ApiBuilder.get("/api/auth/me") { ctx: Context ->
                if (!AuthService.requireAuth(ctx)) return@get
                ctx.json(mapOf(
                    "username" to ctx.attribute<String>("username"),
                    "role"     to ctx.attribute<String>("role")
                ))
            }

            // ── Admin / Moderator ─────────────────────────────────────────
            ApiBuilder.get("/api/admin/proposals") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@get
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    ctx.json(mapOf("proposals" to ProposalsService.list(s3Endpoint)))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Nie udało się pobrać propozycji: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/proposals/approve") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    ProposalsService.approve(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "approved" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd zatwierdzania: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/proposals/delete") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    ProposalsService.delete(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "deleted" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd usuwania: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/moderators") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                val username = (b["username"] as? String)?.trim() ?: ""
                val password = b["password"] as? String ?: ""
                val emailRegex = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
                if (username.isBlank() || password.isBlank()) {
                    ctx.status(400).json(mapOf("error" to "Wymagana nazwa użytkownika i hasło"))
                    return@post
                }
                if (!emailRegex.matches(username)) {
                    ctx.status(400).json(mapOf("error" to "Login moderatora musi być adresem e-mail"))
                    return@post
                }
                try {
                    UserStore.createModerator(username, password)
                    ctx.status(201).json(mapOf("ok" to true, "username" to username))
                } catch (e: IllegalArgumentException) {
                    ctx.status(409).json(mapOf("error" to e.message))
                }
            }

            ApiBuilder.get("/api/admin/moderators") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin")) return@get
                ctx.json(mapOf("moderators" to UserStore.listModerators()))
            }

            // ── Admin: pictures proposals ──────────────────────────────────
            ApiBuilder.get("/api/admin/pictures-proposals") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@get
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    ctx.json(mapOf("proposals" to MediaReviewService.listPictures(s3Endpoint)))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Nie udało się pobrać propozycji: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/pictures-proposals/approve") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaReviewService.approvePictures(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "approved" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd zatwierdzania: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/pictures-proposals/delete") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaReviewService.deletePictures(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "deleted" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd usuwania: ${e.message}"))
                }
            }

            // ── Admin: beats proposals ─────────────────────────────────────
            ApiBuilder.get("/api/admin/beats-proposals") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@get
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    ctx.json(mapOf("proposals" to MediaReviewService.listBeats(s3Endpoint)))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Nie udało się pobrać propozycji: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/beats-proposals/approve") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaReviewService.approveBeats(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "approved" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd zatwierdzania: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/beats-proposals/delete") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaReviewService.deleteBeats(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "deleted" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd usuwania: ${e.message}"))
                }
            }

            // ── Admin: sounds proposals ────────────────────────────────────
            ApiBuilder.get("/api/admin/sounds-proposals") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@get
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    ctx.json(mapOf("proposals" to MediaReviewService.listSounds(s3Endpoint)))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Nie udało się pobrać propozycji: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/sounds-proposals/approve") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaReviewService.approveSounds(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "approved" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd zatwierdzania: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/sounds-proposals/delete") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaReviewService.deleteSounds(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "deleted" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd usuwania: ${e.message}"))
                }
            }

            // ── Admin: tiktok proposals ────────────────────────────────────
            ApiBuilder.get("/api/admin/tiktoks-proposals") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@get
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    ctx.json(mapOf("proposals" to TikTokTrendingService.listProposals(s3Endpoint)))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Nie udało się pobrać propozycji: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/tiktoks-proposals/approve") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    TikTokTrendingService.approveProposals(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "approved" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd zatwierdzania: ${e.message}"))
                }
            }

            ApiBuilder.post("/api/admin/tiktoks-proposals/delete") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val keys = (b["keys"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    TikTokTrendingService.deleteProposals(keys, s3Endpoint)
                    ctx.json(mapOf("ok" to true, "deleted" to keys.size))
                } catch (e: Exception) {
                    ctx.status(500).json(mapOf("error" to "Błąd usuwania: ${e.message}"))
                }
            }
            ApiBuilder.get("/api/tiktok/trending") { ctx: Context ->
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                ctx.json(mapOf("videos" to TikTokTrendingService.list(s3Endpoint)))
            }

            // Returns only manually-added URLs (for admin panel display)
            ApiBuilder.get("/api/admin/tiktok/trending") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@get
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                ctx.json(mapOf("videos" to TikTokTrendingService.listManual(s3Endpoint)))
            }

            ApiBuilder.post("/api/admin/tiktok/trending/add") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                val url = b["url"] as? String
                if (url.isNullOrBlank()) {
                    ctx.status(400).json(mapOf("error" to "Brak pola url"))
                    return@post
                }
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                TikTokTrendingService.add(url.trim(), s3Endpoint)
                ctx.json(mapOf("ok" to true))
            }

            ApiBuilder.post("/api/admin/tiktok/trending/delete") { ctx: Context ->
                if (!AuthService.requireAuth(ctx, "admin", "moderator")) return@post
                @Suppress("UNCHECKED_CAST")
                val b = ctx.bodyAsClass(Map::class.java) as Map<String, Any?>
                @Suppress("UNCHECKED_CAST")
                val urls = (b["urls"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                TikTokTrendingService.remove(urls, s3Endpoint)
                ctx.json(mapOf("ok" to true))
            }

            // Picture propositions
            ApiBuilder.post("/api/pictures/propose") { ctx: Context ->
                if (!RateLimiter.tryAcquire(ctx.ip())) {
                    ctx.status(429).json(mapOf(
                        "error" to "Za dużo propozycji. Możesz dodać ${RateLimiter.LIMIT} na godzinę."
                    ))
                    return@post
                }
                val file = ctx.uploadedFile("file")
                if (file == null) {
                    ctx.status(400).json(mapOf("error" to "Brak pliku"))
                    return@post
                }
                val ct = file.contentType() ?: ""
                if (ct !in MediaPropositionService.ALLOWED_IMAGE_TYPES) {
                    ctx.status(400).json(mapOf("error" to "Dozwolone formaty: JPEG, PNG, WebP, GIF"))
                    return@post
                }
                val bytes = file.content().readBytes()
                if (bytes.size > MediaPropositionService.MAX_IMAGE_BYTES) {
                    ctx.status(400).json(mapOf("error" to "Plik za duży (max 5 MB)"))
                    return@post
                }
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaPropositionService.proposePicture(bytes, ct, s3Endpoint)
                    ctx.status(201).json(mapOf("ok" to true, "message" to "Dziękujemy za propozycję!"))
                } catch (e: Exception) {
                    println("PictureProposition failed: ${e.message}")
                    ctx.status(500).json(mapOf("error" to "Nie udało się zapisać propozycji"))
                }
            }

            // Beat propositions
            ApiBuilder.post("/api/beats/propose") { ctx: Context ->
                if (!RateLimiter.tryAcquire(ctx.ip())) {
                    ctx.status(429).json(mapOf(
                        "error" to "Za dużo propozycji. Możesz dodać ${RateLimiter.LIMIT} na godzinę."
                    ))
                    return@post
                }
                val file = ctx.uploadedFile("file")
                if (file == null) {
                    ctx.status(400).json(mapOf("error" to "Brak pliku"))
                    return@post
                }
                val ct = file.contentType() ?: ""
                if (ct !in MediaPropositionService.ALLOWED_BEAT_TYPES) {
                    ctx.status(400).json(mapOf("error" to "Dozwolony format: MP3"))
                    return@post
                }
                val bytes = file.content().readBytes()
                if (bytes.size > MediaPropositionService.MAX_BEAT_BYTES) {
                    ctx.status(400).json(mapOf("error" to "Plik za duży (max 20 MB)"))
                    return@post
                }
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaPropositionService.proposeBeat(bytes, s3Endpoint)
                    ctx.status(201).json(mapOf("ok" to true, "message" to "Dziękujemy za propozycję!"))
                } catch (e: Exception) {
                    println("BeatProposition failed: ${e.message}")
                    ctx.status(500).json(mapOf("error" to "Nie udało się zapisać propozycji"))
                }
            }

            // Sound propositions
            ApiBuilder.post("/api/sounds/propose") { ctx: Context ->
                if (!RateLimiter.tryAcquire(ctx.ip())) {
                    ctx.status(429).json(mapOf(
                        "error" to "Za dużo propozycji. Możesz dodać ${RateLimiter.LIMIT} na godzinę."
                    ))
                    return@post
                }
                val file = ctx.uploadedFile("file")
                if (file == null) {
                    ctx.status(400).json(mapOf("error" to "Brak pliku"))
                    return@post
                }
                val ct = file.contentType() ?: ""
                if (ct !in MediaPropositionService.ALLOWED_BEAT_TYPES) {
                    ctx.status(400).json(mapOf("error" to "Dozwolony format: MP3"))
                    return@post
                }
                val bytes = file.content().readBytes()
                if (bytes.size > MediaPropositionService.MAX_BEAT_BYTES) {
                    ctx.status(400).json(mapOf("error" to "Plik za duży (max 20 MB)"))
                    return@post
                }
                val s3Endpoint = System.getenv("S3_ENDPOINT")
                try {
                    MediaPropositionService.proposeSound(bytes, s3Endpoint)
                    ctx.status(201).json(mapOf("ok" to true, "message" to "Dziękujemy za propozycję!"))
                } catch (e: Exception) {
                    println("SoundProposition failed: ${e.message}")
                    ctx.status(500).json(mapOf("error" to "Nie udało się zapisać propozycji"))
                }
            }

            // Topic propositions
            ApiBuilder.post("/api/topics/propose") { ctx: Context ->
                if (!RateLimiter.tryAcquire(ctx.ip())) {
                    ctx.status(429).json(mapOf(
                        "error" to "Za dużo propozycji. Możesz dodać ${RateLimiter.LIMIT} tematów na godzinę."
                    ))
                    return@post
                }
                val body = ctx.bodyAsClass(Map::class.java)
                @Suppress("UNCHECKED_CAST")
                val topic = (body as Map<String, Any?>)["topic"] as? String
                when {
                    topic.isNullOrBlank() ->
                        ctx.status(400).json(mapOf("error" to "Temat nie może być pusty"))
                    topic.length > TopicPropositionService.MAX_LENGTH ->
                        ctx.status(400).json(mapOf("error" to "Temat za długi (max ${TopicPropositionService.MAX_LENGTH} znaków)"))
                    else -> {
                        val s3Endpoint = System.getenv("S3_ENDPOINT")
                        try {
                            TopicPropositionService.propose(topic.trim(), s3Endpoint)
                            ctx.status(201).json(mapOf("ok" to true, "message" to "Dziękujemy za propozycję!"))
                        } catch (e: Exception) {
                            println("TopicProposition failed: ${e.message}")
                            ctx.status(500).json(mapOf("error" to "Nie udało się zapisać propozycji"))
                        }
                    }
                }
            }

            // Tipeo widget proxy (bypasses X-Frame-Options)
            ApiBuilder.get("/api/tipeo-widget") { ctx: Context ->
                try {
                    val html = java.net.URL("https://tipeo.pl/widget.php?token=d3df17c7f6").readText()
                    ctx.json(mapOf("html" to html))
                } catch (e: Exception) {
                    ctx.status(502).json(mapOf("error" to "Nie można pobrać widgetu."))
                }
            }

            // TikTok user propositions
            ApiBuilder.post("/api/tiktoks/propose") { ctx: Context ->
                if (!RateLimiter.tryAcquire(ctx.ip())) {
                    ctx.status(429).json(mapOf(
                        "error" to "Za dużo propozycji. Możesz dodać ${RateLimiter.LIMIT} na godzinę."
                    ))
                    return@post
                }
                val body = ctx.bodyAsClass(Map::class.java)
                @Suppress("UNCHECKED_CAST")
                val url = (body as Map<String, Any?>)["url"] as? String
                val tiktokUrlRegex = Regex("^https://www\\.tiktok\\.com/@[^/]+/video/\\d+$")
                when {
                    url.isNullOrBlank() ->
                        ctx.status(400).json(mapOf("error" to "Brak pola url"))
                    !tiktokUrlRegex.matches(url.trim()) ->
                        ctx.status(400).json(mapOf("error" to "Nieprawidłowy URL TikToka (wymagany format: https://www.tiktok.com/@user/video/123)"))
                    else -> {
                        val s3Endpoint = System.getenv("S3_ENDPOINT")
                        try {
                            TikTokTrendingService.proposeUrl(url.trim(), s3Endpoint)
                            ctx.status(201).json(mapOf("ok" to true, "message" to "Dziękujemy za propozycję!"))
                        } catch (e: Exception) {
                            println("TikTokProposition failed: ${e.message}")
                            ctx.status(500).json(mapOf("error" to "Nie udało się zapisać propozycji"))
                        }
                    }
                }
            }
        }

        if (useHttps) {
            config.jetty.modifyServer { server ->
                server.connectors.forEach { it.stop() }
                server.connectors = emptyArray()
                val ssl = SslContextFactory.Server()
                ssl.keyStorePath       = keystorePath
                ssl.keyStorePassword   = keystorePass
                ssl.keyManagerPassword = keystorePass
                val https = ServerConnector(server, ssl)
                https.host = "0.0.0.0"
                https.port = port
                server.addConnector(https)
            }
        }
    }.start("0.0.0.0", if (useHttps) 0 else port).also {
        val scheme = if (useHttps) "https" else "http"
        println("FreestyleArena running at $scheme://0.0.0.0:$port")
        // Load S3 topics into memory
        val s3Endpoint = System.getenv("S3_ENDPOINT")
        Thread {
            try {
                S3TopicsCache.load(s3Endpoint)
            } catch (e: Exception) {
                println("S3TopicsCache load failed: ${e.message}")
            }
        }.also { it.isDaemon = true }.start()
        // Refresh AI topic cache immediately, then every 4 hours
        val scheduler = Executors.newSingleThreadScheduledExecutor { r ->
            Thread(r, "topic-cache-refresh").also { it.isDaemon = true }
        }
        scheduler.scheduleAtFixedRate({
            try {
                TopicCache.populate(AiTopicGenerator.generateBatch(100))
            } catch (e: Exception) {
                println("TopicCache refresh failed: ${e.message}")
            }
        }, 0, 4, TimeUnit.HOURS)
        scheduler.scheduleAtFixedRate({ RateLimiter.cleanup() }, 60, 60, TimeUnit.MINUTES)
    }
}
