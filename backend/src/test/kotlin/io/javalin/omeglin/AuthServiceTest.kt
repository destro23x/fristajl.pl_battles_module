package io.javalin.omeglin

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class AuthServiceTest {

    private val secret = "test-secret-key-for-unit-tests"

    @Before
    fun setup() {
        AuthService.init(secret)
    }

    @Test
    fun `generateToken returns non-empty JWT`() {
        val user = User("admin@test.pl", "hash", Role.ADMIN)
        val token = AuthService.generateToken(user)
        assertNotNull(token)
        assertTrue(token.isNotEmpty())
    }

    @Test
    fun `generated token has three parts (header dot payload dot signature)`() {
        val user = User("admin@test.pl", "hash", Role.ADMIN)
        val token = AuthService.generateToken(user)
        assertEquals(3, token.split(".").size)
    }

    @Test
    fun `admin token contains correct subject and role`() {
        val user = User("admin@test.pl", "hash", Role.ADMIN)
        val token = AuthService.generateToken(user)
        val decoded = JWT.require(Algorithm.HMAC256(secret)).build().verify(token)
        assertEquals("admin@test.pl", decoded.subject)
        assertEquals("admin", decoded.getClaim("role").asString())
    }

    @Test
    fun `moderator token contains role moderator`() {
        val user = User("mod@test.pl", "hash", Role.MODERATOR)
        val token = AuthService.generateToken(user)
        val decoded = JWT.require(Algorithm.HMAC256(secret)).build().verify(token)
        assertEquals("moderator", decoded.getClaim("role").asString())
    }

    @Test
    fun `token has expiry set in the future`() {
        val user = User("admin@test.pl", "hash", Role.ADMIN)
        val token = AuthService.generateToken(user)
        val decoded = JWT.require(Algorithm.HMAC256(secret)).build().verify(token)
        assertNotNull(decoded.expiresAt)
        assertTrue(decoded.expiresAt.time > System.currentTimeMillis())
    }

    @Test
    fun `token signed with wrong secret fails verification`() {
        val user = User("admin@test.pl", "hash", Role.ADMIN)
        val token = AuthService.generateToken(user)
        var threw = false
        try {
            JWT.require(Algorithm.HMAC256("wrong-secret")).build().verify(token)
        } catch (_: Exception) {
            threw = true
        }
        assertTrue(threw)
    }

    @Test
    fun `garbled token fails verification`() {
        var threw = false
        try {
            JWT.require(Algorithm.HMAC256(secret)).build().verify("not.a.jwt")
        } catch (_: Exception) {
            threw = true
        }
        assertTrue(threw)
    }
}
