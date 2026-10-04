import React from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-rose-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-indigo-400" />
  };

  const borders = {
    success: 'border-emerald-800/80 bg-slate-900/95',
    error: 'border-rose-800/80 bg-slate-900/95',
    warning: 'border-amber-800/80 bg-slate-900/95',
    info: 'border-indigo-800/80 bg-slate-900/95'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl shadow-black/40 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ${borders[toast.type]}`}
        >
          <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
            {toast.message && (
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
