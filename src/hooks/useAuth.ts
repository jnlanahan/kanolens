import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { api, type ApiUser } from "@/lib/api";

const AUTH_QUERY_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => (await api.me()).user,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });
}

/**
 * In development, when no user is signed in, silently log in as a dev user
 * so the wizard is immediately usable without configuring Google OAuth.
 * Safe in production because /api/auth/dev returns 403 there.
 */
export function useAutoDevLogin(enabled: boolean): {
  loading: boolean;
  user: ApiUser | null | undefined;
} {
  const queryClient = useQueryClient();
  const me = useCurrentUser();

  useEffect(() => {
    if (!enabled) return;
    if (me.isLoading || me.isFetching) return;
    if (me.data) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.devLogin();
        if (!cancelled) {
          queryClient.setQueryData(AUTH_QUERY_KEY, res.user);
        }
      } catch {
        // 403 in production or network error — leave user null
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, me.data, me.isLoading, me.isFetching, queryClient]);

  return { loading: me.isLoading, user: me.data };
}
