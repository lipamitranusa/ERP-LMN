import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLembaga } from "@/contexts/LembagaContext";

/**
 * useQuery wrapper — auto-attaches auth token via centralized api().
 * @param {string} key - queryKey (array or string)
 * @param {string} path - API path (e.g. "/admin/dashboard")
 * @param {object} options - React Query options (enabled, onSuccess, etc.)
 */
export function useApi(key, path, options = {}) {
  const { lembagaId } = useLembaga();
  const query = useQuery({
    queryKey: [...(Array.isArray(key) ? key : [key]), lembagaId || "global"],
    queryFn: () => api(path),
    enabled: options.enabled !== false && Boolean(path),
    ...options,
  });

  // React Query v4: `isLoading` = status "loading", yang juga true untuk query
  // yang disabled dan belum pernah fetch — sehingga halaman menampilkan
  // spinner permanen. `isInitialLoading` (= isLoading && isFetching) hanya
  // true saat data benar-benar sedang dimuat.
  return { ...query, isLoading: query.isInitialLoading };
}

/**
 * useMutation wrapper — auto-attaches auth token via centralized api().
 * @param {object} options - { onSuccess, onError, etc. }
 */
export function useMutate(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = "POST", body }) =>
      api(path, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries();
      options.onSuccess?.(data, vars, ctx);
    },
    onError: options.onError,
  });
}

/**
 * useMutateWith invalidation — invalidate specific query keys.
 * @param {string|string[]|Array<string[]|string>} invalidateKeys
 *   - string ("foo")        → invalidate prefix ["foo"]
 *   - string[] (["foo","bar"]) → invalidate prefix ["foo","bar"] (single compound key)
 *   - string[][] ([["foo"],["bar"]]) → invalidate BOTH prefixes separately (first elem being
 *                                      an array signals "multiple separate keys" instead of
 *                                      one compound prefix)
 *
 * PENTING: bentuk datar ["foo","bar"] BUKAN berarti dua key terpisah — itu satu
 * key gabungan "foo" lalu "bar". Karena useApi menambah scope lembaga di akhir
 * key, prefix gabungan seperti itu tidak akan cocok dengan query yang
 * terdaftar (["foo", filter, lemmaId]) sehingga invalidate diam-diam tidak
 * berlaku dan UI tetap menampilkan data lama. Untuk membatalkan beberapa
 * key terpisah, WAJIB pakai bentuk array-of-array: [["foo"], ["bar"]].
 */
export function useMutateKeys(invalidateKeys, options = {}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ path, method = "POST", body }) =>
      api(path, { method, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined }),
    onSuccess: (data, vars, ctx) => {
      if (invalidateKeys) {
        const isMulti = Array.isArray(invalidateKeys) && invalidateKeys.length > 0 && Array.isArray(invalidateKeys[0]);
        const keysList = isMulti ? invalidateKeys : [invalidateKeys];
        keysList.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      options.onSuccess?.(data, vars, ctx);
    },
    onError: options.onError,
  });

  // Spread all mutation state so callers can react to isSuccess/isError directly
  return { ...mutation };
}
