# Printful MCP Bridge

Secure Streamable HTTP MCP bridge for the stable Printful REST API.

## Environment
- PRINTFUL_API_KEY: private Printful token, stored only in Render environment settings.
- PRINTFUL_STORE_ID: optional default store ID for account-level tokens.
- PORT: supplied by Render.

## MCP endpoint
https://YOUR-SERVICE.onrender.com/mcp

## Canonical tool names

### Connection / integration
- printful_test_connection
- printful_list_stores
- printful_get_store
- printful_get_webhook_config
- printful_set_webhook_config
- printful_disable_webhooks

### Catalog / files
- printful_list_catalog_products
- printful_get_catalog_product
- printful_get_catalog_variant
- printful_get_product_printfiles
- printful_list_product_templates
- printful_list_files
- printful_get_file
- printful_create_file_from_url

### Mockups
- printful_create_mockup_task
- printful_get_mockup_task

### Store creation / publication
- printful_list_store_products
- printful_get_store_product
- printful_create_store_product
- printful_publish_store_product
- printful_update_store_product
- printful_delete_store_product

### Store variants
- printful_get_store_variant
- printful_create_store_variant
- printful_update_store_variant
- printful_delete_store_variant

### Orders
- printful_list_orders
- printful_get_order

## Product publishing flow
1. Test the connection.
2. List stores and select the target store ID.
3. Select a Catalog Product and Catalog Variants.
4. Retrieve print-file mappings.
5. Import the design file.
6. Create and poll mockups.
7. Build complete sync_product + sync_variants payloads.
8. Call printful_publish_store_product (POST /store/products).
9. Verify the returned product with printful_get_store_product.
10. Optionally configure webhooks for downstream automation.

For Manual/API stores, Printful documents POST /store/products as the create Sync Product operation. Ecommerce-platform integrations such as Shopify/WooCommerce use Printful's Sync API and must be connected separately.

The bridge never prints or returns the API token and never reports a mutation as successful without a Printful API response.
