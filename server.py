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
    headers = {"Authorization": f"Bearer {token}"}
    store_id = os.environ.get("PRINTFUL_STORE_ID")
    if store_id:
        headers["X-PF-Store-Id"] = store_id
    return headers


async def _get(path: str, params: dict[str, Any] | None = None) -> Any:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(BASE_URL + path, headers=_headers(), params=params)
        response.raise_for_status()
        return response.json()


@mcp.tool()
async def printful_test_connection() -> dict[str, Any]:
    """Test the configured Printful token by listing accessible stores."""
    data = await _get("/stores")
    return {
        "ok": True,
        "message": "Printful API connection successful.",
        "result": data,
    }


@mcp.tool()
async def printful_list_stores() -> dict[str, Any]:
    """List the Printful stores accessible to the configured token."""
    return await _get("/stores")


@mcp.tool()
async def printful_list_catalog_products(limit: int = 20, offset: int = 0) -> dict[str, Any]:
    """List Printful catalog products."""
    return await _get("/products", {"limit": limit, "offset": offset})


@mcp.tool()
async def printful_get_catalog_product(product_id: int) -> dict[str, Any]:
    """Get one Printful catalog product by ID."""
    return await _get(f"/products/{product_id}")


@mcp.tool()
async def printful_list_store_products(limit: int = 20, offset: int = 0) -> dict[str, Any]:
    """List products in the configured Printful store."""
    return await _get("/store/products", {"limit": limit, "offset": offset})


@mcp.tool()
async def printful_get_store_product(product_id: int) -> dict[str, Any]:
    """Get one product from the configured Printful store."""
    return await _get(f"/store/products/{product_id}")


@mcp.tool()
async def printful_list_orders(limit: int = 20, offset: int = 0) -> dict[str, Any]:
    """List orders from the configured Printful store."""
    return await _get("/orders", {"limit": limit, "offset": offset})


@mcp.tool()
async def printful_get_order(order_id: str) -> dict[str, Any]:
    """Get one Printful order."""
    return await _get(f"/orders/{order_id}")


@mcp.tool()
async def printful_list_files(limit: int = 20, offset: int = 0) -> dict[str, Any]:
    """List files available in the Printful file library."""
    return await _get("/files", {"limit": limit, "offset": offset})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port, path="/mcp")
