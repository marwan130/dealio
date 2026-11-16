namespace Dealio.Infrastructure.Caching;

using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using Dealio.Application.Interfaces.Services;

public class RedisCacheService : ICacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(IConnectionMultiplexer redis, ILogger<RedisCacheService> logger)
    {
        _redis = redis;
        _database = redis.GetDatabase();
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var value = await _database.StringGetAsync(key);
            if (value.IsNullOrEmpty) return default;
            return JsonSerializer.Deserialize<T>(value.ToString());
        }
        catch (RedisException ex)
        {
            // A cache miss on failure is fine, but a dead Redis has to be
            // visible. Every call logs one warning while it lasts.
            _logger.LogWarning(ex, "Redis get failed for key {Key}, serving the caller as a cache miss", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var serialized = JsonSerializer.Serialize(value);
            if (expiry.HasValue)
                await _database.StringSetAsync(key, serialized, expiry.Value);
            else
                await _database.StringSetAsync(key, serialized);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis set failed for key {Key}, the entry stays uncached", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _database.KeyDeleteAsync(key);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis delete failed for key {Key}, the stale entry survives until it expires", key);
        }
    }

    public async Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.KeysAsync(pattern: $"{prefix}*");

            var batch = new List<RedisKey>();
            await foreach (var key in keys)
                batch.Add(key);

            if (batch.Count > 0)
                await _database.KeyDeleteAsync([.. batch]);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis bulk delete failed for prefix {Prefix}, stale entries survive until they expire", prefix);
        }
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _database.KeyExistsAsync(key);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis existence check failed for key {Key}, reporting the key as missing", key);
            return false;
        }
    }
}