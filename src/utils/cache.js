import Redis from 'ioredis';

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: false, // Connect immediately
  keepAlive: 30000,
  connectTimeout: 5000, // Faster timeout
  commandTimeout: 3000, // Faster command timeout
  maxLoadingTimeout: 3000, // Faster loading timeout
  enableOfflineQueue: false, // Don't queue commands when disconnected
});

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('🚀 Redis ready for commands');
  // Test Redis performance on startup
  testRedisPerformance();
});

redis.on('error', err => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Test Redis performance
async function testRedisPerformance() {
  try {
    const start = Date.now();
    await redis.ping();
    const responseTime = Date.now() - start;

    if (responseTime < 100) {
      console.log(`⚡ Redis ping: ${responseTime}ms (Excellent)`);
    } else if (responseTime < 500) {
      console.log(`✅ Redis ping: ${responseTime}ms (Good)`);
    } else {
      console.log(`⚠️ Redis ping: ${responseTime}ms (Slow - check connection)`);
    }
  } catch (error) {
    console.error('❌ Redis ping failed:', error.message);
  }
}

// Cache middleware for yacht listings
export const cacheYachtList = async (req, res, next) => {
  const requestStart = Date.now();
  const { page = 1, limit = 10, status } = req.query;
  const cacheKey = `yachts:${page}:${limit}:${status || 'all'}`;

  try {
    // Fast Redis check with very short timeout
    const cacheStart = Date.now();
    const cachedData = await Promise.race([
      redis.get(cacheKey),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 800) // Slightly higher timeout to reduce false negatives
      ),
    ]);
    const cacheTime = Date.now() - cacheStart;

    if (cachedData) {
      const totalTime = Date.now() - requestStart;
      console.log(
        `⚡ Cache HIT for yacht list | Cache: ${cacheTime}ms | Total: ${totalTime}ms | Key: ${cacheKey}`
      );
      return res.json(JSON.parse(cachedData));
    }

    // Cache miss - will query database
    console.log(
      `🔄 Cache MISS for yacht list | Cache check: ${cacheTime}ms | Key: ${cacheKey}`
    );

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache response and log timing
    res.json = function (data) {
      const dbQueryTime = Date.now() - requestStart;

      // Inspect payload structure from SuccessHandler for yacht list
      // Expecting: { success: true, statusCode, message, data: { yachts: [], total, ... } }
      const yachtsLength = Array.isArray(data?.data?.yachts)
        ? data.data.yachts.length
        : undefined;
      const totalItems =
        typeof data?.data?.total === 'number' ? data.data.total : undefined;

      if (typeof yachtsLength === 'number') {
        console.log(
          `📦 Yacht list payload | yachts.length=${yachtsLength}${typeof totalItems === 'number' ? `, total=${totalItems}` : ''}`
        );
      }

      // Avoid caching empty list responses to prevent stale "no yachts found"
      if (typeof yachtsLength === 'number' && yachtsLength === 0) {
        console.log('🛑 Not caching empty yacht list response');
        return originalSend.call(this, data);
      }

      // Cache for 10 minutes for yacht lists (longer cache = better performance)
      // Published yachts don't change frequently
      const cacheTTL = status === 'published' ? 600 : 300; // 10 min for published, 5 min for drafts/all
      redis
        .setex(cacheKey, cacheTTL, JSON.stringify(data))
        .then(() => {
          const cacheWriteTime = Date.now() - requestStart;
          console.log(
            `💾 Cached yacht list data | DB Query: ${dbQueryTime}ms | Cache Write: ${cacheWriteTime}ms | Total: ${cacheWriteTime}ms`
          );
        })
        .catch(err => console.error('Cache write error:', err.message));

      return originalSend.call(this, data);
    };

    next();
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.log(
      `⚠️ Redis cache failed, using database directly | Time: ${totalTime}ms | Error: ${error.message}`
    );
    next(); // Continue without cache if Redis fails
  }
};

