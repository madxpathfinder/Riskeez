import React, { useState } from 'react';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card } from '../common';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBranding } from '../../contexts/BrandingContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const { t } = useLanguage();
  const { appName } = useBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error(t('login.inputRequired'), t('login.inputRequiredDesc'));
      return;
    }

    setIsSubmitting(true);
    try {
      const success_login = await login(email, password);
      if (success_login) {
        success(t('login.accessGranted'), t('login.accessGrantedDesc'));
      } else {
        error(t('login.accessDenied'), t('login.accessDeniedDesc'));
      }
    } catch (err) {
      error(t('login.identityError'), t('login.identityErrorDesc'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9FF] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px]"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-accent rounded-[1.5rem] flex items-center justify-center text-white shadow-saas-lg mb-6 group-hover:scale-110 transition-transform">
             <ShieldCheck size={36} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{appName}</h1>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">{t('app.taglineFull')}</p>
        </div>

        <Card className="p-10 shadow-saas-lg border-slate-100 rounded-[2.5rem]">
           <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">{t('login.emailLabel')}</label>
                 <input
                   type="text"
                   autoFocus
                   placeholder={t('login.emailPlaceholder')}
                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                 />
              </div>
              <div>
                 <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">{t('login.passwordLabel')}</label>
                    <button type="button" className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">{t('login.recoverKey')}</button>
                 </div>
                 <input
                   type="password"
                   placeholder="••••••••"
                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                 />
              </div>

              <div className="pt-2">
                 <Button
                   type="submit"
                   className="w-full h-14 rounded-2xl text-[11px] font-black tracking-[0.1em] shadow-glow-accent uppercase"
                   icon={LogIn}
                   loading={isSubmitting}
                 >
                   {t('login.verifyIdentity')}
                 </Button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 mt-8">
                 <AlertCircle className="text-slate-400 shrink-0" size={16} />
                 <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                   {t('login.securityNotice')}
                 </p>
              </div>
           </form>
        </Card>

        <div className="mt-10 text-center">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
             {t('login.copyright')}
           </p>
        </div>
      </motion.div>
    </div>
  );
};
