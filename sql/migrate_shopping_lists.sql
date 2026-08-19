USE comprasmart;

CREATE TABLE IF NOT EXISTS shopping_lists (
  list_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (list_id),
  KEY idx_shopping_lists_user (user_id),
  CONSTRAINT fk_shopping_lists_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shopping_list_items (
  item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  list_id INT NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  name VARCHAR(500) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  price DECIMAL(12,2) NULL,
  category VARCHAR(255) NULL,
  unit VARCHAR(100) NULL,
  checked TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id),
  KEY idx_shopping_items_list (list_id),
  KEY idx_shopping_items_product (product_id),
  CONSTRAINT fk_shopping_items_list
    FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tabelas de listas de compras criadas com sucesso.' AS status;
