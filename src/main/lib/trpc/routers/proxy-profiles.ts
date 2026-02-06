import { eq } from "drizzle-orm"
import { z } from "zod"
import { getDatabase, proxyProfiles } from "../../db"
import { createId } from "../../db/utils"
import { encryptString, decryptString } from "../../db/encryption"
import { publicProcedure, router } from "../index"

/**
 * Proxy Profiles router
 * Manages custom model provider configurations (GLM, OpenRouter, etc.)
 */
export const proxyProfilesRouter = router({
  /**
   * List all proxy profiles (without decrypted keys)
   */
  list: publicProcedure.query(() => {
    const db = getDatabase()

    const profiles = db
      .select({
        id: proxyProfiles.id,
        name: proxyProfiles.name,
        baseUrl: proxyProfiles.baseUrl,
        models: proxyProfiles.models,
        isDefault: proxyProfiles.isDefault,
        createdAt: proxyProfiles.createdAt,
        updatedAt: proxyProfiles.updatedAt,
      })
      .from(proxyProfiles)
      .orderBy(proxyProfiles.createdAt)
      .all()

    return profiles.map((profile) => ({
      ...profile,
      models: JSON.parse(profile.models) as string[],
      createdAt: profile.createdAt?.toISOString() ?? null,
      updatedAt: profile.updatedAt?.toISOString() ?? null,
    }))
  }),

  /**
   * Get single profile by ID (without decrypted key)
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()

      const profile = db
        .select({
          id: proxyProfiles.id,
          name: proxyProfiles.name,
          baseUrl: proxyProfiles.baseUrl,
          models: proxyProfiles.models,
          isDefault: proxyProfiles.isDefault,
          createdAt: proxyProfiles.createdAt,
        })
        .from(proxyProfiles)
        .where(eq(proxyProfiles.id, input.id))
        .get()

      if (!profile) {
        throw new Error("Profile not found")
      }

      return {
        ...profile,
        models: JSON.parse(profile.models) as string[],
        createdAt: profile.createdAt?.toISOString() ?? null,
      }
    }),

  /**
   * Create new proxy profile
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        baseUrl: z.string().url(),
        apiKey: z.string().min(1),
        models: z.array(z.string()).min(1),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) => {
      const db = getDatabase()
      const newId = createId()

      // Check if profile with same name already exists
      const existing = db
        .select()
        .from(proxyProfiles)
        .where(eq(proxyProfiles.name, input.name.trim()))
        .get()

      if (existing) {
        throw new Error(`Profile "${input.name}" already exists. Please use a different name.`)
      }

      const encryptedKey = encryptString(input.apiKey)

      // If setting as default, clear other defaults
      if (input.isDefault) {
        db.update(proxyProfiles).set({ isDefault: false }).run()
      }

      db.insert(proxyProfiles)
        .values({
          id: newId,
          name: input.name,
          baseUrl: input.baseUrl,
          apiKeyEncrypted: encryptedKey,
          models: JSON.stringify(input.models),
          isDefault: input.isDefault ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run()

      console.log(`[ProxyProfiles] Created profile: ${newId}`)
      return { id: newId, success: true }
    }),

  /**
   * Update existing profile
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        baseUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
        models: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ input }) => {
      const db = getDatabase()

      // Check if name conflicts with another profile
      if (input.name !== undefined) {
        const existing = db
          .select()
          .from(proxyProfiles)
          .where(eq(proxyProfiles.name, input.name.trim()))
          .get()

        if (existing && existing.id !== input.id) {
          throw new Error(`Profile "${input.name}" already exists. Please use a different name.`)
        }
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (input.name !== undefined) updateData.name = input.name
      if (input.baseUrl !== undefined) updateData.baseUrl = input.baseUrl
      if (input.apiKey !== undefined) {
        updateData.apiKeyEncrypted = encryptString(input.apiKey)
      }
      if (input.models !== undefined) {
        updateData.models = JSON.stringify(input.models)
      }

      const result = db
        .update(proxyProfiles)
        .set(updateData)
        .where(eq(proxyProfiles.id, input.id))
        .run()

      if (result.changes === 0) {
        throw new Error("Profile not found")
      }

      console.log(`[ProxyProfiles] Updated profile: ${input.id}`)
      return { success: true }
    }),

  /**
   * Delete profile
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      // Foreign key on sub_chats is set to "set null" so deletion is safe
      db.delete(proxyProfiles).where(eq(proxyProfiles.id, input.id)).run()

      console.log(`[ProxyProfiles] Deleted profile: ${input.id}`)
      return { success: true }
    }),

  /**
   * Set profile as default
   */
  setDefault: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      // Clear all defaults
      db.update(proxyProfiles).set({ isDefault: false }).run()

      // Set new default
      const result = db
        .update(proxyProfiles)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(proxyProfiles.id, input.id))
        .run()

      if (result.changes === 0) {
        throw new Error("Profile not found")
      }

      console.log(`[ProxyProfiles] Set default: ${input.id}`)
      return { success: true }
    }),

  /**
   * Get decrypted API key (internal use for SDK)
   */
  getDecryptedKey: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()

      const profile = db
        .select()
        .from(proxyProfiles)
        .where(eq(proxyProfiles.id, input.id))
        .get()

      if (!profile) {
        return { key: null, error: "Profile not found" }
      }

      try {
        const key = decryptString(profile.apiKeyEncrypted)
        return { key, error: null }
      } catch (error) {
        console.error("[ProxyProfiles] Decrypt error:", error)
        return { key: null, error: "Failed to decrypt key" }
      }
    }),

  /**
   * Test connection to a proxy endpoint
   */
  testConnection: publicProcedure
    .input(
      z.object({
        baseUrl: z.string().url(),
        apiKey: z.string().min(1),
        model: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(`${input.baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": input.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: input.model,
            max_tokens: 1,
            messages: [{ role: "user", content: "test" }],
          }),
        })

        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            message: "Connection successful",
            model: data.model || input.model,
          }
        }

        const errorText = await response.text().catch(() => "Unknown error")
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
          details: errorText,
        }
      } catch (error) {
        return {
          success: false,
          message: "Connection failed",
          details: error instanceof Error ? error.message : String(error),
        }
      }
    }),

  /**
   * Get default profile
   * Safeguards against multiple defaults by returning only the first and cleaning up extras
   */
  getDefault: publicProcedure.query(() => {
    const db = getDatabase()

    const profiles = db
      .select()
      .from(proxyProfiles)
      .where(eq(proxyProfiles.isDefault, true))
      .all()

    if (profiles.length === 0) {
      return null
    }

    // If multiple defaults exist, keep only the first one (most recently created)
    if (profiles.length > 1) {
      console.warn(`[ProxyProfiles] Found ${profiles.length} default profiles, cleaning up extras`)
      const [keepProfile, ...extras] = profiles.sort((a, b) =>
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      )

      // Clear isDefault on all extras
      for (const extra of extras) {
        db.update(proxyProfiles)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(proxyProfiles.id, extra.id))
          .run()
      }

      console.log(`[ProxyProfiles] Kept default: ${keepProfile.id}, cleared ${extras.length} extras`)
    }

    const profile = profiles[0]

    return {
      id: profile.id,
      name: profile.name,
      baseUrl: profile.baseUrl,
      models: JSON.parse(profile.models) as string[],
      isDefault: profile.isDefault,
      createdAt: profile.createdAt?.toISOString() ?? null,
      updatedAt: profile.updatedAt?.toISOString() ?? null,
    }
  }),
})