// Cache middleware for individual yacht
export const cacheYachtById = async (req, res, next) => {
  const requestStart = Date.now();
  const { id } = req.query;
  const cacheKey = `yacht:${id}`;

  try {
    // Try to get from cache first
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    const cacheTime = Date.now() - cacheStart;

    if (cachedData) {
      const totalTime = Date.now() - requestStart;
      console.log(
        `⚡ Cache HIT for yacht by ID | Cache: ${cacheTime}ms | Total: ${totalTime}ms | ID: ${id}`
      );
      return res.json(JSON.parse(cachedData));
    }

    // Cache miss - will query database
    console.log(
      `🔄 Cache MISS for yacht by ID | Cache check: ${cacheTime}ms | ID: ${id}`
    );

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache response and log timing
    res.json = function (data) {
      const dbQueryTime = Date.now() - requestStart;

      // Cache for 10 minutes (longer for individual yachts)
      redis
        .setex(cacheKey, 600, JSON.stringify(data))
        .then(() => {
          const cacheWriteTime = Date.now() - requestStart;
          console.log(
            `💾 Cached yacht by ID data | DB Query: ${dbQueryTime}ms | Cache Write: ${cacheWriteTime}ms | Total: ${cacheWriteTime}ms | ID: ${id}`
          );
        })
        .catch(err => console.error('Cache write error:', err.message));

      return originalSend.call(this, data);
    };

    next();
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.log(
      `⚠️ Redis cache failed for yacht by ID | Time: ${totalTime}ms | Error: ${error.message} | ID: ${id}`
    );
    next(); // Continue without cache if Redis fails
  }
};

// Cache middleware for individual yacht by slug
export const cacheYachtBySlug = async (req, res, next) => {
  const requestStart = Date.now();
  const { slug } = req.query;
  const cacheKey = `yachtSlug:${slug}`;

  try {
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    const cacheTime = Date.now() - cacheStart;

    if (cachedData) {
      const totalTime = Date.now() - requestStart;
      console.log(
        `⚡ Cache HIT for yacht by slug | Cache: ${cacheTime}ms | Total: ${totalTime}ms | Slug: ${slug}`
      );
      return res.json(JSON.parse(cachedData));
    }

    console.log(
      `🔄 Cache MISS for yacht by slug | Cache check: ${cacheTime}ms | Slug: ${slug}`
    );
    const originalSend = res.json;
    res.json = function (data) {
      const dbQueryTime = Date.now() - requestStart;
      redis
        .setex(cacheKey, 600, JSON.stringify(data))
        .then(() => {
          const cacheWriteTime = Date.now() - requestStart;
          console.log(
            `💾 Cached yacht by slug data | DB Query: ${dbQueryTime}ms | Cache Write: ${cacheWriteTime}ms | Total: ${cacheWriteTime}ms | Slug: ${slug}`
          );
        })
        .catch(err => console.error('Cache write error:', err.message));
      return originalSend.call(this, data);
    };
    next();
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.log(
      `⚠️ Redis cache failed for yacht by slug | Time: ${totalTime}ms | Error: ${error.message} | Slug: ${slug}`
    );
    next();
  }
};

// Cache middleware for blog listings
export const cacheBlogList = async (req, res, next) => {
  const requestStart = Date.now();
  const { page = 1, limit = 10, status } = req.query;
  const cacheKey = `blogs:${page}:${limit}:${status || 'all'}`;

  try {
    // Try to get from cache first
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    const cacheTime = Date.now() - cacheStart;

    if (cachedData) {
      const totalTime = Date.now() - requestStart;
      console.log(
        `⚡ Cache HIT for blog list | Cache: ${cacheTime}ms | Total: ${totalTime}ms | Key: ${cacheKey}`
      );
      return res.json(JSON.parse(cachedData));
    }

    // Cache miss - will query database
    console.log(
      `🔄 Cache MISS for blog list | Cache check: ${cacheTime}ms | Key: ${cacheKey}`
    );

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache response and log timing
    res.json = function (data) {
      const dbQueryTime = Date.now() - requestStart;

      // Cache for 5 minutes
      redis
        .setex(cacheKey, 300, JSON.stringify(data))
        .then(() => {
          const cacheWriteTime = Date.now() - requestStart;
          console.log(
            `💾 Cached blog list data | DB Query: ${dbQueryTime}ms | Cache Write: ${cacheWriteTime}ms | Total: ${cacheWriteTime}ms`
          );
        })
        .catch(err => console.error('Cache write error:', err.message));

      return originalSend.call(this, data);
    };

    next();
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.log(
      `⚠️ Redis cache failed for blog list | Time: ${totalTime}ms | Error: ${error.message}`
    );
    next(); // Continue without cache if Redis fails
  }
};

