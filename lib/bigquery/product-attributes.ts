/**
 * Product Attributes Utility
 * 
 * Provides utilities for extracting custom_attributes from adobe_commerce_products
 * custom_attributes is stored as a JSON string array: [{"attribute_code":"...","value":"..."}, ...]
 * 
 * This utility helps extract specific attributes in a queryable way.
 */

/**
 * Generates SQL to extract a custom attribute value from adobe_commerce_products.custom_attributes
 * 
 * @param tableAlias - The alias of the products table (e.g., 'p')
 * @param attributeCode - The attribute_code to look for (e.g., 'sdb_product_collection_data')
 * @param defaultValue - Default value if attribute is not found (default: 'Unknown')
 * @returns SQL expression that extracts the attribute value
 */
export function extractCustomAttribute(
  tableAlias: string,
  attributeCode: string,
  defaultValue: string = 'Unknown'
): string {
  return `COALESCE((
    SELECT JSON_EXTRACT_SCALAR(attr, '$.value')
    FROM UNNEST(JSON_EXTRACT_ARRAY(SAFE.PARSE_JSON(${tableAlias}.custom_attributes))) as attr
    WHERE JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = '${attributeCode}'
    LIMIT 1
  ), '${defaultValue}')`;
}

/**
 * Generates SQL to extract a nested JSON value from a custom attribute
 * 
 * For attributes like sdb_product_collection_data where the value is a JSON string
 * containing an array with objects that have a 'label' field.
 * 
 * @param tableAlias - The alias of the products table (e.g., 'p')
 * @param attributeCode - The attribute_code to look for (e.g., 'sdb_product_collection_data')
 * @param jsonPath - JSON path to extract (e.g., '$.label' for the label field)
 * @param defaultValue - Default value if attribute is not found (default: 'Unknown')
 * @returns SQL expression that extracts the nested value
 */
export function extractNestedCustomAttribute(
  tableAlias: string,
  attributeCode: string,
  jsonPath: string,
  defaultValue: string = 'Unknown'
): string {
  return `COALESCE((
    SELECT JSON_EXTRACT_SCALAR(collection_item, '${jsonPath}')
    FROM UNNEST(
      COALESCE(
        JSON_EXTRACT_ARRAY(SAFE.PARSE_JSON(${tableAlias}.custom_attributes)),
        []
      )
    ) as attr
    CROSS JOIN UNNEST(
      COALESCE(
        JSON_EXTRACT_ARRAY(
          SAFE.PARSE_JSON(JSON_EXTRACT_SCALAR(attr, '$.value'))
        ),
        []
      )
    ) as collection_item
    WHERE JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = '${attributeCode}'
      AND JSON_EXTRACT_SCALAR(attr, '$.value') IS NOT NULL
      AND JSON_EXTRACT_SCALAR(collection_item, '${jsonPath}') IS NOT NULL
    LIMIT 1
  ), '${defaultValue}')`;
}

/**
 * Generates SQL to extract collection name from sdb_product_collection_data
 * This is a convenience function for the most common use case
 * 
 * @param tableAlias - The alias of the products table (e.g., 'p')
 * @returns SQL expression that extracts the collection label
 */
export function extractCollection(tableAlias: string): string {
  return extractNestedCustomAttribute(
    tableAlias,
    'sdb_product_collection_data',
    '$.label',
    'Unknown'
  );
}

/**
 * Generates a CTE that joins products and extracts common custom attributes
 * This can be used in queries to easily access product attributes
 * 
 * @param datasetId - BigQuery dataset ID
 * @param projectId - BigQuery project ID
 * @param orderTableAlias - Alias for the orders table (e.g., 'o')
 * @param itemTableAlias - Alias for the items table (e.g., 'item')
 * @param productTableAlias - Alias for the products table (e.g., 'p')
 * @returns SQL CTE string
 */
export function getProductAttributesCTE(
  datasetId: string,
  projectId: string,
  orderTableAlias: string = 'o',
  itemTableAlias: string = 'item',
  productTableAlias: string = 'p'
): string {
  return `
    product_attributes AS (
      SELECT 
        ${itemTableAlias}.order_id,
        ${itemTableAlias}.product_id,
        ${itemTableAlias}.qty_ordered,
        ${itemTableAlias}.sku,
        ${extractCollection(productTableAlias)} as collection,
        ${extractCustomAttribute(productTableAlias, 'sdb_collection_name', 'Unknown')} as collection_name,
        ${extractCustomAttribute(productTableAlias, 'sdb_design_name', 'Unknown')} as design_name,
        ${extractCustomAttribute(productTableAlias, 'sdb_parent_title', 'Unknown')} as parent_title
      FROM \`${projectId}.${datasetId}.mv_adobe_commerce_sales_items\` ${itemTableAlias}
      LEFT JOIN \`${projectId}.${datasetId}.adobe_commerce_products\` ${productTableAlias}
        ON ${itemTableAlias}.sku = ${productTableAlias}.sku
      WHERE ${productTableAlias}.custom_attributes IS NOT NULL
    )
  `;
}

