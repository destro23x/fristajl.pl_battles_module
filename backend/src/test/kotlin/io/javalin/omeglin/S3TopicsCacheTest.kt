package io.javalin.omeglin

import org.junit.Before
import org.junit.Test
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class S3TopicsCacheTest {

    @Before
    fun resetCache() {
        // Reset the internal AtomicReference via reflection so tests are isolated
        val field = S3TopicsCache::class.java.getDeclaredField("topics")
        field.isAccessible = true
        @Suppress("UNCHECKED_CAST")
        (field.get(S3TopicsCache) as AtomicReference<List<String>>).set(emptyList())
    }

    @Test
    fun `initially not ready`() {
        assertFalse(S3TopicsCache.isReady)
    }

    @Test
    fun `count is 0 when empty`() {
        assertEquals(0, S3TopicsCache.count)
    }

    @Test
    fun `getRandom returns null when empty`() {
        assertNull(S3TopicsCache.getRandom())
    }

    @Test
    fun `isReady true after loading topics`() {
        setTopics(listOf("Rap", "Hip-hop"))
        assertTrue(S3TopicsCache.isReady)
    }

    @Test
    fun `count reflects number of loaded topics`() {
        val topics = listOf("A", "B", "C", "D", "E")
        setTopics(topics)
        assertEquals(5, S3TopicsCache.count)
    }

    @Test
    fun `getRandom returns non-null after topics loaded`() {
        setTopics(listOf("Freestyle"))
        assertNotNull(S3TopicsCache.getRandom())
    }

    @Test
    fun `getRandom returns only values from the loaded list`() {
        val topics = listOf("Rap", "Hip-hop", "Freestyle", "Beat", "Flow")
        setTopics(topics)
        repeat(50) {
            val result = S3TopicsCache.getRandom()
            assertNotNull(result)
            assertTrue(result in topics, "Unexpected value: $result")
        }
    }

    @Test
    fun `single topic is always returned`() {
        setTopics(listOf("Jedyny temat"))
        repeat(10) {
            assertEquals("Jedyny temat", S3TopicsCache.getRandom())
        }
    }

    @Test
    fun `replacing topics updates count`() {
        setTopics(listOf("A", "B", "C"))
        assertEquals(3, S3TopicsCache.count)
        setTopics(listOf("X"))
        assertEquals(1, S3TopicsCache.count)
    }

    @Test
    fun `replacing with empty list makes cache not ready again`() {
        setTopics(listOf("A"))
        assertTrue(S3TopicsCache.isReady)
        setTopics(emptyList())
        assertFalse(S3TopicsCache.isReady)
    }

    // ── helper ──────────────────────────────────────────────────────────────

    private fun setTopics(list: List<String>) {
        val field = S3TopicsCache::class.java.getDeclaredField("topics")
        field.isAccessible = true
        @Suppress("UNCHECKED_CAST")
        (field.get(S3TopicsCache) as AtomicReference<List<String>>).set(list)
    }
}
