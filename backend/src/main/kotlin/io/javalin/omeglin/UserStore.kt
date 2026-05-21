package io.javalin.omeglin

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.mindrot.jbcrypt.BCrypt
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

enum class Role { ADMIN, MODERATOR }

data class User(val username: String, val passwordHash: String, val role: Role)

object UserStore {

    private lateinit var ds: HikariDataSource

    /**
     * Builds the runtime connection pool as application_user_fristajl (DML
     * only - no DDL privileges). Schema migrations and admin-account seeding
     * are no longer run here: they happen in the separate db-migrator/
     * db-seed ECS tasks (see MigrateMain.kt/SeedMain.kt) before this service
     * is deployed, so the DB is always expected to already be up to date.
     */
    fun init(
        dbUrl: String,
        dbUser: String,
        dbPassword: String,
        maxAttempts: Int = 20,
        retryDelayMs: Long = 3_000,
        refreshIamToken: (() -> String)? = null,
    ) {
        val config = HikariConfig().apply {
            jdbcUrl               = dbUrl
            username              = dbUser
            password              = dbPassword
            maximumPoolSize       = 5
            connectionTimeout     = 5_000
            initializationFailTimeout = -1
        }
        ds = HikariDataSource(config)

        // RDS IAM auth tokens expire after 15 min - refresh well before that so
        // Hikari always has a valid password ready for new connections.
        if (refreshIamToken != null) {
            Executors.newSingleThreadScheduledExecutor { r -> Thread(r, "iam-token-refresh").also { it.isDaemon = true } }
                .scheduleWithFixedDelay({
                    runCatching { ds.hikariConfigMXBean.setPassword(refreshIamToken()) }
                        .onFailure { println("UserStore: nie udało się odświeżyć tokenu IAM (${it.message})") }
                }, 10, 10, TimeUnit.MINUTES)
        }

        repeat(maxAttempts) { attempt ->
            try {
                ds.connection.use { it.createStatement().execute("SELECT 1") }
                println("UserStore: gotowe")
                return
            } catch (e: Exception) {
                println("UserStore: próba ${attempt + 1}/$maxAttempts — ${e.message}")
                if (attempt < maxAttempts - 1) Thread.sleep(retryDelayMs)
            }
        }
        throw RuntimeException("UserStore: nie można połączyć się z bazą danych po $maxAttempts próbach")
    }

    fun findByUsername(username: String): User? =
        ds.connection.use { conn ->
            conn.prepareStatement(
                "SELECT username, password_hash, role FROM users WHERE username = ?"
            ).use { st ->
                st.setString(1, username)
                val rs = st.executeQuery()
                if (!rs.next()) return null
                User(
                    rs.getString("username"),
                    rs.getString("password_hash"),
                    if (rs.getString("role") == "ADMIN") Role.ADMIN else Role.MODERATOR
                )
            }
        }

    fun createModerator(username: String, password: String) {
        val hash = BCrypt.hashpw(password, BCrypt.gensalt())
        ds.connection.use { conn ->
            try {
                conn.prepareStatement(
                    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'MODERATOR')"
                ).use { st ->
                    st.setString(1, username)
                    st.setString(2, hash)
                    st.executeUpdate()
                }
            } catch (e: java.sql.SQLException) {
                if (e.sqlState == "23505")
                    throw IllegalArgumentException("Użytkownik '$username' już istnieje")
                throw e
            }
        }
    }

    fun listModerators(): List<Map<String, String>> =
        ds.connection.use { conn ->
            conn.prepareStatement(
                "SELECT username FROM users WHERE role = 'MODERATOR' ORDER BY username"
            ).use { st ->
                val rs = st.executeQuery()
                buildList {
                    while (rs.next()) add(mapOf("username" to rs.getString("username")))
                }
            }
        }
}
