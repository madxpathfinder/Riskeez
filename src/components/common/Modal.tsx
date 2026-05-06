import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal = ({ isOpen, onClose, title, subtitle, children, width = 'max-w-2xl' }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`bg-white rounded-[2.5rem] w-full ${width} shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden max-h-[90vh]`}
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
                {subtitle && <p className="text-sm text-slate-400 font-bold mt-1">{subtitle}</p>}
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 hover:bg-slate-50 rounded-2xl flex items-center justify-center transition-all text-slate-400 hover:text-rose-500"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
