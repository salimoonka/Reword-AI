/**
 * PerformanceMonitor - Monitors and optimizes keyboard performance
 * Ensures spell checking and suggestions stay under 10ms per token
 */

package ai.reword.keyboard.performance

import android.os.Debug
import android.os.SystemClock
import android.util.Log
import android.util.LruCache
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.min

object PerformanceMonitor {
    
    private const val TAG = "RewordPerformance"
    
    // Performance thresholds (in milliseconds)
    object Thresholds {
        const val MAX_SPELL_CHECK_TIME = 10L    // 10ms
        const val MAX_SUGGESTION_TIME = 15L     // 15ms
        const val MAX_KEY_PRESS_TIME = 16L      // 16ms (~60fps)
        const val MAX_API_CALL_TIME = 2000L     // 2 seconds
        const val MAX_CACHE_SIZE = 500          // Max cached items
    }
    
    // Metrics storage
    private val metrics = ConcurrentHashMap<String, MutableList<Long>>()
    private val maxSamplesPerMetric = 100
    
    // Cache tracking
    private val cacheHits = AtomicInteger(0)
    private val cacheMisses = AtomicInteger(0)
    
    // MARK: - Time Measurement
    
    /**
     * Measure execution time of a block (returns result and time in ms)
     */
    inline fun <T> measure(name: String, block: () -> T): Pair<T, Long> {
        val start = SystemClock.elapsedRealtimeNanos()
        val result = block()
        val elapsed = (SystemClock.elapsedRealtimeNanos() - start) / 1_000_000 // Convert to ms
        
        recordMetric(name, elapsed)
        return Pair(result, elapsed)
    }
    
    /**
     * Measure and return only result
     */
    inline fun <T> measureOnly(name: String, block: () -> T): T {
        return measure(name, block).first
    }
    
    /**
     * Check if operation exceeded threshold
     */
    fun checkThreshold(name: String, elapsed: Long, threshold: Long): Boolean {
        if (elapsed > threshold) {
            Log.w(TAG, "⚠️ $name took ${elapsed}ms (threshold: ${threshold}ms)")
            return false
        }
        return true
    }
    
    // MARK: - Specific Measurements
    
    /**
     * Measure spell check performance
     */
    fun <T> measureSpellCheck(word: String, block: () -> T): T {
        val (result, elapsed) = measure("spellCheck", block)
        
        if (elapsed > Thresholds.MAX_SPELL_CHECK_TIME) {
            Log.w(TAG, "⚠️ Spell check for '${word.take(20)}...' took ${elapsed}ms")
        }
        
        return result
    }
    
    /**
     * Measure suggestion generation
     */
    fun <T> measureSuggestions(prefix: String, block: () -> T): T {
        val (result, elapsed) = measure("suggestions", block)
        
        if (elapsed > Thresholds.MAX_SUGGESTION_TIME) {
            Log.w(TAG, "⚠️ Suggestions for '$prefix' took ${elapsed}ms")
        }
        
        return result
    }
    
    /**
     * Measure key press handling
     */
    fun measureKeyPress(block: () -> Unit) {
        val (_, elapsed) = measure("keyPress", block)
        
        // Don't log every time to avoid spam
        if (elapsed > Thresholds.MAX_KEY_PRESS_TIME * 2) {
            Log.w(TAG, "⚠️ Key press took ${elapsed}ms")
        }
    }
    
    // MARK: - Cache Tracking
    
    fun recordCacheHit() {
        cacheHits.incrementAndGet()
    }
    
    fun recordCacheMiss() {
        cacheMisses.incrementAndGet()
    }
    
    val cacheHitRate: Double
        get() {
            val total = cacheHits.get() + cacheMisses.get()
            return if (total > 0) cacheHits.get().toDouble() / total else 0.0
        }
    
    // MARK: - Metrics Recording
    
    fun recordMetric(name: String, timeMs: Long) {
        val list = metrics.getOrPut(name) { mutableListOf() }
        
        synchronized(list) {
            list.add(timeMs)
            
            // Keep only last N samples
            if (list.size > maxSamplesPerMetric) {
                list.removeAt(0)
            }
        }
    }
    
    // MARK: - Statistics
    
