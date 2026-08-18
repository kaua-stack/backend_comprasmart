-- Migração idempotente do schema usado por cadastro, login e refresh token.
-- Execute este arquivo no mesmo banco definido por DB_NAME.

CREATE TABLE IF NOT EXISTS roles (
  role_id INT NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  PRIMARY KEY (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (role_name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'admin');

INSERT INTO roles (role_name)
SELECT 'user'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'user');

INSERT INTO roles (role_name)
SELECT 'moderador'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'moderador');

CREATE TABLE IF NOT EXISTS users (
  user_id INT NOT NULL AUTO_INCREMENT,
  user_name VARCHAR(150) NOT NULL,
  user_email VARCHAR(255) NOT NULL UNIQUE,
  user_password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL DEFAULT 1,
  user_status TINYINT NOT NULL DEFAULT 1,
  user_google_id VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_users_email (user_email),
  KEY idx_users_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db_name = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @db_name AND table_name = 'users' AND column_name = 'role_id'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN role_id INT NOT NULL DEFAULT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @db_name AND table_name = 'users' AND column_name = 'user_status'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN user_status TINYINT NOT NULL DEFAULT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @db_name AND table_name = 'users' AND column_name = 'user_google_id'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN user_google_id VARCHAR(255) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @db_name AND table_name = 'users' AND column_name = 'created_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @db_name AND table_name = 'users' AND column_name = 'updated_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @user_role_id = (
  SELECT role_id FROM roles WHERE role_name = 'user' LIMIT 1
);
SET @sql = IF(
  @user_role_id IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE users ALTER COLUMN role_id SET DEFAULT ', @user_role_id)
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = @db_name AND table_name = 'tokens'
  ),
  'SELECT 1',
  'CREATE TABLE tokens (token_id INT NOT NULL AUTO_INCREMENT, user_id INT NOT NULL, token VARCHAR(512) NOT NULL, expires_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (token_id), UNIQUE KEY uq_tokens_token (token), KEY idx_tokens_user (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- A FK pode ser adicionada manualmente se o banco legado já tiver dados incompatíveis.
