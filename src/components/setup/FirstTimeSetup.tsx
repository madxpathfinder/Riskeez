import React, { useState } from 'react';
import { Shield, ArrowRight, Lock, Mail, User, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card } from '../common';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';

interface FirstTimeSetupProps {
  onComplete: () => void;
}

export const FirstTimeSetup = ({ onComplete }: FirstTimeSetupProps) => {
  const { refreshState } = useAuth();
  const { appName } = useBranding();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    orgName: '',
    industry: 'Financial Services',
    country: 'United States',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1 && !formData.orgName) {
      setError('Organization name is required');
      return;
    }
    if (step === 2 && (!formData.adminName || !formData.adminEmail)) {
      setError('All profile fields are required');
      return;
    }
    // Simple email validation
    if (step === 2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters for minimum complexity');
      return;
    }

    // Create the admin (which now also initializes organization)
    const setupAdmin = async () => {
      await userService.createInitialAdmin({
        name: formData.adminName,
        email: formData.adminEmail,
        organizationName: formData.orgName,
        industry: formData.industry,
        country: formData.country
      });

      // Automatically log them in
      await authService.login(formData.adminEmail, formData.password);

      // Sync global state immediately
      await refreshState();

      onComplete();
    };
    setupAdmin();
  };

  return (
    <div className="fixed inset-0 bg-[#FBF9FF] z-[200] flex items-center justify-center p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-saas-lg mx-auto mb-6">
              <Shield size={32} />
           </div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Initialization</h1>
           <p className="text-slate-500 font-medium mt-2">Set up your {appName} environment for {formData.orgName || 'your enterprise'}</p>
        </div>

        <Card className="p-8 border-slate-200 shadow-xl rounded-[2rem]">
          <div className="mb-8 text-center">
             <button 
                type="button" 
                onClick={onComplete}
                className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline mb-4"
             >
                Already have an Enterprise profile? Sign In
             </button>
             <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-1.5 flex-grow rounded-full transition-all ${s <= step ? 'bg-accent' : 'bg-slate-100'}`} />
                ))}
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialization Phase {step} of 3</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div>
                    <h2 className="text-xl font-black text-slate-900">Organization Identity</h2>
                    <p className="text-xs text-slate-400 font-bold mb-4">Establish the legal entity for audit trailing.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Name</label>
                       <div className="relative">
                          <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                             type="text"
                             value={formData.orgName}
                             onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                             className="w-full bg-slate-50 border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-slate-300"
                             placeholder="e.g. Acme Global Security"
                          />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Industry Vertical</label>
                          <select 
                             value={formData.industry}
                             onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                             className="w-full bg-slate-50 border border-transparent rounded-xl py-3.5 px-4 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                          >
                             {['Financial Services', 'Healthcare', 'Technology', 'Manufacturing', 'Retail', 'Government', 'Energy'].map(i => (
                               <option key={i} value={i}>{i}</option>
                             ))}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Operating Country</label>
                          <input 
                             type="text"
                             value={formData.country}
                             onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                             className="w-full bg-slate-50 border border-transparent rounded-xl py-3.5 px-4 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                             placeholder="United States"
                          />
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div>
                    <h2 className="text-xl font-black text-slate-900">Administrator Profile</h2>
                    <p className="text-xs text-slate-400 font-bold mb-4">Set up the primary system controller account.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                       <div className="relative">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                             type="text"
                             value={formData.adminName}
                             onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                             className="w-full bg-slate-50 border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-slate-300"
                             placeholder="Super User"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Business Email / Username</label>
                       <div className="relative">
                          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                             type="text"
                             value={formData.adminEmail}
                             onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                             className="w-full bg-slate-50 border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-slate-300"
                             placeholder="admin@riskeez.app"
                          />
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div>
                    <h2 className="text-xl font-black text-slate-900">Security Access Keys</h2>
                    <p className="text-xs text-slate-400 font-bold mb-4">Establish a fortified entry point for this environment.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Master Password</label>
                       <div className="relative">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                             type="password"
                             value={formData.password}
                             onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                             className="w-full bg-slate-50 border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-slate-300"
                             placeholder="••••••••••••"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Confirm Security Key</label>
                       <div className="relative">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                             type="password"
                             value={formData.confirmPassword}
                             onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                             className="w-full bg-slate-50 border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-slate-300"
                             placeholder="••••••••••••"
                          />
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[11px] font-black text-center flex items-center justify-center gap-2">
                 <Shield size={14} className="shrink-0" />
                 {error}
              </div>
            )}

            <div className="pt-4 flex gap-4">
               {step > 1 && (
                 <Button type="button" variant="secondary" className="flex-grow h-12 font-black" onClick={() => setStep(prev => prev - 1)}>Return</Button>
               )}
               {step < 3 ? (
                 <Button type="button" className="flex-grow h-12 font-black" onClick={handleNext} icon={ArrowRight}>Next Phase</Button>
               ) : (
                 <Button type="submit" className="flex-grow h-12 font-black" icon={Shield}>Activate Environment</Button>
               )}
            </div>
          </form>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <span className="flex items-center gap-1"><Lock size={12} /> Encrypted Session</span>
           <span className="w-1 h-1 rounded-full bg-slate-200" />
           <span className="flex items-center gap-1"><Shield size={12} /> Local Persistence</span>
        </div>
      </motion.div>
    </div>
  );
};
