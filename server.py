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
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, RedirectResponse
from starlette.routing import Mount, Route
from cryptography.fernet import Fernet
from redis.asyncio import Redis

mcp = FastMCP("Printify Manager")
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



BASE_URL = "https://api.printify.com/v1"
MCP_BASE_URL = os.environ.get("MCP_BASE_URL", "https://printful-mcp-hyfr.onrender.com").rstrip("/")

def _printify_headers() -> dict[str, str]:
    token = os.environ.get("PRINTIFY_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError("PRINTIFY_API_TOKEN is not configured on the server.")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json;charset=utf-8", "Accept": "application/json"}

async def _request(method: str, path: str, *, params: dict[str, Any] | None = None, json_body: dict[str, Any] | None = None) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.request(method, BASE_URL + path, headers=_printify_headers(), params=params, json=json_body)
    if r.is_error:
        try: detail = r.json()
        except ValueError: detail = r.text[:2000]
        raise RuntimeError(f"Printify API {r.status_code}: {detail}")
    if r.status_code == 204: return {"ok": True}
    return r.json()

@mcp.tool()
async def printify_test_connection() -> dict[str, Any]:
    return {"ok": True, "service": "Printify", "shops": await _request("GET", "/shops.json")}

@mcp.tool()
async def printify_list_shops() -> dict[str, Any]:
    return await _request("GET", "/shops.json")

@mcp.tool()
async def printify_get_shop(shop_id: int | str) -> dict[str, Any]:
    return await _request("GET", f"/shops/{shop_id}.json")

@mcp.tool()
async def printify_list_products(shop_id: int | str, page: int = 1, limit: int = 50) -> dict[str, Any]:
    return await _request("GET", f"/shops/{shop_id}/products.json", params={"page": page, "limit": min(limit,50)})

@mcp.tool()
async def printify_get_product(shop_id: int | str, product_id: str) -> dict[str, Any]:
    return await _request("GET", f"/shops/{shop_id}/products/{product_id}.json")

@mcp.tool()
async def printify_list_blueprints(page: int = 1, limit: int = 50) -> dict[str, Any]:
    return await _request("GET", "/catalog/blueprints.json", params={"page":page,"limit":min(limit,50)})

@mcp.tool()
async def printify_get_blueprint(blueprint_id: int | str) -> dict[str, Any]:
    return await _request("GET", f"/catalog/blueprints/{blueprint_id}.json")

@mcp.tool()
async def printify_list_print_providers(blueprint_id: int | str) -> dict[str, Any]:
    return await _request("GET", f"/catalog/blueprints/{blueprint_id}/print_providers.json")

@mcp.tool()
async def printify_list_variants(blueprint_id: int | str, print_provider_id: int | str) -> dict[str, Any]:
    return await _request("GET", f"/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/variants.json")

@mcp.tool()
async def printify_list_uploads(page: int = 1, limit: int = 50) -> dict[str, Any]:
    return await _request("GET", "/uploads.json", params={"page":page,"limit":min(limit,50)})

@mcp.tool()
async def printify_upload_image_url(url: str, file_name: str = "design.png") -> dict[str, Any]:
    return await _request("POST", "/uploads/images.json", json_body={"file_name":file_name,"url":url})

@mcp.tool()
async def printify_upload_image_base64(file_name: str, contents: str) -> dict[str, Any]:
    return await _request("POST", "/uploads/images.json", json_body={"file_name":file_name,"contents":contents})

@mcp.tool()
async def printify_create_product(shop_id: int | str, title: str, description: str, blueprint_id: int, print_provider_id: int, variants: list[dict[str,Any]], print_areas: list[dict[str,Any]], tags: list[str] | None = None, visible: bool = True) -> dict[str,Any]:
    if not variants or not print_areas: raise ValueError("variants and print_areas are required.")
    body={"title":title,"description":description,"blueprint_id":blueprint_id,"print_provider_id":print_provider_id,"variants":variants,"print_areas":print_areas,"visible":visible}
    if tags is not None: body["tags"]=tags
    return await _request("POST", f"/shops/{shop_id}/products.json", json_body=body)

