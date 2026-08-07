"""Shared rate limiter.

Keyed per client IP and held in process memory, so the budget is per backend
instance rather than global. That is enough to blunt credential stuffing and
runaway clients; it is not a distributed quota.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def client_ip(request: Request) -> str:
    """Best-effort real client IP.

    Render (and any reverse proxy) terminates the connection itself, so
    request.client.host is the proxy for every visitor — keying on it would put
    all users in one shared bucket and let a single abuser lock everyone out.
    The left-most X-Forwarded-For hop is the originating client.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first_hop = forwarded.split(",")[0].strip()
        if first_hop:
            return first_hop
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip)
