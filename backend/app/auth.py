from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .db import one

_bearer = HTTPBearer(auto_error=False)
_jwks_client: jwt.PyJWKClient | None = None


def _jwks() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(get_settings().jwks_url, cache_keys=True)
    return _jwks_client


def warm_up() -> None:
    """Fetches and caches the signing keys once, at startup -- so the first
    real request doesn't pay for a cold JWKS fetch (seen locally as a
    transient 401 on the very first call right after a restart).
    """
    _jwks().get_jwk_set()


class CurrentUser:
    """The signed-in user's profile row, camelCase-aliased to match types.ts User."""

    def __init__(self, row: dict):
        self.id: str = row["id"]
        self.role: str = row["role"]
        self.row = row


def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentUser:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in again.")
    try:
        key = _jwks().get_signing_key_from_jwt(creds.credentials).key
        # leeway: a server clock even a second behind Supabase's would otherwise reject
        # every freshly issued token as "not yet valid" (iat in the future) right at sign-in.
        payload = jwt.decode(creds.credentials, key, algorithms=["RS256", "ES256"], audience="authenticated", leeway=30)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in again.")

    row = one(
        """select id, name, email, phone, role, simple_mode as "simpleMode", suburb
           from profiles where id = %(id)s""",
        {"id": payload["sub"]},
    )
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in again.")
    return CurrentUser(row)


def require_admin(user: Annotated[CurrentUser, Depends(current_user)]) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You don’t have access to that.")
    return user
