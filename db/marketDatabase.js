import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const marketPool = mysql.createPool({
  host: process.env.MARKET_DB_HOST || process.env.DB_HOST,
  port: Number(process.env.MARKET_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.MARKET_DB_USER || process.env.DB_USER,
  password: process.env.MARKET_DB_PASSWORD ?? process.env.DB_PASSWORD,
  database: process.env.MARKET_DB_NAME || "mercado_scraper",
  waitForConnections: true,
  connectionLimit: Number(process.env.MARKET_DB_CONNECTION_LIMIT || 5),
  queueLimit: 0,
});

export default marketPool;
