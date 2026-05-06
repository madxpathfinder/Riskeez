import React, { useState, useEffect } from 'react';
import { Search, X, FileText, ShieldAlert, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const GlobalSearch = ({ store, onNavigate }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { assessments, risks, controls, documents } = store;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const results = query.length > 2 ? [
    {
      group: 'Assessments',
      items: assessments.filter((a: any) => a.title.toLowerCase().includes(query.toLowerCase())).map((a: any) => ({ ...a, type: 'Assessment', icon: Activity }))
    },
    {
      group: 'Risks',
      items: risks.filter((r: any) => r.title.toLowerCase().includes(query.toLowerCase())).map((r: any) => ({ ...r, type: 'Risk', icon: ShieldAlert }))
    },
    {
      group: 'Controls',
      items: controls.filter((c: any) => c.title.toLowerCase().includes(query.toLowerCase())).map((c: any) => ({ ...c, type: 'Control', icon: CheckCircle2 }))
    },
    {
      group: 'Documents',
      items: documents.filter((d: any) => d.name.toLowerCase().includes(query.toLowerCase())).map((d: any) => ({ ...d, type: 'Document', icon: FileText }))
    }
  ].filter(g => g.items.length > 0) : [];

  return (
    <>
      <div 
        className="relative group hidden md:block"
        onClick={() => setIsOpen(true)}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent transition-colors" size={16} />
        <div className="w-64 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-slate-400 cursor-pointer hover:bg-white hover:border-accent/40 transition-all flex items-center justify-between">
           Search Enterprise Registry...
           <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] shadow-sm">/</span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 pt-20">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
               onClick={() => setIsOpen(false)}
             />
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: -20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: -20 }}
               className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
               onClick={e => e.stopPropagation()}
             >
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                   <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                      <Search size={22} />
                   </div>
                   <input 
                     autoFocus
                     type="text" 
                     className="flex-grow bg-transparent border-none outline-none text-lg font-black text-slate-800 placeholder:text-slate-300"
                     placeholder="Global search across Riskeez..."
                     value={query}
                     onChange={e => setQuery(e.target.value)}
                   />
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded-lg">Esc to close</span>
                      <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                         <X size={20} className="text-slate-400" />
                      </button>
                   </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4 no-scrollbar">
                   {results.length > 0 ? (
                     <div className="space-y-6">
                        {results.map((group, groupIdx) => (
                          <div key={group.group} className="space-y-2">
                             <h6 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.group}</h6>
                             <div className="space-y-1">
                                {group.items.map((res: any, i) => (
                                  <button
                                    key={`${res.type}-${res.id}-${i}`}
                                    onClick={() => {
                                      onNavigate(res.type === 'Assessment' ? 'assessments' : res.type.toLowerCase() + 's');
                                      setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100"
                                  >
                                     <div className="w-10 h-10 bg-slate-50 group-hover:bg-white group-hover:shadow-sm rounded-xl flex items-center justify-center text-slate-400 group-hover:text-accent transition-all">
                                        <res.icon size={20} />
                                     </div>
                                     <div className="flex-grow text-left">
                                        <p className="text-sm font-black text-slate-700 group-hover:text-accent transition-colors">{res.title || res.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate max-w-[400px]">{res.description || 'No description available'}</p>
                                     </div>
                                     <ChevronRight size={16} className="text-slate-200 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                  </button>
                                ))}
                             </div>
                          </div>
                        ))}
                     </div>
                   ) : query.length > 2 ? (
                     <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                           <Search size={40} className="text-slate-100" />
                        </div>
                        <h4 className="text-base font-black text-slate-900">No Intelligence Matches</h4>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Try adjusting your search query for better results</p>
                     </div>
                   ) : (
                     <div className="py-20 text-center opacity-40">
                        <Activity size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">Start typing to explore the registry</p>
                     </div>
                   )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   <div className="flex gap-4">
                      <span className="flex items-center gap-1.5"><ChevronRight size={12} /> Enter to select</span>
                      <span className="flex items-center gap-1.5"><ChevronRight size={12} /> Esc to close</span>
                   </div>
                   <div>Global Intelligence Search</div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
