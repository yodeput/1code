import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { createId } from "../utils"

// ============ PROXY PROFILES ============
// Stores custom model provider configurations (GLM, OpenRouter, etc.)
// Each profile has a base URL, encrypted API key, and multiple models
export const proxyProfiles = sqliteTable("proxy_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(), // "GLM", "OpenRouter" - unique per profile
  baseUrl: text("base_url").notNull(), // "https://api.example.com"
  apiKeyEncrypted: text("api_key_encrypted").notNull(), // Encrypted with safeStorage
  models: text("models").notNull(), // JSON array: ["glm-4.7", "glm-4.5"]
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
})

// ============ TYPE EXPORTS ============
export type ProxyProfile = typeof proxyProfiles.$inferSelect
export type NewProxyProfile = typeof proxyProfiles.$inferInsert
