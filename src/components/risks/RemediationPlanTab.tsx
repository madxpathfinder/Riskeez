import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button, Card } from '../common';
import { AIFrontService, AIResponse } from '../../services/aiFrontService';
import { useBranding } from '../../contexts/BrandingContext';

interface RemediationPlanTabProps {
  risk: any;
  store: any;
}

export const RemediationPlanTab = ({ risk, store }: RemediationPlanTabProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plans, setPlans] = useState<AIResponse | null>(null);
  const { appName } = useBranding();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await AIFrontService.generate('remediationPlan', { 
        risks: [risk], 
        answers: store.answers 
      }, { riskTitle: risk.title });
      setPlans(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Strategic Remediation Roadmap</h4>
         <Button 
            size="sm" 
            variant="secondary" 
            icon={Sparkles} 
            onClick={handleGenerate}
            disabled={isGenerating}
         >
            {isGenerating ? 'Generating Strategy...' : (plans ? 'Regenerate Plan' : 'Generate with AI')}
         </Button>
      </div>

      {!plans && !isGenerating && (
        <div className="p-16 text-center bg-white border border-dashed border-slate-200 rounded-[32px]">
           <Sparkles size={32} className="mx-auto mb-4 text-slate-200" />
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No active remediation strategy</p>
           <p className="text-[10px] text-slate-500 mt-2 max-w-xs mx-auto font-bold">Use {appName} AI to generate a calibrated mitigation roadmap based on likelihood and impact.</p>
        </div>
      )}

      {isGenerating && (
        <div className="space-y-6">
           {[1,2,3].map(i => (
             <div key={i} className="h-24 bg-white border border-slate-50 rounded-3xl animate-pulse" />
           ))}
        </div>
      )}

      {plans && (
        <div className="space-y-6">
           <Card className="bg-indigo-50/30 border-indigo-100 ring-0 shadow-none">
              <h5 className="text-xs font-black text-indigo-900 mb-3 flex items-center gap-2">
                 <ShieldCheck size={16} /> Technical Summary
              </h5>
              <p className="text-sm text-indigo-800 leading-relaxed font-bold">
                 {plans.summary}
              </p>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                 <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Immediate Actions (Findings)</h6>
                 {plans.confirmedFindings.map((f, i) => (
                   <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex gap-3">
                      <div className="text-slate-400 mt-0.5 font-black">•</div>
                      <p className="text-xs font-bold text-slate-700">{f}</p>
                   </div>
                 ))}
              </div>
              <div className="space-y-4">
                 <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Controls</h6>
                 {plans.recommendations.map((r, i) => (
                   <div key={i} className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 text-emerald-800">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-black">{r}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </motion.div>
  );
};
