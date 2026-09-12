import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastState {
  message: string;
  tone: "success" | "error";
}

const ToastContext = createContext<{ show: (message: string, tone?: "success" | "error") => void }>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Toast — transient feedback surface.
 *
 * Success uses ink (the system's primary emphasis); green is reserved for
 * status semantics (§09) rather than for chrome. Errors use danger.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] translate-y-0 rounded-input px-4 py-3 text-small font-medium text-white opacity-100 shadow-hover transition-all duration-200 ${
            toast.tone === "error" ? "bg-danger" : "bg-ink"
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
