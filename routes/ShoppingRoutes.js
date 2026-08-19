import express from "express";

import shoppingListController from "../controllers/ShoppingListController.js";
import marketProductModel from "../models/MarketProductModel.js";
import { authenticationToken } from "../middlewares/authLoginMiddleware.js";

const shoppingRouter = express.Router();

shoppingRouter.use(authenticationToken);

shoppingRouter.get("/products/search", async (req, res) => {
  try {
    const products = await marketProductModel.searchByName(req.query.q, req.query.limit);
    return res.status(200).json(products);
  } catch (error) {
    console.error("Erro ao pesquisar produtos:", error);
    return res.status(503).json({
      error: "Não foi possível consultar o catálogo de mercados.",
    });
  }
});

shoppingRouter.get("/lists", shoppingListController.getLists);
shoppingRouter.post("/lists", shoppingListController.createList);
shoppingRouter.get("/lists/:listId", shoppingListController.getList);
shoppingRouter.delete("/lists/:listId", shoppingListController.deleteList);
shoppingRouter.post("/lists/:listId/items", shoppingListController.addItem);
shoppingRouter.patch("/lists/:listId/items/:itemId", shoppingListController.updateItem);
shoppingRouter.delete("/lists/:listId/items/:itemId", shoppingListController.deleteItem);
shoppingRouter.post("/lists/:listId/compare", shoppingListController.compareList);

export default shoppingRouter;
