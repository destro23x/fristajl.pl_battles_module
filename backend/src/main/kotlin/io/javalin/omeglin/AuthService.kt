package io.javalin.omeglin

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.javalin.http.Context
import org.mindrot.jbcrypt.BCrypt
import java.util.Date

object AuthService {

    private lateinit var algorithm: Algorithm

    fun init(secret: String) {
        algorithm = Algorithm.HMAC256(secret)
    }

    fun login(username: String, password: String): String? {
        val user = UserStore.findByUsername(username) ?: return null
        if (!BCrypt.checkpw(password, user.passwordHash)) return null
        return generateToken(user)
    }

    fun generateToken(user: User): String =
        JWT.create()
            .withSubject(user.username)
            .withClaim("role", user.role.name.lowercase())
            .withExpiresAt(Date(System.currentTimeMillis() + 8 * 60 * 60 * 1000L)) // 8 h
            .sign(algorithm)

    /**
     * Validates the Bearer token. If valid (and role matches), stores "username" and "role"
     * as context attributes and returns true. Otherwise writes an error response and returns false.
     * Pass no roles to accept any authenticated user.
     */
    fun requireAuth(ctx: Context, vararg roles: String): Boolean {
        val auth = ctx.header("Authorization")
        if (auth == null || !auth.startsWith("Bearer ")) {
            ctx.status(401).json(mapOf("error" to "Wymagane logowanie"))
            return false
        }
        val decoded = try {
            JWT.require(algorithm).build().verify(auth.removePrefix("Bearer ").trim())
        } catch (e: Exception) {
            ctx.status(401).json(mapOf("error" to "Nieprawidłowy lub wygasły token"))
            return false
        }
        val role = decoded.getClaim("role").asString()
        if (roles.isNotEmpty() && role !in roles) {
            ctx.status(403).json(mapOf("error" to "Brak uprawnień"))
            return false
        }
        ctx.attribute("username", decoded.subject)
        ctx.attribute("role", role)
        return true
    }
}
