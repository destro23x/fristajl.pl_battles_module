package io.javalin.omeglin

import java.util.concurrent.ConcurrentHashMap

/**
 * Sliding-window rate limiter keyed by a string (e.g. client IP).
 * Thread-safe; no external dependencies.
 */
object RateLimiter {

    private const val WINDOW_MS = 60L * 60 * 1000  // 1 hour
    const val LIMIT = 60

    private val windows = ConcurrentHashMap<String, ArrayDeque<Long>>()

    /**
     * Returns true if the request is allowed, false if the limit is exceeded.
     */
    fun tryAcquire(key: String): Boolean {
        val now = System.currentTimeMillis()
        val timestamps = windows.computeIfAbsent(key) { ArrayDeque() }
        synchronized(timestamps) {
            while (timestamps.isNotEmpty() && now - timestamps.first() > WINDOW_MS) {
                timestamps.removeFirst()
            }
            if (timestamps.size >= LIMIT) return false
            timestamps.addLast(now)
            return true
        }
    }

    /** Remove stale entries — call periodically to avoid unbounded memory growth. */
    fun cleanup() {
        val cutoff = System.currentTimeMillis() - WINDOW_MS
        windows.entries.removeIf { (_, ts) ->
            synchronized(ts) { ts.isEmpty() || ts.last() < cutoff }
        }
    }
}
