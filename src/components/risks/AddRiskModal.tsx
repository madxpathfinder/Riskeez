import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button, RiskBadge } from '../common';
import { RiskLevel, RiskStatus, RISK_CATEGORIES } from '../../types';
import { motion } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface AddRiskModalProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const AddRiskModal = ({ onClose, onSave }: AddRiskModalProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: RISK_CATEGORIES[0],
    department: '',
    owner: '',
    status: RiskStatus.OPEN,
    likelihood: 3,
    impact: 3,
    dueDate: new Date().toISOString().split('T')[0],
    recommendation: '',
    existingControls: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const calculateScore = (l: number, i: number) => l * i;
  
  const getRiskLevel = (score: number): RiskLevel => {
    if (score >= 16) return RiskLevel.CRITICAL;
    if (score >= 10) return RiskLevel.HIGH;
    if (score >= 5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  };

  const score = calculateScore(formData.likelihood, formData.impact);
  const level = getRiskLevel(score);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = t('common.title') + ' ' + (t('common.isRequired') || 'is required');
    if (!formData.owner.trim()) newErrors.owner = t('common.owner') + ' ' + (t('common.isRequired') || 'is required');
    if (!formData.category) newErrors.category = t('common.category') + ' ' + (t('common.isRequired') || 'is required');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 rounded-t-[2.5rem]">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('riskRegister.registerRisk')}</h2>
            <p className="text-sm text-slate-400 font-bold mt-1">{t('riskRegister.description')}</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 hover:bg-slate-50 rounded-2xl flex items-center justify-center transition-all text-slate-400 hover:text-rose-500">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.title')}*</label>
              <input 
                type="text" 
                className={`w-full bg-slate-50 border ${errors.title ? 'border-rose-300' : 'border-slate-100'} rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all`}
                placeholder="e.g., Unauthenticated API Endpoint access"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
              {errors.title && <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.title}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.category')}*</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.owner')}*</label>
              <input
                type="text"
                className={`w-full bg-slate-50 border ${errors.owner ? 'border-rose-300' : 'border-slate-100'} rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all`}
                placeholder="Name or Department"
                value={formData.owner}
                onChange={e => setFormData({ ...formData, owner: e.target.value })}
              />
              {errors.owner && <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.owner}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('riskRegister.department')}</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                placeholder="e.g. IT, Finance, HR"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.status')}</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as RiskStatus })}
              >
                {Object.values(RiskStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.target')}</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between">
                  {t('riskRegister.likelihood')} <span>{formData.likelihood}</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  className="w-full accent-accent"
                  value={formData.likelihood}
                  onChange={e => setFormData({ ...formData, likelihood: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase letter-wider">
                  <span>{t('riskRegister.remote')}</span>
                  <span>{t('riskRegister.certain')}</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between">
                  {t('riskRegister.impact')} <span>{formData.impact}</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  className="w-full accent-accent"
                  value={formData.impact}
                  onChange={e => setFormData({ ...formData, impact: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase letter-wider">
                  <span>{t('riskRegister.minimal')}</span>
                  <span>{t('riskRegister.catastrophic')}</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-between p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('riskRegister.calculatedExposure')}</p>
                  <p className="text-3xl font-black mt-2 tabular-nums">{score} <span className="text-sm font-bold text-slate-500">/ 25</span></p>
               </div>
               <RiskBadge level={level} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.description')}</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all min-h-[80px]"
                placeholder="Detailed technical context..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('riskRegister.existingControls')}</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all min-h-[60px]"
                placeholder="List any currently implemented measures..."
                value={formData.existingControls}
                onChange={e => setFormData({ ...formData, existingControls: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('riskRegister.recommendedControls')}</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all min-h-[60px]"
                placeholder="Describe your plan to treat this risk..."
                value={formData.recommendation}
                onChange={e => setFormData({ ...formData, recommendation: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('riskRegister.governanceNotes')}</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all min-h-[60px]"
                placeholder="Additional audit or compliance commentary..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between rounded-b-[2.5rem]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">* {t('riskRegister.requiredFields')}</p>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</Button>
            <Button icon={Save} onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (t('common.loading') + '...') : t('riskRegister.registerRisk')}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
