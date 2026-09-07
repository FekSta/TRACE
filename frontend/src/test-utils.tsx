import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context";
import { ToastProvider } from "./components/ui/Toast";

/**
 * AllProviders wraps a component in every provider the app uses:
 * AuthProvider (JWT session), ToastProvider, BrowserRouter.
 * Call `storeToken(fakeJwt(...))` before rendering to set the session.
 */
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export function renderWithProviders(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}
