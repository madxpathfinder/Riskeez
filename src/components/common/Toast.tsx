import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export const ToastContainer = ({ toasts, removeToast }: any) => {
  return (
    <div className="fixed bottom-8 right-8 z-[2000] flex flex-col gap-3 pointer-events-none">
       <AnimatePresence>
          {toasts.map((toast: any) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto"
            >
               <div className={`flex items-center gap-4 px-6 py-4 bg-white rounded-2xl shadow-2xl border border-slate-100 min-w-[320px] max-w-md`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                    toast.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={24} /> : 
                     toast.type === 'error' ? <AlertCircle size={24} /> : <Info size={24} />}
                  </div>
                  <div className="flex-grow">
                     <p className="text-xs font-bold text-slate-900">{toast.title}</p>
                     <p className="text-[11px] text-slate-500 font-medium mt-0.5">{toast.message}</p>
                  </div>
                  <button onClick={() => removeToast(toast.id)} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-300">
                     <X size={16} />
                  </button>
               </div>
            </motion.div>
          ))}
       </AnimatePresence>
    </div>
  );
};
