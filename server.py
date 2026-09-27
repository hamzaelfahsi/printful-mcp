import os
from typing import Any

import httpx
from fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

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
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.request(
            method,
            BASE_URL + path,
            headers=_headers(store_id),
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
async def printful_create_store_product(
    sync_product: dict[str, Any],
    sync_variants: list[dict[str, Any]],
    store_id: int | str | None = None,
) -> dict[str, Any]:
    """Create a Sync Product in the selected Printful store."""
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
    """Explicit publication call; Printful publication uses POST /store/products."""
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
        Mount("/", app=mcp_app),
    ],
    lifespan=mcp_app.lifespan,
)

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "10000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
