# Printful MCP Bridge

A small Streamable HTTP MCP server that securely calls the Printful REST API.

## Required environment variables

- `PRINTFUL_API_KEY`: your Printful private token. Set it only in the hosting provider's secret/environment-variable settings.
- `PRINTFUL_STORE_ID`: optional, only if your Printful account token requires `X-PF-Store-Id`.
- `PORT`: supplied automatically by Render; defaults to `10000` locally.

## MCP endpoint

After deployment:

`https://YOUR-SERVICE.onrender.com/mcp`

## Tools included

- `printful_test_connection`
- `printful_list_stores`
- `printful_list_catalog_products`
- `printful_get_catalog_product`
- `printful_list_store_products`
- `printful_get_store_product`
- `printful_list_orders`
- `printful_get_order`
- `printful_list_files`

No Printful token is stored in this repository.
