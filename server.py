import os
import base64
import hashlib
import secrets
import json
from urllib.parse import urlencode, parse_qs
from typing import Any

import httpx
from fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.responses import JSONResponse, RedirectResponse
from starlette.routing import Mount, Route
from cryptography.fernet import Fernet
from redis.asyncio import Redis

mcp = FastMCP("Printful Manager")
BASE_URL = "https://api.printful.com"

def _headers(store_id: int | str | None = None) -> dict[str, str]:
    token = os.environ.get("PRINTFUL_API_KEY")
    if not token:
        raise RuntimeError("PRINTFUL_API_KEY is not configured on the server.")
    selected_store_id = store_id if store_id is not None else os.environ.get("PRINTFUL_STORE_ID")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if selected_store_id:
        headers["X-PF-Store-Id"] = str(selected_store_id)
    return headers

async def _request(
    method: str,
    path: str,
    *,
    store_id: int | str | None = None,
    params: dict[str, Any] | None = None,
    json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    # Account-level Printful tokens require X-PF-Store-Id for store-scoped
    # endpoints. If the caller did not provide one, automatically select the
    # connected Etsy store (or PRINTFUL_STORE_ID when explicitly configured).
    selected_store_id = store_id if store_id is not None else os.environ.get("PRINTFUL_STORE_ID")
    if selected_store_id is None and path != "/stores":
        async with httpx.AsyncClient(timeout=30.0) as client:
            stores_response = await client.get(
                BASE_URL + "/stores",
                headers=_headers(),
            )
        if stores_response.is_error:
            try:
                detail = stores_response.json()
            except ValueError:
                detail = stores_response.text[:1000]
            raise RuntimeError(f"Printful API {stores_response.status_code}: {detail}")
        stores_payload = stores_response.json()
        stores = stores_payload.get("result", [])
        etsy_stores = [s for s in stores if str(s.get("type", "")).lower() == "etsy"]
        if etsy_stores:
            selected_store_id = etsy_stores[0].get("id")
        elif stores:
            selected_store_id = stores[0].get("id")
        if selected_store_id is None:
            raise RuntimeError("No Printful store is available. Set PRINTFUL_STORE_ID in Render.")
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.request(
            method,
            BASE_URL + path,
            headers=_headers(selected_store_id),
            params=params,
            json=json,
        )
    if r.is_error:
        try:
            payload = r.json()
            message = payload.get("error") or payload.get("result") or payload
        except ValueError:
            message = r.text[:1000]
        raise RuntimeError(f"Printful API {r.status_code}: {message}")
    if r.status_code == 204:
        return {"ok": True}
    return r.json()

@mcp.tool()
async def printful_test_connection(store_id: int | str | None = None) -> dict[str, Any]:
    return {"ok": True, "result": await _request("GET", "/stores", store_id=store_id)}

@mcp.tool()
async def printful_list_stores() -> dict[str, Any]:
    return await _request("GET", "/stores")


@mcp.tool()
async def printful_get_store(store_id: int | str) -> dict[str, Any]:
    """Get basic information about one Printful store."""
    return await _request("GET", f"/stores/{store_id}")

@mcp.tool()
async def printful_list_categories() -> dict[str, Any]:
    """List Printful catalog categories."""
    return await _request("GET", "/categories")

async def _list_catalog_products(
    limit: int = 100,
    offset: int = 0,
    category_id: str | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if category_id:
        params["category_id"] = category_id
    return await _request("GET", "/products", params=params)


@mcp.tool()
async def printful_list_catalog_products(
    limit: int = 100,
    offset: int = 0,
    category_id: str | None = None,
) -> dict[str, Any]:
    """List Printful catalog products, optionally filtered by category IDs."""
    return await _list_catalog_products(limit=limit, offset=offset, category_id=category_id)


@mcp.tool()
async def printful_list_phone_cases(limit: int = 100, offset: int = 0) -> dict[str, Any]:
    """List iPhone and Samsung case catalog products."""
    return await _list_catalog_products(limit=limit, offset=offset, category_id="50,62")

@mcp.tool()
async def printful_get_catalog_product(product_id: int) -> dict[str, Any]:
    return await _request("GET", f"/products/{product_id}")

@mcp.tool()
async def printful_get_catalog_variant(variant_id: int) -> dict[str, Any]:
    """Get one Printful Catalog Variant."""
    return await _request("GET", f"/products/variant/{variant_id}")


@mcp.tool()
async def printful_get_product_printfiles(
    product_id: int,
    store_id: int | str | None = None,
    technique: str | None = None,
    orientation: str | None = None,
) -> dict[str, Any]:
    """Get print-file mappings for a Catalog Product."""
    params: dict[str, Any] = {}
    if technique:
        params["technique"] = technique
    if orientation:
        params["orientation"] = orientation
    return await _request("GET", f"/mockup-generator/printfiles/{product_id}", store_id=store_id, params=params or None)


@mcp.tool()
async def printful_list_product_templates(
    product_id: int,
    store_id: int | str | None = None,
    technique: str | None = None,
    orientation: str | None = None,
) -> dict[str, Any]:
    """List layout templates for a Catalog Product."""
    params: dict[str, Any] = {}
    if technique:
        params["technique"] = technique
    if orientation:
        params["orientation"] = orientation
    return await _request("GET", f"/mockup-generator/templates/{product_id}", store_id=store_id, params=params or None)


@mcp.tool()
async def printful_list_store_products(
    limit: int = 100,
    offset: int = 0,
    status: str | None = None,
    category_id: str | None = None,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if status:
        params["status"] = status
    if category_id:
        params["category_id"] = category_id
    return await _request("GET", "/store/products", store_id=store_id, params=params)

@mcp.tool()
async def printful_get_store_product(product_id: int | str, store_id: int | str | None = None) -> dict[str, Any]:
    return await _request("GET", f"/store/products/{product_id}", store_id=store_id)

@mcp.tool()
async def printful_get_file(file_id: int, store_id: int | str | None = None) -> dict[str, Any]:
    """Get one Printful library file."""
    return await _request("GET", f"/files/{file_id}", store_id=store_id)


@mcp.tool()
async def printful_create_file_from_url(
    url: str,
    filename: str | None = None,
    visible: bool = True,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    payload = {"url": url, "visible": visible}
    if filename:
        payload["filename"] = filename
    return await _request("POST", "/files", store_id=store_id, json=payload)

@mcp.tool()
async def printful_create_mockup_task(
    product_id: int,
    variant_ids: list[int],
    files: list[dict[str, Any]] | None = None,
    format: str = "jpg",
    width: int | None = None,
    product_options: dict[str, Any] | None = None,
    option_groups: list[str] | None = None,
    options: list[str] | None = None,
    product_template_id: int | None = None,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Create an asynchronous Printful mockup task."""
    payload: dict[str, Any] = {"variant_ids": variant_ids, "format": format}
    if width is not None:
        payload["width"] = width
    if files is not None:
        payload["files"] = files
    if product_options is not None:
        payload["product_options"] = product_options
    if option_groups is not None:
        payload["option_groups"] = option_groups
    if options is not None:
        payload["options"] = options
    if product_template_id is not None:
        payload["product_template_id"] = product_template_id
    return await _request("POST", f"/mockup-generator/create-task/{product_id}", store_id=store_id, json=payload)


@mcp.tool()
async def printful_get_mockup_task(
    task_key: str,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Get the status/result of a Printful mockup task."""
    return await _request("GET", "/mockup-generator/task", store_id=store_id, params={"task_key": task_key})


@mcp.tool()
async def printful_list_ecommerce_sync_products(
    limit: int = 100,
    offset: int = 0,
    status: str | None = None,
    search: str | None = None,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """List products imported from a connected ecommerce platform such as Etsy."""
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if status:
        params["status"] = status
    if search:
        params["search"] = search
    return await _request("GET", "/sync/products", store_id=store_id, params=params)


@mcp.tool()
async def printful_get_ecommerce_sync_product(
    product_id: int | str,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Get a product imported from a connected ecommerce platform."""
    return await _request("GET", f"/sync/products/{product_id}", store_id=store_id)


@mcp.tool()
async def printful_update_ecommerce_sync_product(
    product_id: int | str,
    sync_product: dict[str, Any] | None = None,
    sync_variants: list[dict[str, Any]] | None = None,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Assign Printful catalog variants and print files to an existing ecommerce product."""
    if sync_product is None and sync_variants is None:
        raise ValueError("Provide sync_product and/or sync_variants.")
    payload: dict[str, Any] = {}
    if sync_product is not None:
        payload["sync_product"] = sync_product
    if sync_variants is not None:
        payload["sync_variants"] = sync_variants
    return await _request(
        "PUT",
        f"/store/products/{product_id}",
        store_id=store_id,
        json=payload,
    )


@mcp.tool()
async def printful_update_ecommerce_sync_variant(
    sync_variant_id: int | str,
    variant: dict[str, Any],
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Update an existing ecommerce sync variant, including its print files."""
    return await _request(
        "PUT",
        f"/sync/variant/{sync_variant_id}",
        store_id=store_id,
        json=variant,
    )


@mcp.tool()
async def printful_create_store_product(
    sync_product: dict[str, Any],
    sync_variants: list[dict[str, Any]],
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Create a Sync Product only in a Manual Order/API Printful store; not an Etsy listing."""
    if not sync_product.get("name"):
        raise ValueError("sync_product.name is required.")
    if not sync_variants:
        raise ValueError("sync_variants must contain at least one variant.")
    for index, variant in enumerate(sync_variants):
        if "variant_id" not in variant:
            raise ValueError(f"sync_variants[{index}].variant_id is required.")
        if not variant.get("files"):
            raise ValueError(f"sync_variants[{index}].files is required.")
    return await _request(
        "POST",
        "/store/products",
        store_id=store_id,
        json={"sync_product": sync_product, "sync_variants": sync_variants},
    )


@mcp.tool()
async def printful_publish_store_product(
    sync_product: dict[str, Any],
    sync_variants: list[dict[str, Any]],
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Create a product only in a Manual Order/API Printful store; do not use this for Etsy publication."""
    if not sync_product.get("name"):
        raise ValueError("sync_product.name is required.")
    if not sync_variants:
        raise ValueError("sync_variants must contain at least one variant.")
    for index, variant in enumerate(sync_variants):
        if "variant_id" not in variant:
            raise ValueError(f"sync_variants[{index}].variant_id is required.")
        if not variant.get("files"):
            raise ValueError(f"sync_variants[{index}].files is required.")
    return await _request(
        "POST",
        "/store/products",
        store_id=store_id,
        json={"sync_product": sync_product, "sync_variants": sync_variants},
    )


@mcp.tool()
async def printful_update_store_product(
    product_id: int | str,
    sync_product: dict[str, Any] | None = None,
    sync_variants: list[dict[str, Any]] | None = None,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Update a Printful store Sync Product and/or Sync Variants."""
    if sync_product is None and sync_variants is None:
        raise ValueError("Provide sync_product and/or sync_variants.")
    payload: dict[str, Any] = {}
    if sync_product is not None:
        payload["sync_product"] = sync_product
    if sync_variants is not None:
        payload["sync_variants"] = sync_variants
    return await _request("PUT", f"/store/products/{product_id}", store_id=store_id, json=payload)


@mcp.tool()
async def printful_delete_store_product(product_id: int | str, store_id: int | str | None = None) -> dict[str, Any]:
    return await _request("DELETE", f"/store/products/{product_id}", store_id=store_id)

@mcp.tool()
async def printful_list_files(
    limit: int = 100,
    offset: int = 0,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    return await _request(
        "GET",
        "/files",
        store_id=store_id,
        params={"limit": limit, "offset": offset},
    )

@mcp.tool()
async def printful_get_store_variant(variant_id: int | str, store_id: int | str | None = None) -> dict[str, Any]:
    """Get one Printful Sync Variant."""
    return await _request("GET", f"/store/variants/{variant_id}", store_id=store_id)


@mcp.tool()
async def printful_create_store_variant(
    product_id: int | str,
    variant: dict[str, Any],
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Create a Sync Variant for an existing store product."""
    if "variant_id" not in variant:
        raise ValueError("variant.variant_id is required.")
    if not variant.get("files"):
        raise ValueError("variant.files is required.")
    return await _request("POST", f"/store/products/{product_id}/variants", store_id=store_id, json=variant)


@mcp.tool()
async def printful_update_store_variant(
    variant_id: int | str,
    variant: dict[str, Any],
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Update a Printful Sync Variant."""
    return await _request("PUT", f"/store/variants/{variant_id}", store_id=store_id, json=variant)


@mcp.tool()
async def printful_delete_store_variant(variant_id: int | str, store_id: int | str | None = None) -> dict[str, Any]:
    """Delete a Printful Sync Variant."""
    return await _request("DELETE", f"/store/variants/{variant_id}", store_id=store_id)


@mcp.tool()
async def printful_get_webhook_config(store_id: int | str | None = None) -> dict[str, Any]:
    """Get the stable Printful webhook configuration."""
    return await _request("GET", "/webhooks", store_id=store_id)


@mcp.tool()
async def printful_set_webhook_config(
    url: str,
    types: list[str],
    params: dict[str, Any] | None = None,
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Create or replace the stable Printful webhook configuration."""
    if not types:
        raise ValueError("types must contain at least one webhook event.")
    payload: dict[str, Any] = {"url": url, "types": types}
    if params is not None:
        payload["params"] = params
    return await _request("POST", "/webhooks", store_id=store_id, json=payload)


@mcp.tool()
async def printful_disable_webhooks(store_id: int | str | None = None) -> dict[str, Any]:
    """Disable the stable Printful webhook configuration."""
    return await _request("DELETE", "/webhooks", store_id=store_id)


@mcp.tool()
async def printful_list_orders(limit: int = 20, offset: int = 0, store_id: int | str | None = None) -> dict[str, Any]:
    return await _request("GET", "/orders", store_id=store_id, params={"limit": limit, "offset": offset})

@mcp.tool()
async def printful_get_order(order_id: int | str, store_id: int | str | None = None) -> dict[str, Any]:
    return await _request("GET", f"/orders/{order_id}", store_id=store_id)



async def _etsy_token_store() -> Redis:
    url = os.environ.get("REDIS_URL", "").strip()
    if not url:
        raise RuntimeError("REDIS_URL is not configured on the server.")
    return Redis.from_url(url, decode_responses=True)


def _etsy_fernet() -> Fernet:
    key = os.environ.get("ETSY_TOKEN_ENCRYPTION_KEY", "").strip()
    if not key:
        raise RuntimeError("ETSY_TOKEN_ENCRYPTION_KEY is not configured on the server.")
    return Fernet(key.encode("ascii"))


async def _etsy_save_tokens(token_data: dict[str, Any]) -> None:
    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        raise RuntimeError("Etsy did not return a refresh token.")
    payload = {
        "refresh_token": refresh_token,
        "scope": token_data.get("scope", ""),
    }
    db = await _etsy_token_store()
    try:
        await db.set("etsy:oauth", _etsy_fernet().encrypt(json.dumps(payload).encode()).decode())
    finally:
        await db.aclose()


async def _etsy_load_tokens() -> dict[str, Any] | None:
    db = await _etsy_token_store()
    try:
        raw = await db.get("etsy:oauth")
    finally:
        await db.aclose()
    if not raw:
        return None
    try:
        return json.loads(_etsy_fernet().decrypt(raw.encode()).decode())
    except Exception as exc:
        raise RuntimeError("Stored Etsy credentials could not be decrypted.") from exc


async def _etsy_access_token() -> str:
    stored = await _etsy_load_tokens()
    if not stored or not stored.get("refresh_token"):
        raise RuntimeError("Etsy is not authorized yet. Open /etsy/oauth/start first.")
    client_id = _etsy_client_id()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.etsy.com/v3/public/oauth/token",
            data={
                "grant_type": "refresh_token",
                "client_id": client_id,
                "refresh_token": stored["refresh_token"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if response.is_error:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text[:1000]
        raise RuntimeError(f"Etsy refresh failed: {detail}")
    token_data = response.json()
    await _etsy_save_tokens(token_data)
    return token_data["access_token"]


@mcp.tool()
async def etsy_test_connection() -> dict[str, Any]:
    try:
        access_token = await _etsy_access_token()
        return {"ok": True, "authorized": True, "token_refreshed": bool(access_token)}
    except RuntimeError as exc:
        return {"ok": False, "authorized": False, "error": str(exc)}


def _etsy_client_id() -> str:
    value = os.environ.get("ETSY_CLIENT_ID", "").strip()
    if not value:
        raise RuntimeError("ETSY_CLIENT_ID is not configured on the server.")
    return value

def _etsy_api_key() -> str:
    key = os.environ.get("ETSY_API_KEY", "").strip()
    if key:
        return key
    client_id = os.environ.get("ETSY_CLIENT_ID", "").strip()
    secret = os.environ.get("ETSY_CLIENT_SECRET", "").strip()
    if client_id and secret:
        return f"{client_id}:{secret}"
    raise RuntimeError("ETSY_API_KEY or ETSY_CLIENT_SECRET is not configured on the server.")

async def _etsy_request(
    method: str,
    path: str,
    *,
    data: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    access_token = await _etsy_access_token()
    headers = {
        "x-api-key": _etsy_api_key(),
        "Authorization": f"Bearer {access_token}",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.request(
            method,
            "https://api.etsy.com/v3/application" + path,
            headers=headers,
            data=data,
            params=params,
        )
    if response.is_error:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text[:2000]
        raise RuntimeError(f"Etsy API {response.status_code}: {detail}")
    if response.status_code == 204:
        return {"ok": True}
    return response.json()

@mcp.tool()
async def etsy_get_me() -> dict[str, Any]:
    """Return the authenticated Etsy user."""
    return await _etsy_request("GET", "/users/me")

@mcp.tool()
async def etsy_list_my_shops() -> dict[str, Any]:
    """List the Etsy shops owned by the authenticated user."""
    me = await _etsy_request("GET", "/users/me")
    user_id = me.get("user_id")
    if not user_id:
        raise RuntimeError("Etsy did not return the authenticated user_id.")
    return await _etsy_request("GET", f"/users/{user_id}/shops")

@mcp.tool()
async def etsy_create_draft_listing(
    title: str,
    description: str,
    price: float,
    quantity: int = 1,
    taxonomy_id: int = 0,
    shop_id: int | None = None,
    who_made: str = "i_did",
    when_made: str = "made_to_order",
    tags: list[str] | None = None,
    materials: list[str] | None = None,
) -> dict[str, Any]:
    """Create an Etsy draft listing. It does not publish the listing."""
    if not title.strip():
        raise ValueError("title is required.")
    if price <= 0:
        raise ValueError("price must be greater than zero.")
    if quantity < 1:
        raise ValueError("quantity must be at least 1.")
    if taxonomy_id < 1:
        raise ValueError("taxonomy_id must be provided; use etsy_get_seller_taxonomy to find it.")
    if shop_id is None:
        shops = await etsy_list_my_shops()
        shop_id = shops.get("shop_id")
        if not shop_id:
            raise RuntimeError("No Etsy shop was found for the authenticated account.")
    data: dict[str, Any] = {
        "quantity": str(quantity),
        "title": title,
        "description": description,
        "price": str(price),
        "who_made": who_made,
        "when_made": when_made,
        "taxonomy_id": str(taxonomy_id),
        "type": "physical",
    }
    if tags:
        data["tags"] = ",".join(tags[:13])
    if materials:
        data["materials"] = ",".join(materials)
    return await _etsy_request("POST", f"/shops/{shop_id}/listings", data=data)

@mcp.tool()
async def etsy_get_seller_taxonomy() -> dict[str, Any]:
    """Get Etsy seller taxonomy nodes used to select a valid listing category."""
    return await _etsy_request("GET", "/seller-taxonomy/nodes")


def _etsy_redirect_uri(request) -> str:
    configured = os.environ.get("ETSY_REDIRECT_URI", "").strip()
    if configured:
        return configured
    return str(request.base_url).rstrip("/") + "/etsy/oauth/callback"

def _pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")

async def etsy_oauth_start(request):
    try:
        client_id = _etsy_client_id()
    except RuntimeError as exc:
        return JSONResponse({"ok": False, "error": str(exc), "setup": "Set ETSY_CLIENT_ID in Render, then redeploy.", "redirect_uri": _etsy_redirect_uri(request)}, status_code=503)
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = _pkce_challenge(verifier)
    redirect_uri = _etsy_redirect_uri(request)
    scopes = os.environ.get("ETSY_SCOPES", "listings_r listings_w shops_r").strip()
    query = urlencode({"response_type": "code", "client_id": client_id, "redirect_uri": redirect_uri, "scope": scopes, "state": state, "code_challenge": challenge, "code_challenge_method": "S256"})
    response = RedirectResponse(url=f"https://www.etsy.com/oauth/connect?{query}", status_code=302)
    response.set_cookie("etsy_oauth_state", state, max_age=600, httponly=True, secure=True, samesite="lax", path="/etsy/oauth")
    response.set_cookie("etsy_oauth_verifier", verifier, max_age=600, httponly=True, secure=True, samesite="lax", path="/etsy/oauth")
    return response

async def etsy_oauth_callback(request):
    params = request.query_params
    if params.get("error"):
        return JSONResponse({"ok": False, "error": params.get("error"), "error_description": params.get("error_description")}, status_code=400)
    code = params.get("code")
    state = params.get("state")
    saved_state = request.cookies.get("etsy_oauth_state")
    verifier = request.cookies.get("etsy_oauth_verifier")
    if not code or not state:
        return JSONResponse({"ok": False, "error": "Missing Etsy authorization code or state."}, status_code=400)
    if not saved_state or not secrets.compare_digest(state, saved_state):
        return JSONResponse({"ok": False, "error": "Invalid OAuth state. Restart authorization from the start URL."}, status_code=400)
    if not verifier:
        return JSONResponse({"ok": False, "error": "Missing PKCE verifier cookie. Restart authorization from the start URL."}, status_code=400)
    try:
        client_id = _etsy_client_id()
    except RuntimeError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=503)
    redirect_uri = _etsy_redirect_uri(request)
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_response = await client.post("https://api.etsy.com/v3/public/oauth/token", data={"grant_type": "authorization_code", "client_id": client_id, "redirect_uri": redirect_uri, "code": code, "code_verifier": verifier}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    if token_response.is_error:
        try:
            detail = token_response.json()
        except ValueError:
            detail = token_response.text[:1000]
        return JSONResponse({"ok": False, "error": "Etsy token exchange failed.", "detail": detail}, status_code=502)
    await _etsy_save_tokens(token_response.json())
    response = JSONResponse({"ok": True, "message": "Etsy authorization completed.", "next_step": "Etsy OAuth is now stored securely. You can use the Etsy listing tools.", "token_received": True})
    response.delete_cookie("etsy_oauth_state", path="/etsy/oauth")
    response.delete_cookie("etsy_oauth_verifier", path="/etsy/oauth")
    return response

async def etsy_oauth_info(request):
    return JSONResponse({"ok": True, "authorization_start": str(request.base_url).rstrip("/") + "/etsy/oauth/start", "redirect_uri": _etsy_redirect_uri(request), "scopes": os.environ.get("ETSY_SCOPES", "listings_r listings_w shops_r"), "client_id_configured": bool(os.environ.get("ETSY_CLIENT_ID", "").strip())})


async def etsy_status(request):
    try:
        stored = await _etsy_load_tokens()
        return JSONResponse({"ok": True, "authorized": bool(stored), "scope": stored.get("scope", "") if stored else None})
    except RuntimeError as exc:
        return JSONResponse({"ok": False, "authorized": False, "error": str(exc)}, status_code=503)


# ---------------------------------------------------------------------------
# MCP OAuth 2.1 bridge
# ---------------------------------------------------------------------------

MCP_BASE_URL = "https://printful-mcp-hyfr.onrender.com"
MCP_ETSY_CALLBACK = f"{MCP_BASE_URL}/etsy/oauth/callback"

async def _mcp_oauth_put(key: str, value: str, ttl: int = 600) -> None:
    db = await _etsy_token_store()
    try:
        await db.setex(key, ttl, value)
    finally:
        await db.aclose()

async def _mcp_oauth_get(key: str) -> str | None:
    db = await _etsy_token_store()
    try:
        return await db.get(key)
    finally:
        await db.aclose()

async def _mcp_oauth_delete(key: str) -> None:
    db = await _etsy_token_store()
    try:
        await db.delete(key)
    finally:
        await db.aclose()

async def _mcp_oauth_json_or_form(request) -> dict[str, Any]:
    body = await request.body()
    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        try:
            value = json.loads(body.decode("utf-8") or "{}")
            return value if isinstance(value, dict) else {}
        except json.JSONDecodeError:
            return {}
    parsed = parse_qs(body.decode("utf-8"), keep_blank_values=True)
    return {key: values[-1] if values else "" for key, values in parsed.items()}

async def mcp_oauth_register(request):
    payload = await _mcp_oauth_json_or_form(request)
    redirect_uris = payload.get("redirect_uris", [])
    if isinstance(redirect_uris, str):
        redirect_uris = [redirect_uris]
    if not isinstance(redirect_uris, list) or not redirect_uris:
        return JSONResponse({"error": "invalid_client_metadata", "error_description": "redirect_uris is required."}, status_code=400)
    client_id = "mcp_" + secrets.token_urlsafe(24)
    client_name = payload.get("client_name") or "MCP client"
    await _mcp_oauth_put(f"mcp:client:{client_id}", json.dumps({"client_name": client_name, "redirect_uris": redirect_uris}), ttl=31536000)
    return JSONResponse({
        "client_id": client_id,
        "client_name": client_name,
        "redirect_uris": redirect_uris,
        "token_endpoint_auth_method": "none",
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
    })

async def mcp_oauth_authorize(request):
    q = request.query_params
    client_id = q.get("client_id", "")
    redirect_uri = q.get("redirect_uri", "")
    response_type = q.get("response_type", "")
    scope = q.get("scope", os.environ.get("ETSY_SCOPES", "listings_r listings_w shops_r"))
    state = q.get("state", "")
    code_challenge = q.get("code_challenge", "")
    code_challenge_method = q.get("code_challenge_method", "")
    client_raw = await _mcp_oauth_get(f"mcp:client:{client_id}")
    if not client_raw:
        return JSONResponse({"error": "invalid_client"}, status_code=400)
    client = json.loads(client_raw)
    if response_type != "code" or redirect_uri not in client.get("redirect_uris", []):
        return JSONResponse({"error": "invalid_request", "error_description": "Invalid response_type or redirect_uri."}, status_code=400)
    if not code_challenge or code_challenge_method != "S256":
        return JSONResponse({"error": "invalid_request", "error_description": "PKCE S256 is required."}, status_code=400)
    transaction = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    upstream_challenge = _pkce_challenge(verifier)
    await _mcp_oauth_put(f"mcp:txn:{transaction}", json.dumps({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method,
        "upstream_verifier": verifier,
    }), ttl=600)
    query = urlencode({
        "response_type": "code",
        "client_id": _etsy_client_id(),
        "redirect_uri": MCP_ETSY_CALLBACK,
        "scope": scope,
        "state": "mcp_" + transaction,
        "code_challenge": upstream_challenge,
        "code_challenge_method": "S256",
    })
    return RedirectResponse(f"https://www.etsy.com/oauth/connect?{query}", status_code=302)

async def mcp_oauth_token(request):
    payload = await _mcp_oauth_json_or_form(request)
    grant_type = payload.get("grant_type", "")
    if grant_type == "authorization_code":
        code = payload.get("code", "")
        verifier = payload.get("code_verifier", "")
        txn_raw = await _mcp_oauth_get(f"mcp:code:{code}")
        if not txn_raw or not verifier:
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        txn = json.loads(txn_raw)
        if _pkce_challenge(verifier) != txn.get("code_challenge"):
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        await _mcp_oauth_delete(f"mcp:code:{code}")
        access_token = secrets.token_urlsafe(48)
        refresh_token = secrets.token_urlsafe(48)
        await _mcp_oauth_put(f"mcp:token:{access_token}", json.dumps({"client_id": txn["client_id"]}), ttl=3600)
        await _mcp_oauth_put(f"mcp:refresh:{refresh_token}", json.dumps({"client_id": txn["client_id"]}), ttl=2592000)
        return JSONResponse({"access_token": access_token, "token_type": "Bearer", "expires_in": 3600, "refresh_token": refresh_token, "scope": os.environ.get("ETSY_SCOPES", "listings_r listings_w shops_r")})
    if grant_type == "refresh_token":
        old_refresh = payload.get("refresh_token", "")
        raw = await _mcp_oauth_get(f"mcp:refresh:{old_refresh}")
        if not raw:
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        access_token = secrets.token_urlsafe(48)
        await _mcp_oauth_put(f"mcp:token:{access_token}", raw, ttl=3600)
        return JSONResponse({"access_token": access_token, "token_type": "Bearer", "expires_in": 3600, "scope": os.environ.get("ETSY_SCOPES", "listings_r listings_w shops_r")})
    return JSONResponse({"error": "unsupported_grant_type"}, status_code=400)

async def mcp_oauth_etsy_callback(request):
    params = request.query_params
    state = params.get("state", "")
    if not state.startswith("mcp_"):
        return await etsy_oauth_callback(request)
    transaction = state[4:]
    txn_raw = await _mcp_oauth_get(f"mcp:txn:{transaction}")
    if not txn_raw:
        return JSONResponse({"error": "invalid_request", "error_description": "OAuth transaction expired."}, status_code=400)
    txn = json.loads(txn_raw)
    if params.get("error"):
        query = urlencode({"error": params.get("error"), "error_description": params.get("error_description", ""), "state": txn.get("state", "")})
        await _mcp_oauth_delete(f"mcp:txn:{transaction}")
        return RedirectResponse(f"{txn['redirect_uri']}?{query}", status_code=302)
    code = params.get("code")
    if not code:
        return JSONResponse({"error": "invalid_request", "error_description": "Missing Etsy authorization code."}, status_code=400)
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_response = await client.post(
            "https://api.etsy.com/v3/public/oauth/token",
            data={"grant_type": "authorization_code", "client_id": _etsy_client_id(), "redirect_uri": MCP_ETSY_CALLBACK, "code": code, "code_verifier": txn["upstream_verifier"]},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if token_response.is_error:
        query = urlencode({"error": "server_error", "error_description": "Etsy token exchange failed.", "state": txn.get("state", "")})
        return RedirectResponse(f"{txn['redirect_uri']}?{query}", status_code=302)
    await _etsy_save_tokens(token_response.json())
    auth_code = secrets.token_urlsafe(48)
    await _mcp_oauth_put(f"mcp:code:{auth_code}", json.dumps({
        "client_id": txn["client_id"], "redirect_uri": txn["redirect_uri"], "state": txn.get("state", ""), "code_challenge": txn["code_challenge"]
    }), ttl=600)
    await _mcp_oauth_delete(f"mcp:txn:{transaction}")
    query = urlencode({"code": auth_code, "state": txn.get("state", "")})
    return RedirectResponse(f"{txn['redirect_uri']}?{query}", status_code=302)

async def mcp_oauth_protected_resource(request):
    return JSONResponse({
        "resource": f"{MCP_BASE_URL}/mcp",
        "authorization_servers": [MCP_BASE_URL],
        "scopes_supported": os.environ.get("ETSY_SCOPES", "listings_r listings_w shops_r").split(),
        "bearer_methods_supported": ["header"],
    })

async def mcp_oauth_authorization_server(request):
    return JSONResponse({
        "issuer": MCP_BASE_URL,
        "authorization_endpoint": f"{MCP_BASE_URL}/oauth/authorize",
        "token_endpoint": f"{MCP_BASE_URL}/oauth/token",
        "registration_endpoint": f"{MCP_BASE_URL}/oauth/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "scopes_supported": os.environ.get("ETSY_SCOPES", "listings_r listings_w shops_r").split(),
    })

async def mcp_oauth_guard(request, call_next):
    if request.url.path != "/mcp":
        return await call_next(request)
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        return JSONResponse({"error": "unauthorized"}, status_code=401, headers={"WWW-Authenticate": f'Bearer resource_metadata="{MCP_BASE_URL}/.well-known/oauth-protected-resource"'})
    token = authorization[7:].strip()
    if not token or not await _mcp_oauth_get(f"mcp:token:{token}"):
        return JSONResponse({"error": "invalid_token"}, status_code=401, headers={"WWW-Authenticate": f'Bearer resource_metadata="{MCP_BASE_URL}/.well-known/oauth-protected-resource"'})
    return await call_next(request)


async def health(request):
    return JSONResponse({"ok": True, "service": "Printful Manager", "mcp": "/mcp"})

# Expose the FastMCP ASGI app directly at /mcp.
# FastMCP owns the MCP route itself; mounting an app that already contains
# /mcp under /mcp would incorrectly produce /mcp/mcp.
# Keep the FastMCP lifespan on the parent Starlette app so its session manager
# is initialized correctly.
mcp_app = mcp.http_app(path="/mcp", stateless_http=True)

app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/.well-known/oauth-protected-resource", mcp_oauth_protected_resource, methods=["GET"]),
        Route("/.well-known/oauth-authorization-server", mcp_oauth_authorization_server, methods=["GET"]),
        Route("/oauth/register", mcp_oauth_register, methods=["POST"]),
        Route("/oauth/authorize", mcp_oauth_authorize, methods=["GET"]),
        Route("/oauth/token", mcp_oauth_token, methods=["POST"]),
        Route("/etsy/oauth/start", etsy_oauth_start, methods=["GET"]),
        Route("/etsy/oauth/callback", mcp_oauth_etsy_callback, methods=["GET"]),
        Route("/etsy/oauth/info", etsy_oauth_info, methods=["GET"]),
        Route("/etsy/status", etsy_status, methods=["GET"]),
        Mount("/", app=mcp_app),
    ],
    lifespan=mcp_app.lifespan,
)

app.middleware("http")(mcp_oauth_guard)

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "10000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
