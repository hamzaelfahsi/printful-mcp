import os
from typing import Any
import httpx
from fastmcp import FastMCP

mcp = FastMCP("Printful Manager")
BASE_URL = "https://api.printful.com"

def _headers() -> dict[str, str]:
    token = os.environ.get("PRINTFUL_API_KEY")
    if not token:
        raise RuntimeError("PRINTFUL_API_KEY is not configured on the server.")
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if os.environ.get("PRINTFUL_STORE_ID"):
        h["X-PF-Store-Id"] = os.environ["PRINTFUL_STORE_ID"]
    return h

async def _request(method: str, path: str, params=None, json=None):
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.request(method, BASE_URL + path, headers=_headers(), params=params, json=json)
        r.raise_for_status()
        return r.json()

@mcp.tool()
async def printful_test_connection() -> dict[str, Any]:
    return {"ok": True, "result": await _request("GET", "/stores")}

@mcp.tool()
async def printful_list_stores() -> dict[str, Any]:
    return await _request("GET", "/stores")

@mcp.tool()
async def printful_list_catalog_products(limit: int = 100, offset: int = 0) -> dict[str, Any]:
    return await _request("GET", "/products", {"limit": limit, "offset": offset})

@mcp.tool()
async def printful_get_catalog_product(product_id: int) -> dict[str, Any]:
    return await _request("GET", f"/products/{product_id}")

@mcp.tool()
async def printful_list_store_products(limit: int = 100, offset: int = 0) -> dict[str, Any]:
    return await _request("GET", "/store/products", {"limit": limit, "offset": offset})

@mcp.tool()
async def printful_get_store_product(product_id: int) -> dict[str, Any]:
    return await _request("GET", f"/store/products/{product_id}")

@mcp.tool()
async def printful_create_file_from_url(url: str, filename: str | None = None, visible: bool = True) -> dict[str, Any]:
    payload = {"url": url, "visible": visible}
    if filename:
        payload["filename"] = filename
    return await _request("POST", "/files", json=payload)

@mcp.tool()
async def printful_create_store_product(name: str, variant_id: int, retail_price: str, file_id: int | None = None, thumbnail: str | None = None) -> dict[str, Any]:
    variant = {"variant_id": variant_id, "retail_price": retail_price}
    if file_id is not None:
        variant["files"] = [{"id": file_id}]
    product = {"name": name}
    if thumbnail:
        product["thumbnail"] = thumbnail
    return await _request("POST", "/store/products", json={"sync_product": product, "sync_variants": [variant]})

@mcp.tool()
async def printful_create_store_product_multi_variant(name: str, variants: list[dict[str, Any]], thumbnail: str | None = None) -> dict[str, Any]:
    sv = []
    for item in variants:
        v = {"variant_id": int(item["variant_id"]), "retail_price": str(item["retail_price"])}
        if item.get("file_id") is not None:
            v["files"] = [{"id": int(item["file_id"])}]
        sv.append(v)
    product = {"name": name}
    if thumbnail:
        product["thumbnail"] = thumbnail
    return await _request("POST", "/store/products", json={"sync_product": product, "sync_variants": sv})

@mcp.tool()
async def printful_update_store_product(product_id: int, name: str | None = None, variant_id: int | None = None, retail_price: str | None = None, file_id: int | None = None) -> dict[str, Any]:
    payload = {}
    if name is not None:
        payload["sync_product"] = {"name": name}
    if variant_id is not None:
        v = {"variant_id": variant_id}
        if retail_price is not None:
            v["retail_price"] = retail_price
        if file_id is not None:
            v["files"] = [{"id": file_id}]
        payload["sync_variants"] = [v]
    return await _request("PUT", f"/store/products/{product_id}", json=payload)

@mcp.tool()
async def printful_delete_store_product(product_id: int) -> dict[str, Any]:
    return await _request("DELETE", f"/store/products/{product_id}")

@mcp.tool()
async def printful_list_files(limit: int = 100, offset: int = 0) -> dict[str, Any]:
    return await _request("GET", "/files", {"limit": limit, "offset": offset})

@mcp.tool()
async def printful_list_orders(limit: int = 20, offset: int = 0) -> dict[str, Any]:
    return await _request("GET", "/orders", {"limit": limit, "offset": offset})

@mcp.tool()
async def printful_get_order(order_id: str) -> dict[str, Any]:
    return await _request("GET", f"/orders/{order_id}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port, path="/mcp")
