import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer } from '../components/common/Toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, message: string, type?: ToastType) => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((title: string, message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, title, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = (title: string, message: string) => toast(title, message, 'success');
  const error = (title: string, message: string) => toast(title, message, 'error');
  const info = (title: string, message: string) => toast(title, message, 'info');
  const warning = (title: string, message: string) => toast(title, message, 'warning');

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
