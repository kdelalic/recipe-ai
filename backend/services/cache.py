from cachetools import TTLCache

# Cache for tokens (1 hour TTL)
token_cache = TTLCache(maxsize=1000, ttl=3600)

# Cache for recipe data (5 minutes TTL)
recipe_cache = TTLCache(maxsize=100, ttl=300)
