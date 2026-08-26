import { useAuth } from "../lib/auth-context";
import { useFetch } from "./useFetch";

/** useFetch wired to the live session: bearer token attached, and an
 *  unauthorized response logs the user out (router bounces to /login). */
export function useAuthedFetch<T>(path: string) {
  const { session, logout } = useAuth();
  return useFetch<T>(path, session?.token, { onUnauthorized: logout });
}