@mcp.tool()
async def printify_create_test_product(shop_id: int | str, blueprint_id: int, print_provider_id: int, image_id: str, title: str = "TEST - Printify MCP", price: int = 1999) -> dict[str,Any]:
    data=await printify_list_variants(blueprint_id,print_provider_id)
    variants=data.get("data",data.get("variants",[]))
    available=[v for v in variants if v.get("is_available",True)]
    if not available: raise RuntimeError("No available variant returned.")
    selected=available[:1]; ids=[int(v["id"]) for v in selected]
    return await printify_create_product(shop_id,title,"Temporary product created to verify Printify Manager.",blueprint_id,print_provider_id,[{"id":i,"price":price,"is_enabled":True} for i in ids],[{"variant_ids":ids,"placeholders":[{"position":"front","images":[{"id":image_id,"x":0.5,"y":0.5,"scale":1,"angle":0}]}]}],["test","printify","mcp"],True)

@mcp.tool()
async def printify_update_product(shop_id: int | str, product_id: str, product: dict[str,Any]) -> dict[str,Any]:
    return await _request("PUT", f"/shops/{shop_id}/products/{product_id}.json", json_body=product)

@mcp.tool()
async def printify_delete_product(shop_id: int | str, product_id: str) -> dict[str,Any]:
    return await _request("DELETE", f"/shops/{shop_id}/products/{product_id}.json")

@mcp.tool()
async def printify_publish_product(shop_id: int | str, product_id: str, title: bool=True, description: bool=True, images: bool=True, variants: bool=True, tags: bool=True, key_features: bool=True, shipping_template: bool=True) -> dict[str,Any]:
    return await _request("POST", f"/shops/{shop_id}/products/{product_id}/publish.json", json_body={"title":title,"description":description,"images":images,"variants":variants,"tags":tags,"keyFeatures":key_features,"shipping_template":shipping_template})

@mcp.tool()
async def printify_list_orders(shop_id: int | str, page: int=1, limit: int=50) -> dict[str,Any]:
    return await _request("GET", f"/shops/{shop_id}/orders.json", params={"page":page,"limit":min(limit,50)})

@mcp.tool()
async def printify_get_order(shop_id: int | str, order_id: str) -> dict[str,Any]:
    return await _request("GET", f"/shops/{shop_id}/orders/{order_id}.json")

@mcp.tool()
async def printify_create_order(shop_id: int | str, order: dict[str,Any]) -> dict[str,Any]:
    return await _request("POST", f"/shops/{shop_id}/orders.json", json_body=order)

# MCP OAuth 2.1 bridge
async def _oauth_redis() -> Redis:
    url=os.environ.get("REDIS_URL","").strip()
    if not url: raise RuntimeError("REDIS_URL is not configured on the server.")
    return Redis.from_url(url, decode_responses=True)

async def _oauth_put(key:str,value:str,ttl:int=600):
    db=await _oauth_redis()
    try: await db.setex(key,ttl,value)
    finally: await db.aclose()

async def _oauth_get(key:str):
    db=await _oauth_redis()
    try: return await db.get(key)
    finally: await db.aclose()

async def _oauth_delete(key:str):
    db=await _oauth_redis()
    try: await db.delete(key)
    finally: await db.aclose()

async def _oauth_body(request):
    body=await request.body()
    if "application/json" in request.headers.get("content-type","").lower():
        try: return json.loads(body.decode() or "{}")
        except Exception: return {}
    return {k:v[-1] for k,v in parse_qs(body.decode(),keep_blank_values=True).items()}

async def mcp_oauth_register(request):
    p=await _oauth_body(request); uris=p.get("redirect_uris",[])
    if isinstance(uris,str): uris=[uris]
    if not uris: return JSONResponse({"error":"invalid_client_metadata"},status_code=400)
    cid="mcp_"+secrets.token_urlsafe(24)
    await _oauth_put(f"mcp:client:{cid}",json.dumps({"redirect_uris":uris}),31536000)
    return JSONResponse({"client_id":cid,"redirect_uris":uris,"token_endpoint_auth_method":"none","grant_types":["authorization_code","refresh_token"],"response_types":["code"]})

async def mcp_oauth_authorize(request):
    q=request.query_params; raw=await _oauth_get(f"mcp:client:{q.get('client_id','')}")
    if not raw: return JSONResponse({"error":"invalid_client"},status_code=400)
    c=json.loads(raw); redirect=q.get("redirect_uri","")
    if q.get("response_type")!="code" or redirect not in c.get("redirect_uris",[]): return JSONResponse({"error":"invalid_request"},status_code=400)
    if q.get("code_challenge_method")!="S256" or not q.get("code_challenge"): return JSONResponse({"error":"invalid_request","error_description":"PKCE S256 is required."},status_code=400)
    code=secrets.token_urlsafe(48)
    await _oauth_put(f"mcp:code:{code}",json.dumps({"client_id":q.get("client_id"),"redirect_uri":redirect,"code_challenge":q.get("code_challenge"),"resource":q.get("resource",MCP_BASE_URL)}),600)
    return RedirectResponse(redirect+"?"+urlencode({"code":code,"state":q.get("state","")}),status_code=302)