    /**
     * Get average time for a metric
     */
    fun averageTime(name: String): Long? {
        val list = metrics[name] ?: return null
        synchronized(list) {
            return if (list.isNotEmpty()) list.sum() / list.size else null
        }
    }
    
    /**
     * Get 95th percentile for a metric
     */
    fun percentile95(name: String): Long? {
        val list = metrics[name] ?: return null
        synchronized(list) {
            if (list.isEmpty()) return null
            val sorted = list.sorted()
            val index = (sorted.size * 0.95).toInt()
            return sorted[min(index, sorted.size - 1)]
        }
    }
    
    /**
     * Get all metrics summary
     */
    fun getMetricsSummary(): Map<String, Map<String, Double>> {
        val summary = mutableMapOf<String, Map<String, Double>>()
        
        for ((name, list) in metrics) {
            synchronized(list) {
                if (list.isEmpty()) return@synchronized
                
                val sorted = list.sorted()
                val avg = list.sum().toDouble() / list.size
                val min = sorted.first().toDouble()
                val max = sorted.last().toDouble()
                val p95Index = (sorted.size * 0.95).toInt()
                val p95 = sorted[min(p95Index, sorted.size - 1)].toDouble()
                
                summary[name] = mapOf(
                    "avg_ms" to avg,
                    "min_ms" to min,
                    "max_ms" to max,
                    "p95_ms" to p95,
                    "samples" to list.size.toDouble()
                )
            }
        }
        
        return summary
    }
    
    // MARK: - Logging
    
    fun logCurrentStats() {
        val summary = getMetricsSummary()
        
        if (summary.isNotEmpty()) {
            Log.d(TAG, "📊 Performance Summary:")
            for ((name, stats) in summary.toSortedMap()) {
                Log.d(TAG, "  $name: avg=${String.format("%.2f", stats["avg_ms"])}ms, " +
                        "p95=${String.format("%.2f", stats["p95_ms"])}ms")
            }
            Log.d(TAG, "  Cache hit rate: ${String.format("%.1f", cacheHitRate * 100)}%")
        }
    }
    
    // MARK: - Memory Monitoring
    
    val memoryUsageBytes: Long
        get() = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()
    
    val memoryUsageMB: Double
        get() = memoryUsageBytes / 1024.0 / 1024.0
    
    val nativeHeapSize: Long
        get() = Debug.getNativeHeapAllocatedSize()
    
    // MARK: - Cleanup
    
    fun clearMetrics() {
        metrics.clear()
        cacheHits.set(0)
        cacheMisses.set(0)
    }
}

/**
 * LRU Cache with performance tracking
 */
class TrackedLruCache<K : Any, V : Any>(maxSize: Int = PerformanceMonitor.Thresholds.MAX_CACHE_SIZE) {
    private val cache = LruCache<K, V>(maxSize)
    
    fun get(key: K): V? {
        val result = cache.get(key)
        if (result != null) {
            PerformanceMonitor.recordCacheHit()
        } else {
            PerformanceMonitor.recordCacheMiss()
        }
        return result
    }
    
    fun put(key: K, value: V): V? {
        return cache.put(key, value)
    }
    
    fun evictAll() {
        cache.evictAll()
    }
}

/**
 * Debouncer for reducing frequent operations
 */
class Debouncer(private val delayMs: Long) {
    private var lastRunnable: Runnable? = null
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    
    fun debounce(action: () -> Unit) {
        lastRunnable?.let { handler.removeCallbacks(it) }
        
        val runnable = Runnable { action() }
        lastRunnable = runnable
        
        handler.postDelayed(runnable, delayMs)
    }
    
    fun cancel() {
        lastRunnable?.let { handler.removeCallbacks(it) }
        lastRunnable = null
    }
}

/**
 * Throttler for rate-limiting operations
 */
class Throttler(private val minimumIntervalMs: Long) {
    private var lastExecutionTime: Long = 0
    
    fun throttle(action: () -> Unit): Boolean {
        val now = SystemClock.elapsedRealtime()
        
        if (now - lastExecutionTime < minimumIntervalMs) {
            return false
        }
        
        lastExecutionTime = now
        action()
        return true
    }
}
