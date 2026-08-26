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
          className={`fixed bottom-6 right-6 z-[60] translate-y-0 rounded-lg px-4 py-3 text-xs font-medium text-white opacity-100 shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition-all duration-200 ${
            toast.tone === "error" ? "bg-danger" : "bg-[#123b27]"
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
