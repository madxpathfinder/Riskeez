import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  Send, Bot, User, ShieldCheck, Sparkles, 
  TrendingUp, FileText, LayoutDashboard,
  ShieldAlert, Clock, RefreshCcw, Info,
  AlertTriangle, BrainCircuit, X, MessageSquare,
  Search, Wand2, ChevronRight, Hash
} from 'lucide-react';
import { Button, Card, Badge, PageHeader, Breadcrumbs } from '../common';
import { AIFrontService, AIResponse, AIStatus } from '../../services/aiFrontService';
import { auditLogService } from '../../services/auditLogService';
import { AI_CONFIG } from '../../config/aiConfig';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIAssistantPage = ({ store, onNavigate }: any) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'System Initialized. I am your Strategic Risk Advisor. I can analyze assessments, summarize documentation gaps, or draft executive summaries for your board reports. How may I assist your GRC efforts today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState('Current Assessment');
  const [status, setStatus] = useState<AIStatus>({ status: 'Mock Mode', modelName: 'MOCK-LLM-01' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const s = await AIFrontService.getStatus();
      setStatus(s);
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const isQuickAction = quickActions.some(a => a.label === text);
      const task = isQuickAction ? mapLabelToTask(text) : 'risk_advisor_chat';
      
      if (isQuickAction) {
        await auditLogService.log('ai_quick_action_used', 'Intelligence', `Used quick action: ${text}`);
      } else {
        await auditLogService.log('ai_chat_message_sent', 'Intelligence', `Sent inquiry: ${text.slice(0, 50)}...`);
      }

      const aiContext = {
        answers: store.answers,
        risks: store.risks,
        documents: store.documents,
        controls: store.controls,
        contextSelection: context
      };

      const aiResponse = await AIFrontService.generate(task, aiContext, { 
        input: text,
        history: messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
      });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: formatResponse(aiResponse),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: 'err-' + Date.now().toString(),
        role: 'assistant',
        content: 'I encountered a synchronization error while processing your request. Please ensure context data is available or try again in a moment.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const mapLabelToTask = (label: string) => {
    switch (label) {
      case 'Analyze Current Assessment': return 'findings';
      case 'Generate Top Risks': return 'findings';
      case 'Create Remediation Plan': return 'remediation_plan';
      case 'Summarize Documents': return 'summarize_doc';
      case 'Draft Executive Summary': return 'executive_summary';
      case 'Create 30/60/90 Day Plan': return 'thirty_sixty_ninety_plan';
      case 'Rewrite for Management': return 'management_rewrite';
      case 'Explain Risk Score': return 'explain_risk_score';
      default: return 'chat';
    }
  };

  const formatResponse = (resp: AIResponse) => {
    let output = (resp.answer || resp.summary || "") + "\n\n";
    
    if (resp.confirmedFindings && resp.confirmedFindings.length > 0) {
      output += `### Confirmed Institutional Findings\n` + resp.confirmedFindings.map(f => `• ${f}`).join('\n') + "\n\n";
    }
    if (resp.assumptions && resp.assumptions.length > 0) {
      output += `### Intelligence Assumptions\n` + resp.assumptions.map(a => `• ${a}`).join('\n') + "\n\n";
    }
    if (resp.missingInformation && resp.missingInformation.length > 0) {
      output += `### Information Gaps Critical for Accuracy\n` + resp.missingInformation.map(m => `• ${m}`).join('\n') + "\n\n";
    }
    if (resp.recommendations && resp.recommendations.length > 0) {
      output += `### Strategic Recommendations\n` + resp.recommendations.map(r => `• ${r}`).join('\n') + "\n\n";
    }
    if (resp.disclaimer) {
       output += `\n---\n> ${resp.disclaimer}`;
    }
    return output;
  };

  const quickActions = [
    { label: 'Analyze Current Assessment', icon: ShieldCheck, color: 'text-blue-500' },
    { label: 'Generate Top Risks', icon: ShieldAlert, color: 'text-rose-500' },
    { label: 'Create Remediation Plan', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Summarize Documents', icon: FileText, color: 'text-indigo-500' },
    { label: 'Draft Executive Summary', icon: LayoutDashboard, color: 'text-slate-700' },
    { label: 'Explain Risk Score', icon: Hash, color: 'text-amber-500' },
    { label: 'Create 30/60/90 Day Plan', icon: Clock, color: 'text-violet-500' },
    { label: 'Rewrite for Management', icon: RefreshCcw, color: 'text-slate-400' }
  ];

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-6 pb-4">
      <div className="shrink-0">
        <Breadcrumbs onHomeClick={() => onNavigate?.('dashboard')} items={[{ label: 'Intelligence Layer' }, { label: 'Strategic AI Advisor' }]} />
        <PageHeader 
          title="Intelligence Advisor" 
          subtitle="Real-time strategic risk intelligence and automated governance synthesis"
          actions={
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                <div className={`w-2 h-2 rounded-full ${status.status === 'Connected' ? 'bg-emerald-500' : 'bg-amber-400'} animate-pulse`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{status.status}: {status.modelName}</span>
             </div>
          }
        />
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden">
        {/* Chat Area */}
        <Card noPadding className="lg:col-span-8 flex flex-col h-full overflow-hidden shadow-saas border-slate-100 bg-white rounded-[2.5rem]">
          {/* Context Selector Header */}
          <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-accent">
                   <MessageSquare size={20} />
                </div>
                <div>
                   <p className="text-xs font-black text-slate-900">Active Intelligence Session</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Context: {context}</p>
                </div>
             </div>
             
             <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-xl shadow-sm">
                {['Current Assessment', 'Risk Register', 'Documents', 'Reports'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setContext(c)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                      context === c ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
             </div>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-grow overflow-y-auto p-8 space-y-8 bg-slate-50/10 no-scrollbar">
             {messages.map((m) => (
               <motion.div 
                 key={m.id} 
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className={`flex items-start gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
               >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-all ${
                    m.role === 'assistant' ? 'bg-white border-slate-100 text-accent' : 'bg-slate-900 border-slate-900 text-white'
                  }`}>
                    {m.role === 'assistant' ? <Bot size={22} /> : <User size={22} />}
                  </div>
                  <div className={`max-w-[85%] lg:max-w-[75%] p-6 rounded-[2rem] shadow-sm relative group ${
                    m.role === 'assistant' ? 'bg-white border border-slate-100 rounded-tl-none text-slate-700' : 'bg-accent border border-accent text-white rounded-tr-none'
                  }`}>
                     <div className="prose prose-slate prose-sm max-w-none text-inherit leading-relaxed">
                        <div className="whitespace-pre-wrap font-medium">{m.content}</div>
                     </div>
                     <div className={`absolute top-2 ${m.role === 'user' ? '-left-20' : '-right-20'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                           {format(m.timestamp, 'HH:mm')}
                        </p>
                     </div>
                  </div>
               </motion.div>
             ))}
             {isTyping && (
               <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-accent">
                     <Bot size={22} />
                  </div>
                  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] rounded-tl-none shadow-sm flex gap-1.5 items-center">
                     <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                     <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                     <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter ml-2">Analyzing Institutional Telemetry...</span>
                  </div>
               </div>
             )}
          </div>

          {/* Input Area */}
          <div className="p-8 border-t border-slate-100 bg-white">
             <div className="relative group">
                <div className="absolute inset-0 bg-accent/5 blur-xl group-focus-within:bg-accent/10 transition-all rounded-[2rem]" />
                <div className="relative flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-[2rem] p-3 focus-within:bg-white focus-within:ring-4 focus-within:ring-accent/5 transition-all">
                   <div className="pl-4 text-slate-400 group-focus-within:text-accent transition-colors">
                      <BrainCircuit size={20} />
                   </div>
                   <input 
                     type="text" 
                     value={input}
                     onChange={e => setInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSend()}
                     placeholder="Inquire about risk exposure, control gaps, or compliance roadmaps..."
                     className="flex-grow bg-transparent border-none outline-none text-sm font-black text-slate-900 placeholder:text-slate-400 py-3"
                   />
                   <Button 
                     size="sm" 
                     onClick={() => handleSend()} 
                     icon={Send}
                     className="h-12 px-6 font-black rounded-3xl shadow-glow-accent"
                   >
                    Consult AI
                   </Button>
                </div>
             </div>
             
             <div className="mt-6 flex items-center justify-center gap-6 saturate-0 opacity-40">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                   <ShieldCheck size={12} className="text-emerald-500" /> End-to-End Encrypted Session
                </p>
                <div className="w-px h-3 bg-slate-200" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                   <ShieldCheck size={12} className="text-emerald-500" /> Deterministic Risk Integrity
                </p>
             </div>
          </div>
        </Card>

        {/* Sidebar Actions */}
        <div className="lg:col-span-4 flex flex-col h-full gap-8 overflow-hidden">
           <Card className="flex-grow flex flex-col shadow-saas border-slate-100 bg-white rounded-[2.5rem] overflow-hidden" noPadding>
              <div className="px-8 py-6 border-b border-slate-50">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Wand2 size={16} className="text-accent" /> Intelligence Macros
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">One-click strategic analysis workflows</p>
              </div>
              <div className="flex-grow overflow-y-auto no-scrollbar">
                 {quickActions.map((action, i) => (
                   <button 
                     key={i}
                     onClick={() => handleSend(action.label)}
                     className="w-full text-left p-6 hover:bg-slate-50 transition-all flex items-center justify-between group border-b border-slate-100 last:border-0"
                   >
                      <div className="flex items-center gap-5">
                         <div className={`w-11 h-11 bg-white border border-slate-100 group-hover:border-accent/20 group-hover:shadow-sm rounded-[14px] flex items-center justify-center ${action.color} group-hover:scale-110 transition-all`}>
                            <action.icon size={20} strokeWidth={2.5} />
                         </div>
                         <span className="text-xs font-black text-slate-700 group-hover:text-slate-900 tracking-tight transition-colors">{action.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-200 group-hover:text-accent translate-x-0 group-hover:translate-x-1 transition-all" />
                   </button>
                 ))}
              </div>
           </Card>
           
           <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden group shadow-saas shrink-0">
              <div className="relative z-10 space-y-5">
                 <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
                    <Sparkles size={24} />
                 </div>
                 <div>
                    <h4 className="text-sm font-black uppercase tracking-widest mb-2">Cross-Framework Analysis</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-bold">
                       You can prompt the advisor to perform cross-mapping between ISO 27001, SOC2, and NIST 800-53 based on your current assessment responses.
                    </p>
                 </div>
                 <Button variant="ghost" className="text-accent hover:bg-accent/10 border-accent/20 h-10 px-4 text-[10px] font-black tracking-widest">ACTIVATE COMPLIANCE MODE</Button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-accent/10 rounded-full blur-[80px] group-hover:bg-accent/20 transition-all duration-1000" />
           </div>

           <div className="p-6 bg-slate-50/50 border border-slate-200 rounded-[2rem] shadow-inner">
              <div className="flex items-center gap-3 mb-2">
                 <ShieldCheck size={16} className="text-emerald-500" />
                 <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Confidentiality Guard</h5>
              </div>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">
                 Institutional Intelligence Advisor session. Content treated as strictly confidential.
                 Processed via secure infrastructure. AI output is advisory and does not replace professional risk counsel.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

