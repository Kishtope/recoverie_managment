import "dotenv/config";
import { defineConfig } from "prisma/config";

// Builds the CLI connection URL from the DB_* vars in .env (password is URL-encoded because it may contain "@").
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const url = `mysql://${DB_USER}:${encodeURIComponent(DB_PASSWORD ?? "")}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
});
