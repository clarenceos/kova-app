import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/http";

const rawToken = process.env.TURSO_AUTH_TOKEN!
const authToken = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken,
});

export const db = drizzle(client);