// Cache middleware for individual blog
export const cacheBlogById = async (req, res, next) => {
  const requestStart = Date.now();
  const { id } = req.query;
  const cacheKey = `blog:${id}`;

  try {
    // Try to get from cache first
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    const cacheTime = Date.now() - cacheStart;

    if (cachedData) {
      const totalTime = Date.now() - requestStart;
      console.log(
        `⚡ Cache HIT for blog by ID | Cache: ${cacheTime}ms | Total: ${totalTime}ms | ID: ${id}`
      );
      return res.json(JSON.parse(cachedData));
    }

    // Cache miss - will query database
    console.log(
      `🔄 Cache MISS for blog by ID | Cache check: ${cacheTime}ms | ID: ${id}`
    );

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache response and log timing
    res.json = function (data) {
      const dbQueryTime = Date.now() - requestStart;

      // Cache for 10 minutes (longer for individual blogs)
      redis
        .setex(cacheKey, 600, JSON.stringify(data))
        .then(() => {
          const cacheWriteTime = Date.now() - requestStart;
          console.log(
            `💾 Cached blog by ID data | DB Query: ${dbQueryTime}ms | Cache Write: ${cacheWriteTime}ms | Total: ${cacheWriteTime}ms | ID: ${id}`
          );
        })
        .catch(err => console.error('Cache write error:', err.message));

      return originalSend.call(this, data);
    };

    next();
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.log(
      `⚠️ Redis cache failed for blog by ID | Error: ${error.message} | ID: ${id}`
    );
    next(); // Continue without cache if Redis fails
  }
};

// Cache middleware for individual blog by slug
export const cacheBlogBySlug = async (req, res, next) => {
  const requestStart = Date.now();
  const { slug } = req.query;
  const cacheKey = `blogSlug:${slug}`;

  try {
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    const cacheTime = Date.now() - cacheStart;

    if (cachedData) {
      const totalTime = Date.now() - requestStart;
      console.log(
        `⚡ Cache HIT for blog by slug | Cache: ${cacheTime}ms | Total: ${totalTime}ms | Slug: ${slug}`
      );
      return res.json(JSON.parse(cachedData));
    }

    console.log(
      `🔄 Cache MISS for blog by slug | Cache check: ${cacheTime}ms | Slug: ${slug}`
    );
    const originalSend = res.json;
    res.json = function (data) {
      const dbQueryTime = Date.now() - requestStart;
      redis
        .setex(cacheKey, 600, JSON.stringify(data))
        .then(() => {
          const cacheWriteTime = Date.now() - requestStart;
          console.log(
            `💾 Cached blog by slug data | DB Query: ${dbQueryTime}ms | Cache Write: ${cacheWriteTime}ms | Total: ${cacheWriteTime}ms | Slug: ${slug}`
          );
        })
        .catch(err => console.error('Cache write error:', err.message));
      return originalSend.call(this, data);
    };
    next();
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.log(
      `⚠️ Redis cache failed for blog by slug | Error: ${error.message} | Slug: ${slug}`
    );
    next();
  }
};