async def mcp_oauth_token(request):
    p=await _oauth_body(request)
    if p.get("grant_type")=="authorization_code":
        raw=await _oauth_get(f"mcp:code:{p.get('code','')}")
        if not raw or not p.get("code_verifier"): return JSONResponse({"error":"invalid_grant"},status_code=400)
        d=json.loads(raw); digest=hashlib.sha256(p["code_verifier"].encode()).digest(); challenge=base64.urlsafe_b64encode(digest).decode().rstrip("=")
        if challenge!=d.get("code_challenge"): return JSONResponse({"error":"invalid_grant"},status_code=400)
        await _oauth_delete(f"mcp:code:{p['code']}")
        access=secrets.token_urlsafe(48); refresh=secrets.token_urlsafe(48); td=json.dumps({"client_id":d["client_id"],"resource":d["resource"]})
        await _oauth_put(f"mcp:token:{access}",td,3600); await _oauth_put(f"mcp:refresh:{refresh}",td,2592000)
        return JSONResponse({"access_token":access,"token_type":"Bearer","expires_in":3600,"refresh_token":refresh})
    if p.get("grant_type")=="refresh_token":
        raw=await _oauth_get(f"mcp:refresh:{p.get('refresh_token','')}")
        if not raw: return JSONResponse({"error":"invalid_grant"},status_code=400)
        access=secrets.token_urlsafe(48); await _oauth_put(f"mcp:token:{access}",raw,3600)
        return JSONResponse({"access_token":access,"token_type":"Bearer","expires_in":3600})
    return JSONResponse({"error":"unsupported_grant_type"},status_code=400)

async def mcp_oauth_protected_resource(request):
    return JSONResponse({"resource":MCP_BASE_URL,"authorization_servers":[MCP_BASE_URL],"scopes_supported":["printify"],"bearer_methods_supported":["header"]})

async def mcp_oauth_authorization_server(request):
    return JSONResponse({"issuer":MCP_BASE_URL,"authorization_endpoint":MCP_BASE_URL+"/oauth/authorize","token_endpoint":MCP_BASE_URL+"/oauth/token","registration_endpoint":MCP_BASE_URL+"/oauth/register","response_types_supported":["code"],"grant_types_supported":["authorization_code","refresh_token"],"code_challenge_methods_supported":["S256"],"token_endpoint_auth_methods_supported":["none"],"scopes_supported":["printify"]})

async def mcp_oauth_guard(request,call_next):
    if request.url.path!="/mcp": return await call_next(request)
    auth=request.headers.get("authorization",""); metadata=MCP_BASE_URL+"/.well-known/oauth-protected-resource"
    if not auth.startswith("Bearer "): return JSONResponse({"error":"unauthorized"},status_code=401,headers={"WWW-Authenticate":f'Bearer resource_metadata="{metadata}"'})
    if not await _oauth_get("mcp:token:"+auth[7:].strip()): return JSONResponse({"error":"invalid_token"},status_code=401)
    return await call_next(request)

async def health(request):
    return JSONResponse({"ok":True,"service":"Printify Manager","mcp":"/mcp","printify_api_configured":bool(os.environ.get("PRINTIFY_API_TOKEN","").strip())})

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
        Route("/.well-known/oauth-protected-resource/mcp", mcp_oauth_protected_resource, methods=["GET"]),
        Route("/mcp/.well-known/oauth-protected-resource", mcp_oauth_protected_resource, methods=["GET"]),
        Route("/.well-known/oauth-authorization-server", mcp_oauth_authorization_server, methods=["GET"]),
        Route("/.well-known/oauth-authorization-server/mcp", mcp_oauth_authorization_server, methods=["GET"]),
        Route("/mcp/.well-known/oauth-authorization-server", mcp_oauth_authorization_server, methods=["GET"]),
        Route("/.well-known/openid-configuration", mcp_oauth_authorization_server, methods=["GET"]),
        Route("/.well-known/openid-configuration/mcp", mcp_oauth_authorization_server, methods=["GET"]),
        Route("/mcp/.well-known/openid-configuration", mcp_oauth_authorization_server, methods=["GET"]),
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

class MCPOAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        return await mcp_oauth_guard(request, call_next)

app.add_middleware(MCPOAuthMiddleware)

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "10000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
