import pool from "../db/database.js";

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapItem(row) {
  return {
    _id: String(row.item_id),
    id: String(row.item_id),
    listId: Number(row.list_id),
    productId: row.product_id === null ? null : Number(row.product_id),
    name: row.name,
    quantity: Number(row.quantity),
    price: row.price === null ? 0 : numeric(row.price),
    category: row.category || null,
    unit: row.unit || null,
    checked: Boolean(row.checked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapList(row, items = []) {
  return {
    _id: String(row.list_id),
    id: Number(row.list_id),
    userId: Number(row.user_id),
    name: row.name,
    budget: numeric(row.budget),
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class ShoppingListModel {
  async selectListsByUser(userId) {
    const [lists] = await pool.execute(
      `SELECT list_id, user_id, name, budget, created_at, updated_at
       FROM shopping_lists
       WHERE user_id = ?
       ORDER BY updated_at DESC, list_id DESC`,
      [userId],
    );

    if (lists.length === 0) return [];

    const listIds = lists.map((list) => list.list_id);
    const placeholders = listIds.map(() => "?").join(",");
    const [items] = await pool.execute(
      `SELECT item_id, list_id, product_id, name, quantity, price,
              category, unit, checked, created_at, updated_at
       FROM shopping_list_items
       WHERE list_id IN (${placeholders})
       ORDER BY item_id ASC`,
      listIds,
    );

    const itemsByList = new Map();
    for (const item of items) {
      const key = Number(item.list_id);
      const current = itemsByList.get(key) || [];
      current.push(mapItem(item));
      itemsByList.set(key, current);
    }

    return lists.map((list) => mapList(list, itemsByList.get(Number(list.list_id)) || []));
  }

  async selectListById(userId, listId) {
    const [lists] = await pool.execute(
      `SELECT list_id, user_id, name, budget, created_at, updated_at
       FROM shopping_lists
       WHERE list_id = ? AND user_id = ?
       LIMIT 1`,
      [listId, userId],
    );

    if (lists.length === 0) return null;

    const [items] = await pool.execute(
      `SELECT item_id, list_id, product_id, name, quantity, price,
              category, unit, checked, created_at, updated_at
       FROM shopping_list_items
       WHERE list_id = ?
       ORDER BY item_id ASC`,
      [listId],
    );

    return mapList(lists[0], items.map(mapItem));
  }

  async createList(userId, { name, budget = 0 }) {
    const [result] = await pool.execute(
      `INSERT INTO shopping_lists (user_id, name, budget)
       VALUES (?, ?, ?)`,
      [userId, name, numeric(budget)],
    );

    return this.selectListById(userId, result.insertId);
  }

  async deleteList(userId, listId) {
    const [result] = await pool.execute(
      "DELETE FROM shopping_lists WHERE list_id = ? AND user_id = ?",
      [listId, userId],
    );
    return result.affectedRows === 1;
  }

  async findItem(listId, itemId) {
    const [rows] = await pool.execute(
      `SELECT item_id, list_id, product_id, name, quantity, price,
              category, unit, checked, created_at, updated_at
       FROM shopping_list_items
       WHERE list_id = ? AND item_id = ?
       LIMIT 1`,
      [listId, itemId],
    );
    return rows[0] ? mapItem(rows[0]) : null;
  }

  async findExistingItem(listId, { productId = null, name }) {
    const query = productId !== null && productId !== undefined
      ? `SELECT item_id
         FROM shopping_list_items
         WHERE list_id = ? AND product_id = ?
         LIMIT 1`
      : `SELECT item_id
         FROM shopping_list_items
         WHERE list_id = ? AND product_id IS NULL AND LOWER(name) = LOWER(?)
         LIMIT 1`;
    const params = productId !== null && productId !== undefined
      ? [listId, productId]
      : [listId, name];
    const [rows] = await pool.execute(query, params);
    return rows[0]?.item_id || null;
  }

  async insertItem(listId, { productId = null, name, quantity, price = null, category = null, unit = null }) {
    const [result] = await pool.execute(
      `INSERT INTO shopping_list_items
        (list_id, product_id, name, quantity, price, category, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [listId, productId, name, quantity, price, category, unit],
    );
    return result.insertId;
  }

  async incrementItem(itemId, quantity) {
    await pool.execute(
      `UPDATE shopping_list_items
       SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
       WHERE item_id = ?`,
      [quantity, itemId],
    );
  }

  async updateItem(itemId, fields) {
    const assignments = [];
    const values = [];
    for (const [field, value] of Object.entries(fields)) {
      assignments.push(`${field} = ?`);
      values.push(value);
    }
    if (assignments.length === 0) return;
    assignments.push("updated_at = CURRENT_TIMESTAMP");
    values.push(itemId);
    await pool.execute(
      `UPDATE shopping_list_items SET ${assignments.join(", ")} WHERE item_id = ?`,
      values,
    );
  }

  async deleteItem(listId, itemId) {
    const [result] = await pool.execute(
      `DELETE sli FROM shopping_list_items sli
       INNER JOIN shopping_lists sl ON sl.list_id = sli.list_id
       WHERE sli.list_id = ? AND sli.item_id = ?`,
      [listId, itemId],
    );
    return result.affectedRows === 1;
  }
}

export { mapItem, mapList };
export default new ShoppingListModel();
