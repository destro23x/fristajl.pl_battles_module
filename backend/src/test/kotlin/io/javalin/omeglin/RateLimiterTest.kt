package io.javalin.omeglin

import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RateLimiterTest {

    // Use a unique key per test so shared object state doesn't bleed between tests
    private fun key(suffix: String) = "test-${suffix}-${Thread.currentThread().id}-${System.nanoTime()}"

    @Test
    fun `first request is allowed`() {
        assertTrue(RateLimiter.tryAcquire(key("first")))
    }

    @Test
    fun `requests up to limit are all allowed`() {
        val k = key("up-to-limit")
        repeat(RateLimiter.LIMIT) { i ->
            assertTrue(RateLimiter.tryAcquire(k), "Request ${i + 1} should be allowed")
        }
    }

    @Test
    fun `request over limit is rejected`() {
        val k = key("over-limit")
        repeat(RateLimiter.LIMIT) { RateLimiter.tryAcquire(k) }
        assertFalse(RateLimiter.tryAcquire(k), "Request ${RateLimiter.LIMIT + 1} should be rejected")
    }

    @Test
    fun `different IP keys are independent`() {
        val k1 = key("ip-a")
        val k2 = key("ip-b")
        repeat(RateLimiter.LIMIT) { RateLimiter.tryAcquire(k1) }
        // k1 is exhausted — k2 must still be allowed
        assertTrue(RateLimiter.tryAcquire(k2))
        // k1 must still be blocked
        assertFalse(RateLimiter.tryAcquire(k1))
    }

    @Test
    fun `cleanup does not throw on empty state`() {
        RateLimiter.cleanup()
    }

    @Test
    fun `cleanup does not throw with active entries`() {
        val k = key("cleanup-active")
        RateLimiter.tryAcquire(k)
        RateLimiter.cleanup()
    }

    @Test
    fun `LIMIT constant is 60`() {
        assertEquals(60, RateLimiter.LIMIT)
    }

    @Test
    fun `concurrent requests respect the limit`() {
        val k = key("concurrent")
        val threads = 20
        val requestsPerThread = (RateLimiter.LIMIT / threads) + 2  // intentionally over-limit total
        val totalRequests = threads * requestsPerThread

        val pool = Executors.newFixedThreadPool(threads)
        val latch = CountDownLatch(threads)
        val allowed = AtomicInteger(0)
        val rejected = AtomicInteger(0)

        repeat(threads) {
            pool.submit {
                latch.countDown()
                latch.await()  // all threads fire simultaneously
                repeat(requestsPerThread) {
                    if (RateLimiter.tryAcquire(k)) allowed.incrementAndGet()
                    else rejected.incrementAndGet()
                }
            }
        }
        pool.shutdown()
        pool.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)

        assertEquals(totalRequests, allowed.get() + rejected.get(), "All requests accounted for")
        assertEquals(RateLimiter.LIMIT, allowed.get(), "Exactly LIMIT requests should succeed")
    }

    @Test
    fun `concurrent independent keys don't interfere`() {
        val threads = 10
        val pool = Executors.newFixedThreadPool(threads)
        val failures = AtomicInteger(0)

        val futures = (1..threads).map { t ->
            pool.submit<Unit> {
                val k = key("parallel-$t")
                // Each key should be able to take its first request
                if (!RateLimiter.tryAcquire(k)) failures.incrementAndGet()
            }
        }
        futures.forEach { it.get() }
        pool.shutdown()

        assertEquals(0, failures.get(), "Each independent key should have at least one allowed request")
    }
}
