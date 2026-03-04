import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** milliseconds before auto-dismiss, default 3000 */
  duration?: number;
}

interface ShowToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

/* ------------------------------------------------------------------ */
/*  Style helpers                                                      */
/* ------------------------------------------------------------------ */

const typeConfig: Record<
  ToastType,
  { bg: string; border: string; text: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    Icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    Icon: XCircle,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    Icon: Info,
  },
};

/* ------------------------------------------------------------------ */
/*  Single Toast                                                       */
/* ------------------------------------------------------------------ */

const ToastEntry: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { bg, border, text, Icon } = typeConfig[toast.type];

  useEffect(() => {
    // Trigger entrance animation on next frame
    const raf = requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      dismiss();
    }, toast.duration ?? 3000);

    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`
        flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg
        ${bg} ${border}
        transition-all duration-300 ease-out
        ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
        max-w-[calc(100%-2rem)] w-full pointer-events-auto
      `}
      role="alert"
      aria-live="assertive"
    >
      <Icon size={18} className={`${text} shrink-0`} />
      <p className={`text-sm font-medium ${text} flex-1 leading-snug`}>{toast.message}</p>
      <button
        onClick={dismiss}
        className={`${text} opacity-60 hover:opacity-100 transition-opacity shrink-0 p-0.5`}
        aria-label="关闭"
      >
        <X size={14} />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((options: ShowToastOptions) => {
    const id = `toast_${++counterRef.current}_${Date.now()}`;
    setToasts((prev) => [...prev, { id, ...options }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container -- fixed to top center */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pt-[calc(env(safe-area-inset-top,0px)+12px)] px-4 w-full max-w-md pointer-events-none"
        aria-label="通知区域"
      >
        {toasts.map((toast) => (
          <ToastEntry key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
