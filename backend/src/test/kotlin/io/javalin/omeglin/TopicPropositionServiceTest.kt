package io.javalin.omeglin

import org.junit.Test
import java.lang.reflect.Method
import java.security.MessageDigest
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class TopicPropositionServiceTest {

    @Test
    fun `MAX_LENGTH is 200`() {
        assertEquals(200, TopicPropositionService.MAX_LENGTH)
    }

    @Test
    fun `sha256 hash has 64 hex characters`() {
        val hash = sha256Hex("test")
        assertEquals(64, hash.length)
    }

    @Test
    fun `sha256 hash contains only hex characters`() {
        val hash = sha256Hex("freestyle rap")
        assertTrue(hash.all { it in '0'..'9' || it in 'a'..'f' },
            "Hash contains non-hex character: $hash")
    }

    @Test
    fun `same input always produces same hash`() {
        val input = "Kraków nocą"
        val hash1 = sha256Hex(input)
        val hash2 = sha256Hex(input)
        assertEquals(hash1, hash2)
    }

    @Test
    fun `different inputs produce different hashes`() {
        assertNotEquals(sha256Hex("topic a"), sha256Hex("topic b"))
    }

    @Test
    fun `hash is deterministic across multiple calls`() {
        val input = "abc"
        val first = sha256Hex(input)
        repeat(5) {
            assertEquals(first, sha256Hex(input), "Call ${it + 1} produced a different hash")
        }
    }

    @Test
    fun `empty string produces a 64-char hash`() {
        assertEquals(64, sha256Hex("").length)
    }

    @Test
    fun `hash is case-sensitive`() {
        assertNotEquals(sha256Hex("Topic"), sha256Hex("topic"))
    }

    // ── helper: invoke private method via reflection ─────────────────────

    private fun sha256Hex(input: String): String {
        val method: Method = TopicPropositionService::class.java
            .getDeclaredMethod("sha256Hex", String::class.java)
        method.isAccessible = true
        return method.invoke(TopicPropositionService, input) as String
    }
}
