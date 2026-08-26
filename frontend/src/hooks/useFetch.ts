import { useCallback, useEffect, useState } from "react";
import { api, ApiError, isAuthFailure } from "../lib/api";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** HTTP status of the failed response, when one was received */
  errorStatus: number | null;
  reload: () => void;
}

/** Fetch a TRACE endpoint with the current bearer token. On 401/403 the
 *  `onUnauthorized` callback fires (the router logs the user out). */
export function useFetch<T>(
  path: string,
  token: string | null | undefined,
  opts?: { onUnauthorized?: () => void },
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // No token (e.g. right after logout) — nothing to fetch; avoid firing a
    // pointless unauthenticated request that would 401 and re-trigger logout.
    if (!token) {
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    (async () => {
      try {
        const d = await api.get<T>(path, token);
        if (!cancelled) setData(d);
      } catch (err) {
        if (cancelled) return;
        if (isAuthFailure(err)) opts?.onUnauthorized?.();
        setError(err instanceof ApiError ? err.message : "Request failed");
        setErrorStatus(err instanceof ApiError ? err.status : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, token, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, error, errorStatus, reload };
}
