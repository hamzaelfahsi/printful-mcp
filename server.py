import os
import base64
import hashlib
import json
import secrets
from typing import Any
from urllib.parse import parse_qs, urlencode

import httpx
from fastmcp import FastMCP
from redis.asyncio import Redis
from starlette.applications import Starlette
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, RedirectResponse
from starlette.routing import Mount, Route

mcp = FastMCP("Printify Manager")
PRINTIFY_BASE_URL = "https://api.printify.com/v1"
MCP_BASE_URL = os.environ.get("MCP_BASE_URL", "https://printful-mcp-hyfr.onrender.com").rstrip("/")


def _printify_headers() -> dict[str, str]:
    token = os.environ.get("PRINTIFY_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError("PRINTIFY_API_TOKEN is not configured on the server.")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
    }


async def _printify_request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    body: Any = None,
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.request(
            method,
            PRINTIFY_BASE_URL + path,
            headers=_printify_headers(),
            params=params,
            json=body,
        )
    if response.is_error:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text[:2000]
        raise RuntimeError(f"Printify API {response.status_code}: {detail}")
    if response.status_code == 204:
        return {"ok": True}
    try:
        return response.json()
    except ValueError:
        return {"ok": True, "status_code": response.status_code, "text": response.text}


@mcp.tool()
async def printify_test_connection() -> dict[str, Any]:
    data = await _printify_request("GET", "/shops.json")
    return {"ok": True, "service": "Printify", "shops": data}


@mcp.tool()
async def printify_list_shops() -> dict[str, Any]:
    return await _printify_request("GET", "/shops.json")


@mcp.tool()
async def printify_get_shop(shop_id: int | str) -> dict[str, Any]:
    return await _printify_request("GET", f"/shops/{shop_id}.json")


@mcp.tool()
async def printify_list_products(shop_id: int | str, page: int = 1, limit: int = 50) -> dict[str, Any]:
    return await _printify_request(
        "GET", f"/shops/{shop_id}/products.json",
        params={"page": max(1, page), "limit": min(max(1, limit), 50)},
    )


@mcp.tool()
async def printify_get_product(shop_id: int | str, product_id: str) -> dict[str, Any]:
    return await _printify_request("GET", f"/shops/{shop_id}/products/{product_id}.json")


@mcp.tool()
async def printify_list_blueprints(page: int = 1, limit: int = 50) -> dict[str, Any]:
    return await _printify_request(
        "GET", "/catalog/blueprints.json",
        params={"page": max(1, page), "limit": min(max(1, limit), 50)},
    )


@mcp.tool()
async def printify_get_blueprint(blueprint_id: int | str) -> dict[str, Any]:
    return await _printify_request("GET", f"/catalog/blueprints/{blueprint_id}.json")


@mcp.tool()
async def printify_list_print_providers(blueprint_id: int | str) -> dict[str, Any]:
    return await _printify_request("GET", f"/catalog/blueprints/{blueprint_id}/print_providers.json")


@mcp.tool()
async def printify_list_variants(blueprint_id: int | str, print_provider_id: int | str) -> dict[str, Any]:
    return await _printify_request(
        "GET",
        f"/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/variants.json",
    )


@mcp.tool()
async def printify_list_uploads(page: int = 1, limit: int = 50) -> dict[str, Any]:
    return await _printify_request(
        "GET", "/uploads.json",
        params={"page": max(1, page), "limit": min(max(1, limit), 50)},
    )


@mcp.tool()
async def printify_upload_image_url(url: str, file_name: str = "design.png") -> dict[str, Any]:
    if not url.startswith(("http://", "https://")):
        raise ValueError("url must be an http(s) URL.")
    return await _printify_request(
        "POST", "/uploads/images.json",
        body={"file_name": file_name, "url": url},
    )


@mcp.tool()
async def printify_upload_image_base64(file_name: str, contents: str) -> dict[str, Any]:
    return await _printify_request(
        "POST", "/uploads/images.json",
        body={"file_name": file_name, "contents": contents},
    )


@mcp.tool()
async def printify_create_product(
    shop_id: int | str,
    title: str,
    description: str,
    blueprint_id: int,
    print_provider_id: int,
    variants: list[dict[str, Any]],
    print_areas: list[dict[str, Any]],
    tags: list[str] | None = None,
    visible: bool = True,
) -> dict[str, Any]:
    if not variants:
        raise ValueError("At least one variant is required.")
    if not print_areas:
        raise ValueError("At least one print area is required.")
    body = {
        "title": title,
        "description": description,
        "blueprint_id": blueprint_id,
        "print_provider_id": print_provider_id,
        "variants": variants,
        "print_areas": print_areas,
        "visible": visible,
    }
    if tags is not None:
        body["tags"] = tags
    return await _printify_request("POST", f"/shops/{shop_id}/products.json", body=body)


