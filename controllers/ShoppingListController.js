import shoppingListModel from "../models/ShoppingListModel.js";
import marketProductModel, { MARKET_NAMES } from "../models/MarketProductModel.js";

const KNOWN_MARKETS = Object.keys(MARKET_NAMES);

function userIdFromRequest(req) {
  return Number(req.user?.id);
}

function asPositiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 9999);
}

function asListId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function asProductId(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function asPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function marketLabel(source) {
  return MARKET_NAMES[source] || source;
}

async function loadOwnedList(req, res) {
  const userId = userIdFromRequest(req);
  const listId = asListId(req.params.listId);
  if (!userId || !listId) {
    res.status(400).json({ error: "Identificador de lista inválido" });
    return null;
  }

  const list = await shoppingListModel.selectListById(userId, listId);
  if (!list) {
    res.status(404).json({ error: "Lista não encontrada" });
    return null;
  }
  return list;
}

function normalizeRequestedMarkets(markets) {
  if (!Array.isArray(markets) || markets.length === 0) return null;
  return new Set(
    markets
      .map((market) => String(market).trim().toLowerCase())
      .filter((market) => KNOWN_MARKETS.includes(market)),
  );
}

function chooseBestProduct(products) {
  return products
    .filter((product) => product.effectivePrice !== null)
    .sort((first, second) => {
      const firstExact = first.name.toLowerCase() === first.requestedName?.toLowerCase();
      const secondExact = second.name.toLowerCase() === second.requestedName?.toLowerCase();
      if (firstExact !== secondExact) return firstExact ? -1 : 1;
      return first.effectivePrice - second.effectivePrice;
    })[0] || null;
}

class ShoppingListController {
  async getLists(req, res) {
    try {
      const lists = await shoppingListModel.selectListsByUser(userIdFromRequest(req));
      return res.status(200).json(lists);
    } catch (error) {
      console.error("Erro ao buscar listas:", error);
      return res.status(500).json({ error: "Erro ao buscar listas" });
    }
  }

  async getList(req, res) {
    try {
      const list = await loadOwnedList(req, res);
      return list ? res.status(200).json(list) : undefined;
    } catch (error) {
      console.error("Erro ao buscar lista:", error);
      return res.status(500).json({ error: "Erro ao buscar lista" });
    }
  }

  async createList(req, res) {
    try {
      const name = String(req.body?.name || "").trim();
      if (!name) return res.status(400).json({ error: "O nome da lista é obrigatório" });
      if (name.length > 150) return res.status(400).json({ error: "O nome da lista é muito longo" });

      const budget = asPrice(req.body?.budget) ?? 0;
      const list = await shoppingListModel.createList(userIdFromRequest(req), { name, budget });
      return res.status(201).json(list);
    } catch (error) {
      console.error("Erro ao criar lista:", error);
      return res.status(500).json({ error: "Erro ao criar lista" });
    }
  }

  async deleteList(req, res) {
    try {
      const userId = userIdFromRequest(req);
      const listId = asListId(req.params.listId);
      if (!listId) return res.status(400).json({ error: "Identificador de lista inválido" });

      const deleted = await shoppingListModel.deleteList(userId, listId);
      if (!deleted) return res.status(404).json({ error: "Lista não encontrada" });
      return res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir lista:", error);
      return res.status(500).json({ error: "Erro ao excluir lista" });
    }
  }

  async addItem(req, res) {
    try {
      const list = await loadOwnedList(req, res);
      if (!list) return undefined;

      const name = String(req.body?.name || "").trim();
      if (!name) return res.status(400).json({ error: "O nome do produto é obrigatório" });

      const quantity = asPositiveInteger(req.body?.quantity, 1);
      const productId = asProductId(req.body?.productId);
      const fallbackPrice = asPrice(req.body?.price);
      let product = null;

      if (productId !== null) {
        product = await marketProductModel.findById(productId);
        if (!product) return res.status(422).json({ error: "Produto do catálogo não encontrado ou indisponível" });
      }

      const item = {
        productId: product?.id ?? productId,
        name: product?.name || name,
        quantity,
        price: product?.effectivePrice ?? fallbackPrice,
        category: product?.category || req.body?.category || null,
        unit: product?.unit || req.body?.unit || null,
      };

      const existingItemId = await shoppingListModel.findExistingItem(list.id, item);
      if (existingItemId) {
        await shoppingListModel.incrementItem(existingItemId, quantity);
      } else {
        await shoppingListModel.insertItem(list.id, item);
      }

      const updatedList = await shoppingListModel.selectListById(userIdFromRequest(req), list.id);
      return res.status(201).json(updatedList);
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      return res.status(500).json({ error: "Erro ao adicionar item" });
    }
  }

  async updateItem(req, res) {
    try {
      const list = await loadOwnedList(req, res);
      if (!list) return undefined;

      const itemId = asListId(req.params.itemId);
      if (!itemId) return res.status(400).json({ error: "Identificador de item inválido" });
      const item = await shoppingListModel.findItem(list.id, itemId);
      if (!item) return res.status(404).json({ error: "Item não encontrado" });

      if (req.body?.quantity !== undefined) {
        const quantity = asPositiveInteger(req.body.quantity, 0);
        if (quantity < 1) return res.status(400).json({ error: "A quantidade deve ser maior que zero" });
        await shoppingListModel.updateItem(itemId, { quantity });
      } else {
        await shoppingListModel.updateItem(itemId, { checked: item.checked ? 0 : 1 });
      }

      const updatedList = await shoppingListModel.selectListById(userIdFromRequest(req), list.id);
      return res.status(200).json(updatedList);
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      return res.status(500).json({ error: "Erro ao atualizar item" });
    }
  }

  async deleteItem(req, res) {
    try {
      const list = await loadOwnedList(req, res);
      if (!list) return undefined;

      const itemId = asListId(req.params.itemId);
      if (!itemId) return res.status(400).json({ error: "Identificador de item inválido" });
      const deleted = await shoppingListModel.deleteItem(list.id, itemId);
      if (!deleted) return res.status(404).json({ error: "Item não encontrado" });

      const updatedList = await shoppingListModel.selectListById(userIdFromRequest(req), list.id);
      return res.status(200).json(updatedList);
    } catch (error) {
      console.error("Erro ao remover item:", error);
      return res.status(500).json({ error: "Erro ao remover item" });
    }
  }

  async compareList(req, res) {
    try {
      const list = await loadOwnedList(req, res);
      if (!list) return undefined;

      const requestedMarkets = normalizeRequestedMarkets(req.body?.markets);
      const marketData = new Map();
      const availableSources = new Set();

      for (const item of list.items) {
        const candidates = await marketProductModel.findCandidates({
          productId: item.productId,
          name: item.name,
        });
        const candidatesBySource = new Map();

        for (const candidate of candidates) {
          if (candidate.effectivePrice === null) continue;
          availableSources.add(candidate.source);
          const sourceCandidates = candidatesBySource.get(candidate.source) || [];
          sourceCandidates.push({ ...candidate, requestedName: item.name });
          candidatesBySource.set(candidate.source, sourceCandidates);
        }

        const sources = requestedMarkets
          ? [...requestedMarkets]
          : [...candidatesBySource.keys()];

        for (const source of sources) {
          const bestProduct = chooseBestProduct(candidatesBySource.get(source) || []);
          const market = marketData.get(source) || {
            source,
            market: marketLabel(source),
            total: 0,
            matchedItems: 0,
            missingItems: 0,
            items: [],
          };

          if (bestProduct) {
            const subtotal = bestProduct.effectivePrice * item.quantity;
            market.total += subtotal;
            market.matchedItems += 1;
            market.items.push({
              itemId: item.id,
              productId: bestProduct.id,
              productName: bestProduct.name,
              listName: item.name,
              quantity: item.quantity,
              unitPrice: bestProduct.effectivePrice,
              subtotal,
              available: true,
              productUrl: bestProduct.productUrl,
              imageUrl: bestProduct.imageUrl,
            });
          } else {
            market.missingItems += 1;
            market.items.push({
              itemId: item.id,
              productId: null,
              productName: null,
              listName: item.name,
              quantity: item.quantity,
              unitPrice: null,
              subtotal: null,
              available: false,
              productUrl: null,
              imageUrl: null,
            });
          }
          marketData.set(source, market);
        }
      }

      const marketTotals = [...marketData.values()]
        .map((market) => ({
          ...market,
          total: Number(market.total.toFixed(2)),
          coverage: list.items.length === 0
            ? 100
            : Number(((market.matchedItems / list.items.length) * 100).toFixed(1)),
          complete: market.missingItems === 0,
        }))
        .sort((first, second) => {
          if (first.complete !== second.complete) return first.complete ? -1 : 1;
          return first.total - second.total;
        });

      return res.status(200).json({
        listId: list.id,
        listName: list.name,
        generatedAt: new Date().toISOString(),
        availableMarkets: [...availableSources].map((source) => ({ source, market: marketLabel(source) })),
        marketTotals,
        cheapestMarket: marketTotals.find((market) => market.complete) || marketTotals[0] || null,
      });
    } catch (error) {
      console.error("Erro ao comparar lista:", error);
      return res.status(503).json({
        error: "Não foi possível consultar os preços dos mercados. Verifique a conexão com o banco do scraper.",
      });
    }
  }
}

export default new ShoppingListController();
