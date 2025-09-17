import os, json, hashlib
import redis

_redis = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

def _key(namespace: str, payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    return f"{namespace}:{h}"

def cache_get(namespace: str, payload: dict):
    k = _key(namespace, payload)
    val = _redis.get(k)
    if val is None:
        return None
    return json.loads(val) if val else None

def cache_set(namespace: str, payload: dict, value, ttl=300):
    k = _key(namespace, payload)
    _redis.setex(k, ttl, json.dumps(value, ensure_ascii=False))
