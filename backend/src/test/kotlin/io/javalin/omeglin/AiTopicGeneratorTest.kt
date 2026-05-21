package io.javalin.omeglin

import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AiTopicGeneratorTest {

    @Before
    fun resetCache() {
        TopicCache.populate(GeneratedTopics(topics = emptyList(), model = ""))
    }

    // ── TopicCache ────────────────────────────────────────────────────────────

    @Test
    fun `initially not ready`() {
        assertFalse(TopicCache.isReady)
    }

    @Test
    fun `count is 0 when empty`() {
        assertEquals(0, TopicCache.count)
    }

    @Test
    fun `getRandomTopics returns empty list when empty`() {
        assertEquals(emptyList(), TopicCache.getRandomTopics(5))
    }

    @Test
    fun `isReady true after populate`() {
        TopicCache.populate(GeneratedTopics(listOf("a", "b"), "model-x"))
        assertTrue(TopicCache.isReady)
    }

    @Test
    fun `count reflects number of populated topics`() {
        TopicCache.populate(GeneratedTopics(listOf("a", "b", "c"), "model-x"))
        assertEquals(3, TopicCache.count)
    }

    @Test
    fun `lastModel reflects populated model`() {
        TopicCache.populate(GeneratedTopics(listOf("a"), "model-y"))
        assertEquals("model-y", TopicCache.lastModel)
    }

    @Test
    fun `getRandomTopics returns only values from the populated list`() {
        val topics = listOf("Rap", "Hip-hop", "Freestyle", "Beat", "Flow")
        TopicCache.populate(GeneratedTopics(topics, "model-z"))
        repeat(30) {
            val result = TopicCache.getRandomTopics(2)
            result.forEach { assertTrue(it in topics, "Unexpected value: $it") }
        }
    }

    @Test
    fun `getRandomTopics never returns more than requested count`() {
        TopicCache.populate(GeneratedTopics(listOf("a", "b", "c", "d", "e"), "model-z"))
        assertEquals(3, TopicCache.getRandomTopics(3).size)
    }

    @Test
    fun `getRandomTopics caps at available size when count exceeds it`() {
        TopicCache.populate(GeneratedTopics(listOf("a", "b"), "model-z"))
        assertEquals(2, TopicCache.getRandomTopics(10).size)
    }

    @Test
    fun `getRandomTopics returns no duplicates beyond source list size`() {
        val topics = listOf("a", "b", "c")
        TopicCache.populate(GeneratedTopics(topics, "model-z"))
        val result = TopicCache.getRandomTopics(3)
        assertEquals(topics.sorted(), result.sorted())
    }

    // ── FALLBACK_FREE_MODELS ────────────────────────────────────────────────────

    @Test
    fun `fallback models list is not empty`() {
        assertTrue(AiTopicGenerator.FALLBACK_FREE_MODELS.isNotEmpty())
    }

    @Test
    fun `all fallback models end with free suffix`() {
        AiTopicGenerator.FALLBACK_FREE_MODELS.forEach {
            assertTrue(it.endsWith(":free"), "Model '$it' does not end with ':free'")
        }
    }

    @Test
    fun `fallback models have no duplicates`() {
        val models = AiTopicGenerator.FALLBACK_FREE_MODELS
        assertEquals(models.distinct().size, models.size)
    }

    // ── arrayRegex (extracts JSON array from raw model output) ─────────────────

    @Test
    fun `arrayRegex extracts plain json array`() {
        val match = findArray("""["temat 1","temat 2"]""")
        assertEquals("""["temat 1","temat 2"]""", match)
    }

    @Test
    fun `arrayRegex extracts array wrapped in markdown fences`() {
        val match = findArray("```json\n[\"a\",\"b\"]\n```")
        assertEquals("""["a","b"]""", match)
    }

    @Test
    fun `arrayRegex extracts array with surrounding prose`() {
        val match = findArray("Oto tematy: [\"a\",\"b\",\"c\"] mam nadzieję że się spodoba")
        assertEquals("""["a","b","c"]""", match)
    }

    @Test
    fun `arrayRegex returns null when no array present`() {
        assertNull(findArray("brak jakiejkolwiek tablicy tutaj"))
    }

    @Test
    fun `arrayRegex matches empty array`() {
        assertNotNull(findArray("[]"))
    }

    // ── helper: invoke private arrayRegex via reflection ─────────────────────

    private fun findArray(input: String): String? {
        val field = AiTopicGenerator::class.java.getDeclaredField("arrayRegex")
        field.isAccessible = true
        val regex = field.get(AiTopicGenerator) as Regex
        return regex.find(input)?.value
    }
}
