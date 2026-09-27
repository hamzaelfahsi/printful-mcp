# Printify Manager MCP

Secure Streamable HTTP MCP bridge for the official Printify REST API.

## Render environment
- PRINTIFY_API_TOKEN: Printify Personal Access Token.
- REDIS_URL: existing Render Key Value/Redis connection used for MCP OAuth.
- MCP_BASE_URL: public MCP URL.
- PORT: supplied by Render.

## MCP endpoint
https://printful-mcp-hyfr.onrender.com/mcp

## Main tools
- printify_test_connection
- printify_list_shops
- printify_get_shop
- printify_list_products
- printify_get_product
- printify_list_blueprints
- printify_get_blueprint
- printify_list_print_providers
- printify_list_variants
- printify_list_uploads
- printify_upload_image_url
- printify_upload_image_base64
- printify_create_product
- printify_create_test_product
- printify_update_product
- printify_delete_product
- printify_publish_product
- printify_list_orders
- printify_get_order
- printify_create_order

## Test flow
1. Test Printify connection.
2. List Printify shops.
3. Select a shop.
4. Select a blueprint and print provider.
5. Upload a temporary design.
6. Create a real test product.
7. Verify the returned product.
8. Publish only when explicitly requested.

The API follows Printify's documented shop, catalog, upload, product and publish endpoints.
