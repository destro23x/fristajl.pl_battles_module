package io.javalin.omeglin

import org.mindrot.jbcrypt.BCrypt
import java.sql.DriverManager

/**
 * One-off entrypoint for the db-seed ECS task (invoked via seed.sh) -
 * creates/updates the admin dashboard account from ADMIN_USERNAME/
 * ADMIN_PASSWORD. Never called by the running backend service; this is the
 * sole place the admin account is created or its password rotated.
 */
fun main() {
    val creds = DbConnection.resolveFromEnv()
    val adminUsername = System.getenv("ADMIN_USERNAME") ?: "admin"
    val adminPassword = System.getenv("ADMIN_PASSWORD") ?: error("ADMIN_PASSWORD must be set")
    val hash = BCrypt.hashpw(adminPassword, BCrypt.gensalt())

    DriverManager.getConnection(creds.jdbcUrl, creds.user, creds.password).use { conn ->
        conn.prepareStatement(
            """
            INSERT INTO users (username, password_hash, role)
            VALUES (?, ?, 'ADMIN')
            ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
            """.trimIndent()
        ).use { st ->
            st.setString(1, adminUsername)
            st.setString(2, hash)
            st.executeUpdate()
        }
    }

    println("Seed: admin '$adminUsername' zainicjowany/zsynchronizowany")
}
