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
   * Get default profile
   */
  getDefault: publicProcedure.query(() => {
    const db = getDatabase()

    const profile = db
      .select()
      .from(proxyProfiles)
      .where(eq(proxyProfiles.isDefault, true))
      .get()

    if (!profile) {
      return null
    }

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