// Clear cache when yacht data changes
export const clearYachtCache = async (force = false) => {
  try {
    // Get all yacht-related cache keys with pattern matching
    const patterns = ['yachts:*', 'yacht:*', 'yachtSlug:*'];
    const allKeys = [];
    
    for (const pattern of patterns) {
      try {
        const keys = await redis.keys(pattern);
        allKeys.push(...keys);
      } catch (patternError) {
        console.warn(`⚠️ Error getting keys for pattern ${pattern}:`, patternError.message);
      }
    }
    
    // Remove duplicates
    const uniqueKeys = [...new Set(allKeys)];
    
    if (uniqueKeys.length > 0) {
      // Delete in batches to avoid memory issues
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < uniqueKeys.length; i += batchSize) {
        const batch = uniqueKeys.slice(i, i + batchSize);
        try {
          const result = await redis.del(...batch);
          deletedCount += result || 0;
        } catch (batchError) {
          console.warn(`⚠️ Error deleting batch ${i}-${i + batch.length}:`, batchError.message);
        }
      }
      
      console.log(`🗑️ Cleared ${deletedCount}/${uniqueKeys.length} yacht cache keys`);
      
      // If force mode, also try to flush all yacht-related keys one more time
      if (force && deletedCount < uniqueKeys.length) {
        console.log('🔄 Force mode: Attempting to clear remaining keys...');
        const remainingKeys = uniqueKeys.filter((_, idx) => {
          const batchIdx = Math.floor(idx / batchSize);
          return batchIdx >= Math.floor(deletedCount / batchSize);
        });
        if (remainingKeys.length > 0) {
          await redis.del(...remainingKeys);
          console.log(`🗑️ Force cleared additional ${remainingKeys.length} keys`);
        }
      }
    } else {
      console.log('🗑️ No yacht cache keys found to clear');
    }
  } catch (error) {
    console.error('❌ Error clearing yacht cache:', error);
    // Try to continue even if cache clear fails
    throw error; // Re-throw so caller knows it failed
  }
};

// Clear cache when blog data changes
export const clearBlogCache = async (force = false) => {
  try {
    // Get all blog-related cache keys with pattern matching
    const patterns = ['blogs:*', 'blog:*', 'blogSlug:*'];
    const allKeys = [];
    
    for (const pattern of patterns) {
      try {
        const keys = await redis.keys(pattern);
        allKeys.push(...keys);
      } catch (patternError) {
        console.warn(`⚠️ Error getting keys for pattern ${pattern}:`, patternError.message);
      }
    }
    
    // Remove duplicates
    const uniqueKeys = [...new Set(allKeys)];
    
    if (uniqueKeys.length > 0) {
      // Delete in batches to avoid memory issues
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < uniqueKeys.length; i += batchSize) {
        const batch = uniqueKeys.slice(i, i + batchSize);
        try {
          const result = await redis.del(...batch);
          deletedCount += result || 0;
        } catch (batchError) {
          console.warn(`⚠️ Error deleting batch ${i}-${i + batch.length}:`, batchError.message);
        }
      }
      
      console.log(`🗑️ Cleared ${deletedCount}/${uniqueKeys.length} blog cache keys`);
      
      // If force mode, also try to flush all blog-related keys one more time
      if (force && deletedCount < uniqueKeys.length) {
        console.log('🔄 Force mode: Attempting to clear remaining keys...');
        const remainingKeys = uniqueKeys.filter((_, idx) => {
          const batchIdx = Math.floor(idx / batchSize);
          return batchIdx >= Math.floor(deletedCount / batchSize);
        });
        if (remainingKeys.length > 0) {
          await redis.del(...remainingKeys);
          console.log(`🗑️ Force cleared additional ${remainingKeys.length} keys`);
        }
      }
    } else {
      console.log('🗑️ No blog cache keys found to clear');
    }
  } catch (error) {
    console.error('❌ Error clearing blog cache:', error);
    // Try to continue even if cache clear fails
    throw error; // Re-throw so caller knows it failed
  }
};

// General request timing middleware
export const requestTimer = (req, res, next) => {
  const start = Date.now();

  // Override res.json to capture timing
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Color-coded timing based on performance
    let timingColor = '';
    if (duration < 100) {
      timingColor = '⚡'; // Excellent
    } else if (duration < 500) {
      timingColor = '✅'; // Good
    } else if (duration < 1000) {
      timingColor = '⚠️'; // Slow
    } else {
      timingColor = '🐌'; // Very slow
    }

    console.log(`${timingColor} ${method} ${url} | Total: ${duration}ms`);

    return originalJson.call(this, data);
  };

  next();
};

export default redis;
