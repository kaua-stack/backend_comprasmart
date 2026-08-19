import marketPool from "../db/marketDatabase.js";

const MARKET_NAMES = {
  nagumo: "Nagumo",
  coop: "Coop",
  sonda: "Sonda",
  joanin: "Joanin",
  carrefour: "Carrefour",
  assai: "Assaí",
  superabc: "Super ABC",
};

function numeric(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapProduct(row) {
  const price = numeric(row.price);
  const promotionalPrice = numeric(row.promotional_price);
  const effectivePrice = promotionalPrice !== null ? promotionalPrice : price;

  return {
    id: Number(row.id),
    source: row.source,
    market: MARKET_NAMES[row.source] || row.source,
    name: row.name,
    brand: row.brand || null,
    category: row.category || null,
    unit: row.unit || null,
    price,
    promotionalPrice,
    effectivePrice,
    available: Boolean(row.available),
    imageUrl: row.image_url || null,
    productUrl: row.product_url || null,
    collectedAt: row.collected_at,
  };
}

const PRODUCT_FIELDS = `
  id, source, name, brand, category, unit, price,
  promotional_price, available, image_url, product_url, collected_at
`;

class MarketProductModel {
  async searchByName(query, limit = 12) {
    const normalizedQuery = String(query || "").trim();
    if (normalizedQuery.length < 2) return [];

    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const pattern = `%${normalizedQuery}%`;
    const [rows] = await marketPool.execute(
      `SELECT ${PRODUCT_FIELDS}
       FROM products
       WHERE available = 1
         AND LOWER(name) LIKE LOWER(?)
       ORDER BY
         (LOWER(name) = LOWER(?)) DESC,
         (promotional_price IS NOT NULL) DESC,
         name ASC
       LIMIT ${safeLimit}`,
      [pattern, normalizedQuery],
    );

    return rows.map(mapProduct);
  }

  async findById(productId) {
    const [rows] = await marketPool.execute(
      `SELECT ${PRODUCT_FIELDS}
       FROM products
       WHERE id = ? AND available = 1
       LIMIT 1`,
      [productId],
    );
    return rows[0] ? mapProduct(rows[0]) : null;
  }

  async findCandidates({ productId = null, name }) {
    let normalizedName = String(name || "").trim();

    if (productId !== null && productId !== undefined) {
      const selectedProduct = await this.findById(productId);
      if (!selectedProduct) return [];
      normalizedName = selectedProduct.name;
    }

    if (!normalizedName) return [];

    const pattern = `%${normalizedName}%`;
    const [rows] = await marketPool.execute(
      `SELECT ${PRODUCT_FIELDS}
       FROM products
       WHERE available = 1
         AND LOWER(name) LIKE LOWER(?)
       ORDER BY
         (LOWER(name) = LOWER(?)) DESC,
         (promotional_price IS NOT NULL) DESC,
         collected_at DESC,
         name ASC
       LIMIT 100`,
      [pattern, normalizedName],
    );
    return rows.map(mapProduct);
  }
}

export { MARKET_NAMES, mapProduct };
export default new MarketProductModel();
