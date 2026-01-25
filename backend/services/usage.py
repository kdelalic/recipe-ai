
from typing import Dict
import time

class UsageTracker:
    def __init__(self):
        # Format: {ip: {"count": int, "reset_at": float}}
        # Currently we just track count, but structure allows for time windows
        self._usage: Dict[str, Dict] = {}
        
    def get_usage(self, ip: str) -> int:
        return self._usage.get(ip, {}).get("count", 0)

    def increment_usage(self, ip: str) -> int:
        if ip not in self._usage:
            self._usage[ip] = {"count": 0}
        
        self._usage[ip]["count"] += 1
        return self._usage[ip]["count"]
    
    def check_limit(self, ip: str, limit: int) -> bool:
        """Returns True if user is WITHIN limit, False if exceeded."""
        usage = self.get_usage(ip)
        return usage < limit

# Singleton instance
usage_tracker = UsageTracker()
