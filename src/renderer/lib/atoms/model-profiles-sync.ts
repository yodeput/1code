import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import { trpc } from "../../lib/trpc"
import {
  localStorageModelProfilesAtom,
} from "./index"
import { OFFLINE_PROFILE, type ModelProfile } from "./model-profile-types"
import { isRemoteMode } from "../remote-transport"

/**
 * Database-synced model profiles atom
 * - Desktop mode: Uses localStorage (fast, offline-capable) and syncs to database
 * - Web mode: Loads from database via tRPC
 */

// Internal atom to track if database sync has been done (desktop only)
const hasSyncedToDatabaseAtom = atom(false)

// Atom to hold database-loaded profiles (for web mode or after sync)
const databaseProfilesAtom = atom<ModelProfile[] | null>(null)

// Helper to convert database profile to ModelProfile
function fromDBProfile(dbProfile: any): ModelProfile {
  return {
    id: dbProfile.id,
    name: dbProfile.name,
    config: typeof dbProfile.config === 'string' ? JSON.parse(dbProfile.config) : dbProfile.config,
    models: typeof dbProfile.models === 'string' ? JSON.parse(dbProfile.models) : dbProfile.models,
    isOffline: dbProfile.isOffline || false,
  }
}

// Helper to convert ModelProfile to database format
// Note: The tRPC router expects objects, Drizzle will handle serialization to JSON for TEXT columns
function toDBProfile(profile: ModelProfile): Omit<ModelProfile, "id"> {
  return {
    name: profile.name,
    config: profile.config,
    models: profile.models || [],
    isOffline: profile.isOffline || false,
  }
}

/**
 * Hook to sync model profiles between localStorage and database
 * - Desktop: Syncs localStorage profiles to database on app start
 * - Web: Loads profiles from database and stores in atom
 */
export function useSyncModelProfiles() {
  const localStorageProfiles = useAtomValue(localStorageModelProfilesAtom)
  const setDatabaseProfiles = useSetAtom(databaseProfilesAtom)
  const [hasSynced, setHasSynced] = useAtom(hasSyncedToDatabaseAtom)
  const isRemote = isRemoteMode()

  const { data: dbProfiles, isLoading: isLoadingDB } = trpc.modelProfiles.list.useQuery(
    undefined,
    {
      enabled: isRemote || !hasSynced, // Always load if remote, or if desktop hasn't synced yet
      staleTime: Infinity, // Don't refetch automatically
    }
  )

  const createMutation = trpc.modelProfiles.create.useMutation()
  const updateMutation = trpc.modelProfiles.update.useMutation()
  const deleteMutation = trpc.modelProfiles.delete.useMutation()

  // Sync desktop localStorage profiles to database (one-time)
  useEffect(() => {
    if (!isRemote && !hasSynced && !isLoadingDB && dbProfiles) {
      const syncToDatabase = async () => {
        try {
          // Get profiles from localStorage, excluding offline profile
          const localProfiles = localStorageProfiles.filter(p => !p.isOffline)

          // For each local profile, check if it exists in database
          for (const localProfile of localProfiles) {
            const existsInDB = dbProfiles.find((db: any) => db.name === localProfile.name)

            if (!existsInDB) {
              // Create new profile in database
              const dbProfile = toDBProfile(localProfile)
              await createMutation.mutateAsync(dbProfile)
              console.log("[ModelProfilesSync] Created profile in DB:", localProfile.name)
            }
            // Note: We don't sync back from database to localStorage to avoid conflicts
            // In the future, we can add proper conflict resolution with timestamps
          }

          setHasSynced(true)
          console.log("[ModelProfilesSync] Sync completed")
        } catch (error) {
          console.error("[ModelProfilesSync] Failed to sync:", error)
        }
      }

      syncToDatabase()
    }
  }, [isRemote, hasSynced, isLoadingDB, dbProfiles, localStorageProfiles, createMutation])

  // In web mode, use database profiles directly
  useEffect(() => {
    if (isRemote && !isLoadingDB && dbProfiles) {
      // Add offline profile to database profiles
      const profiles = [
        OFFLINE_PROFILE,
        ...dbProfiles.map(fromDBProfile),
      ]
      setDatabaseProfiles(profiles)
    }
  }, [isRemote, isLoadingDB, dbProfiles, setDatabaseProfiles])

  return {
    isLoading: isLoadingDB,
    dbProfiles,
    createProfile: createMutation.mutateAsync,
    updateProfile: updateMutation.mutateAsync,
    deleteProfile: deleteMutation.mutateAsync,
  }
}

/**
 * Combined model profiles atom
 * - Desktop: Returns localStorage profiles, writes to localStorage
 * - Web: Returns database profiles, writes are not supported (web mode is read-only)
 */
export const modelProfilesAtom = atom(
  (get) => {
    const isRemote = isRemoteMode()
    const localStorageProfiles = get(localStorageModelProfilesAtom)
    const databaseProfiles = get(databaseProfilesAtom)

    if (isRemote) {
      // In web mode, use database profiles (with offline profile added)
      return databaseProfiles || [OFFLINE_PROFILE]
    }

    // In desktop mode, use localStorage profiles
    return localStorageProfiles
  },
  (get, set, newValue) => {
    const isRemote = isRemoteMode()

    if (isRemote) {
      // In web mode, writes are not supported (read-only)
      // In the future, we could add tRPC mutations to update database
      console.warn("[modelProfilesAtom] Cannot modify profiles in web mode")
      return
    }

    // In desktop mode, write to localStorage
    set(localStorageModelProfilesAtom, newValue)
  }
)
