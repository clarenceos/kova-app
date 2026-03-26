import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/http";

const rawToken = process.env.TURSO_AUTH_TOKEN!
const authToken = rawToken.replace(/^Bearer\s+/i, '').trim()

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken,
});

export const db = drizzle(client);