@mcp.tool()
async def printify_create_test_product(
    shop_id: int | str,
    blueprint_id: int,
    print_provider_id: int,
    image_id: str,
    title: str = "TEST - Printify MCP",
    price: int = 1999,
) -> dict[str, Any]:
    variant_data = await printify_list_variants(blueprint_id, print_provider_id)
    variants = variant_data.get("data") or variant_data.get("variants") or []
    available = [v for v in variants if v.get("is_available", True)]
    if not available:
        raise RuntimeError("No available Printify variant was returned.")
    selected = available[0]
    variant_id = int(selected["id"])
    return await printify_create_product(
        shop_id=shop_id,
        title=title,
        description="Temporary product created to verify Printify Manager end-to-end.",
        blueprint_id=blueprint_id,
        print_provider_id=print_provider_id,
        variants=[{"id": variant_id, "price": price, "is_enabled": True}],
        print_areas=[{
            "variant_ids": [variant_id],
            "placeholders": [{
                "position": "front",
                "images": [{"id": image_id, "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}],
            }],
        }],
        tags=["test", "printify", "mcp"],
        visible=True,
    )


@mcp.tool()
async def printify_update_product(shop_id: int | str, product_id: str, product: dict[str, Any]) -> dict[str, Any]:
    return await _printify_request("PUT", f"/shops/{shop_id}/products/{product_id}.json", body=product)


@mcp.tool()
async def printify_delete_product(shop_id: int | str, product_id: str) -> dict[str, Any]:
    return await _printify_request("DELETE", f"/shops/{shop_id}/products/{product_id}.json")


@mcp.tool()
async def printify_publish_product(
    shop_id: int | str,
    product_id: str,
    title: bool = True,
    description: bool = True,
    images: bool = True,
    variants: bool = True,
    tags: bool = True,
    key_features: bool = True,
    shipping_template: bool = True,
) -> dict[str, Any]:
    return await _printify_request(
        "POST", f"/shops/{shop_id}/products/{product_id}/publish.json",
        body={
            "title": title,
            "description": description,
            "images": images,
            "variants": variants,
            "tags": tags,
            "keyFeatures": key_features,
            "shipping_template": shipping_template,
        },
    )


@mcp.tool()
async def printify_list_orders(shop_id: int | str, page: int = 1, limit: int = 50) -> dict[str, Any]:
    return await _printify_request(
        "GET", f"/shops/{shop_id}/orders.json",
        params={"page": max(1, page), "limit": min(max(1, limit), 50)},
    )


@mcp.tool()
async def printify_get_order(shop_id: int | str, order_id: str) -> dict[str, Any]:
    return await _printify_request("GET", f"/shops/{shop_id}/orders/{order_id}.json")


@mcp.tool()
async def printify_create_order(shop_id: int | str, order: dict[str, Any]) -> dict[str, Any]:
    return await _printify_request("POST", f"/shops/{shop_id}/orders.json", body=order)


async def _redis() -> Redis:
    url = os.environ.get("REDIS_URL", "").strip()
    if not url:
        raise RuntimeError("REDIS_URL is not configured on the server.")
    return Redis.from_url(url, decode_responses=True)


async def _put(key: str, value: str, ttl: int) -> None:
    db = await _redis()
    try:
        await db.setex(key, ttl, value)
    finally:
        await db.aclose()


async def _get(key: str) -> str | None:
    db = await _redis()
    try:
        return await db.get(key)
    finally:
        await db.aclose()


async def _delete(key: str) -> None:
    db = await _redis()
    try:
        await db.delete(key)
    finally:
        await db.aclose()


async def _body(request) -> dict[str, Any]:
    raw = await request.body()
    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        try:
            return json.loads(raw.decode() or "{}")
        except Exception:
            return {}
    return {k: v[-1] for k, v in parse_qs(raw.decode(), keep_blank_values=True).items()}


async def oauth_register(request):
    data = await _body(request)
    redirect_uris = data.get("redirect_uris", [])
    if isinstance(redirect_uris, str):
        redirect_uris = [redirect_uris]
    if not redirect_uris:
        return JSONResponse({"error": "invalid_client_metadata"}, status_code=400)
    client_id = "mcp_" + secrets.token_urlsafe(24)
    await _put(
        f"mcp:client:{client_id}",
        json.dumps({"redirect_uris": redirect_uris}),
        31536000,
    )
    return JSONResponse({
        "client_id": client_id,
        "redirect_uris": redirect_uris,
        "token_endpoint_auth_method": "none",
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
    })


async def oauth_authorize(request):
    q = request.query_params
    raw = await _get(f"mcp:client:{q.get('client_id', '')}")
    if not raw:
        return JSONResponse({"error": "invalid_client"}, status_code=400)
    client = json.loads(raw)
    redirect_uri = q.get("redirect_uri", "")
    if q.get("response_type") != "code" or redirect_uri not in client.get("redirect_uris", []):
        return JSONResponse({"error": "invalid_request"}, status_code=400)
    if q.get("code_challenge_method") != "S256" or not q.get("code_challenge"):
        return JSONResponse({"error": "invalid_request", "error_description": "PKCE S256 is required."}, status_code=400)
    code = secrets.token_urlsafe(48)
    await _put(
        f"mcp:code:{code}",
        json.dumps({
            "client_id": q.get("client_id"),
            "redirect_uri": redirect_uri,
            "code_challenge": q.get("code_challenge"),
            "resource": q.get("resource", MCP_BASE_URL),
        }),
        600,
    )
    return RedirectResponse(
        redirect_uri + "?" + urlencode({"code": code, "state": q.get("state", "")}),
        status_code=302,
    )


async def oauth_token(request):
    data = await _body(request)
    grant = data.get("grant_type")
    if grant == "authorization_code":
        raw = await _get(f"mcp:code:{data.get('code', '')}")
        verifier = data.get("code_verifier")
        if not raw or not verifier:
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        record = json.loads(raw)
        digest = hashlib.sha256(verifier.encode()).digest()
        challenge = base64.urlsafe_b64encode(digest).decode().rstrip("=")
        if not secrets.compare_digest(challenge, record["code_challenge"]):
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        await _delete(f"mcp:code:{data['code']}")
        access = secrets.token_urlsafe(48)
        refresh = secrets.token_urlsafe(48)
        token_data = json.dumps({"client_id": record["client_id"], "resource": record["resource"]})
        await _put(f"mcp:token:{access}", token_data, 3600)
        await _put(f"mcp:refresh:{refresh}", token_data, 2592000)
        return JSONResponse({
            "access_token": access,
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": refresh,
        })
    if grant == "refresh_token":
        raw = await _get(f"mcp:refresh:{data.get('refresh_token', '')}")
        if not raw:
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        access = secrets.token_urlsafe(48)
        await _put(f"mcp:token:{access}", raw, 3600)
        return JSONResponse({"access_token": access, "token_type": "Bearer", "expires_in": 3600})
    return JSONResponse({"error": "unsupported_grant_type"}, status_code=400)


async def protected_resource(request):
    return JSONResponse({
        "resource": MCP_BASE_URL,
        "authorization_servers": [MCP_BASE_URL],
        "scopes_supported": ["printify"],
        "bearer_methods_supported": ["header"],
    })


async def authorization_server(request):
    return JSONResponse({
        "issuer": MCP_BASE_URL,
        "authorization_endpoint": MCP_BASE_URL + "/oauth/authorize",
        "token_endpoint": MCP_BASE_URL + "/oauth/token",
        "registration_endpoint": MCP_BASE_URL + "/oauth/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "scopes_supported": ["printify"],
    })


async def health(request):
    return JSONResponse({
        "ok": True,
        "service": "Printify Manager",
        "mcp": "/mcp",
        "printify_api_configured": bool(os.environ.get("PRINTIFY_API_TOKEN", "").strip()),
        "redis_configured": bool(os.environ.get("REDIS_URL", "").strip()),
    })


async def oauth_guard(request, call_next):
    if request.url.path != "/mcp":
        return await call_next(request)
    authorization = request.headers.get("authorization", "")
    metadata = MCP_BASE_URL + "/.well-known/oauth-protected-resource"
    if not authorization.startswith("Bearer "):
        return JSONResponse(
            {"error": "unauthorized"},
            status_code=401,
            headers={"WWW-Authenticate": f'Bearer resource_metadata="{metadata}"'},
        )
    token = authorization[7:].strip()
    if not token or not await _get(f"mcp:token:{token}"):
        return JSONResponse({"error": "invalid_token"}, status_code=401)
    return await call_next(request)


mcp_app = mcp.http_app(path="/mcp", stateless_http=True)

app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/.well-known/oauth-protected-resource", protected_resource, methods=["GET"]),
        Route("/.well-known/oauth-protected-resource/mcp", protected_resource, methods=["GET"]),
        Route("/mcp/.well-known/oauth-protected-resource", protected_resource, methods=["GET"]),
        Route("/.well-known/oauth-authorization-server", authorization_server, methods=["GET"]),
        Route("/.well-known/oauth-authorization-server/mcp", authorization_server, methods=["GET"]),
        Route("/mcp/.well-known/oauth-authorization-server", authorization_server, methods=["GET"]),
        Route("/.well-known/openid-configuration", authorization_server, methods=["GET"]),
        Route("/.well-known/openid-configuration/mcp", authorization_server, methods=["GET"]),
        Route("/mcp/.well-known/openid-configuration", authorization_server, methods=["GET"]),
        Route("/oauth/register", oauth_register, methods=["POST"]),
        Route("/oauth/authorize", oauth_authorize, methods=["GET"]),
        Route("/oauth/token", oauth_token, methods=["POST"]),
        Mount("/", app=mcp_app),
    ],
    lifespan=mcp_app.lifespan,
)

app.add_middleware(BaseHTTPMiddleware, dispatch=oauth_guard)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "10000")))
