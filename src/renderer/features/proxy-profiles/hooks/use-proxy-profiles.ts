import { trpc } from "../../../lib/trpc"

/**
 * Hook for proxy profiles list with auto-refetch
 */
export function useProxyProfiles() {
  return trpc.proxyProfiles.list.useQuery(undefined, {
    refetchOnMount: true,
    staleTime: 0,
  })
}

/**
 * Hook for getting default profile
 */
export function useDefaultProxyProfile() {
  return trpc.proxyProfiles.getDefault.useQuery()
}

/**
 * Hook for creating proxy profile
 */
export function useCreateProxyProfile() {
  const trpcUtils = trpc.useUtils()

  return trpc.proxyProfiles.create.useMutation({
    onSuccess: () => {
      trpcUtils.proxyProfiles.list.invalidate()
      trpcUtils.proxyProfiles.getDefault.invalidate()
    },
  })
}

/**
 * Hook for updating proxy profile
 */
export function useUpdateProxyProfile() {
  const trpcUtils = trpc.useUtils()

  return trpc.proxyProfiles.update.useMutation({
    onSuccess: () => {
      trpcUtils.proxyProfiles.list.invalidate()
    },
  })
}

/**
 * Hook for deleting proxy profile
 */
export function useDeleteProxyProfile() {
  const trpcUtils = trpc.useUtils()

  return trpc.proxyProfiles.delete.useMutation({
    onSuccess: () => {
      trpcUtils.proxyProfiles.list.invalidate()
      trpcUtils.proxyProfiles.getDefault.invalidate()
    },
  })
}

/**
 * Hook for setting default profile
 */
export function useSetDefaultProfile() {
  const trpcUtils = trpc.useUtils()

  return trpc.proxyProfiles.setDefault.useMutation({
    onSuccess: () => {
      trpcUtils.proxyProfiles.list.invalidate()
      trpcUtils.proxyProfiles.getDefault.invalidate()
    },
  })
}
