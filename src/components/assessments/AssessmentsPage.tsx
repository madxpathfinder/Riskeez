import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  FileText, 
  MoreVertical,
  SearchX
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge, Button, Card, PageHeader, EmptyState, TableSkeleton, Breadcrumbs } from '../common';
import { AssessmentStatus, RiskLevel } from '../../types';
import { AssessmentWizard } from './AssessmentWizard';
import { AssessmentDetail } from './AssessmentDetail';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Permission } from '../../services/permissionService';

interface AssessmentsPageProps {
  store: any;
  onNavigate?: (tab: string) => void;
}

export const AssessmentsPage = ({ store, onNavigate }: AssessmentsPageProps) => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const { assessments, isLoading } = store;
  const canCreate = hasPermission(Permission.ASSESSMENTS_CREATE);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [continuationAssessment, setContinuationAssessment] = useState<any>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  if (isFlowOpen) return <AssessmentWizard store={store} onCancel={() => { setIsFlowOpen(false); setContinuationAssessment(null); if (store.refresh) store.refresh(); }} continuationAssessment={continuationAssessment} />;
  if (selectedAssessment) return <AssessmentDetail assessment={selectedAssessment} store={store} onBack={() => { setSelectedAssessment(null); if (store.refresh) store.refresh(); }} />;

  const filtered = assessments.filter((a: any) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.scope.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const total = assessments.length;
  const completed = assessments.filter((a: any) => a.status === AssessmentStatus.COMPLETED).length;
  const inProgress = assessments.filter((a: any) => a.status === AssessmentStatus.IN_PROGRESS).length;
  const avgScore = completed > 0 ? Math.round(assessments.reduce((acc: number, cur: any) => acc + (cur.overallScore || 0), 0) / completed) : 0;

  return (
    <div className="space-y-8 pb-20">
      <Breadcrumbs onHomeClick={() => onNavigate('dashboard')} items={[{ label: t('nav.auditLog') || 'Audit & Compliance', onClick: () => onNavigate('audit') }, { label: t('nav.assessments') }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title={t('assessments.title')} 
          subtitle="Manage and track organization-wide risk assessments" 
        />
        {canCreate && <Button onClick={() => setIsFlowOpen(true)} icon={Plus}>{t('assessments.startAssessment')}</Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { l: t('nav.assessments'), v: total, i: ClipboardCheck, c: 'blue' },
           { l: t('controls.implemented'), v: completed, i: CheckCircle2, c: 'emerald' },
           { l: t('common.inProgress'), v: inProgress, i: Clock, c: 'amber' },
           { l: t('common.score'), v: avgScore, i: BarChart3, c: 'slate' }
         ].map((s:any) => (
           <div key={s.l} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-saas transition-all group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-accent group-hover:text-white transition-all shadow-inner">
                <s.i size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.l}</p>
                <p className="text-xl font-black text-slate-900 mt-1">{s.v}</p>
              </div>
           </div>
         ))}
      </div>

      <Card noPadding className="overflow-hidden shadow-saas rounded-[2rem] border-slate-100">
        <div className="p-8 border-b border-slate-50 flex flex-col lg:flex-row gap-6 items-center justify-between bg-white">
           <div className="relative w-full lg:w-[450px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={3} />
              <input 
                type="text" 
                placeholder="Search audit title or scope keywords..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-slate-300"
              />
           </div>
           <div className="flex gap-3 w-full lg:w-auto">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:bg-white focus:ring-4 focus:ring-accent/10 cursor-pointer"
              >
                <option value="All">{t('assessments.allStatus')}</option>
                <option value={AssessmentStatus.COMPLETED}>{t('assessments.completed')}</option>
                <option value={AssessmentStatus.IN_PROGRESS}>{t('common.inProgress')}</option>
                <option value={AssessmentStatus.DRAFT}>{t('assessments.draft')}</option>
              </select>
              <Button variant="secondary" icon={Filter} className="h-11 font-black">{t('assessments.refineRegistry')}</Button>
           </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="pl-10 pr-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.title')}</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('assessments.scope')}</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('common.score')}</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('common.severity')}</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('riskRegister.target')}</th>
                  <th className="pl-4 pr-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((a: any) => (
                  <tr 
                    key={a.id} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (a.status === AssessmentStatus.COMPLETED) {
                        setSelectedAssessment(a);
                      } else {
                        setContinuationAssessment(a);
                        setIsFlowOpen(true);
                      }
                    }}
                  >
                    <td className="pl-10 pr-4 py-6">
                      <p className="font-black text-slate-900 text-sm group-hover:text-accent transition-colors">{a.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 tracking-widest">GUID: {a.id.split('-').pop()}</p>
                    </td>
                    <td className="px-4 py-6">
                      <span className="text-[9px] font-black text-slate-500 bg-slate-100/50 px-2 py-1 rounded border border-slate-100 uppercase tracking-widest">
                        {a.scope}
                      </span>
                    </td>
                    <td className="px-4 py-6">
                      <Badge color={a.status === AssessmentStatus.COMPLETED ? 'green' : a.status === AssessmentStatus.IN_PROGRESS ? 'blue' : 'gray'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-6 text-center font-black text-slate-700 tabular-nums">{a.overallScore || '--'}</td>
                    <td className="px-4 py-6 text-center">
                      {a.riskLevel ? (
                        <Badge color={a.riskLevel === RiskLevel.CRITICAL || a.riskLevel === RiskLevel.HIGH ? 'red' : a.riskLevel === RiskLevel.MEDIUM ? 'yellow' : 'green'}>
                          {a.riskLevel}
                        </Badge>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-6 text-[10px] font-black text-slate-400 tabular-nums uppercase tracking-widest">
                      {format(new Date(a.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="pl-4 pr-10 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                         <Button variant="ghost" size="sm" icon={FileText} className="w-9 h-9 p-0 rounded-xl hover:bg-white" />
                         <Button variant="ghost" size="sm" icon={MoreVertical} className="w-9 h-9 p-0 rounded-xl hover:bg-white" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            icon={SearchX}
            title="Registry Segment Empty"
            description="No assessments matching your current filter parameters were located in the synchronized data lake."
            actionLabel="Initialize Fresh Audit"
            onAction={() => setIsFlowOpen(true)}
          />
        )}
      </Card>
    </div>
  );
};
