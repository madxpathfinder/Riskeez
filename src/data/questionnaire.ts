import { Question, AnswerType } from '../types';

export const ASSESSMENT_QUESTIONS: Question[] = [
  // Operational Risk
  {
    id: 'op-1',
    category: 'Operational Risk',
    text: 'Does the company maintain a formal risk register?',
    weight: 5,
    answerType: AnswerType.YES_NO,
    helpText: 'A risk register is a central repository of all identified risks.'
  },
  {
    id: 'op-2',
    category: 'Operational Risk',
    text: 'Are risk owners assigned to major business risks?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'op-3',
    category: 'Operational Risk',
    text: 'Are critical business processes documented?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'op-4',
    category: 'Operational Risk',
    text: 'Are operational incidents tracked and reviewed?',
    weight: 3,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'op-5',
    category: 'Operational Risk',
    text: 'Is there a clear delegation of authority for business decisions?',
    weight: 3,
    answerType: AnswerType.YES_NO
  },

  // Compliance Risk
  {
    id: 'comp-1',
    category: 'Compliance Risk',
    text: 'Does the company have a compliance owner?',
    weight: 5,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'comp-2',
    category: 'Compliance Risk',
    text: 'Are internal policies reviewed at least annually?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'comp-3',
    category: 'Compliance Risk',
    text: 'Are compliance violations logged and tracked?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'comp-4',
    category: 'Compliance Risk',
    text: 'Are regulatory requirements mapped to internal controls?',
    weight: 5,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'comp-5',
    category: 'Compliance Risk',
    text: 'Are employees trained on compliance policies?',
    weight: 3,
    answerType: AnswerType.YES_NO
  },

  // Vendor Risk
  {
    id: 'vend-1',
    category: 'Vendor Risk',
    text: 'Does the company maintain a list of critical vendors?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'vend-2',
    category: 'Vendor Risk',
    text: 'Are vendors assessed before onboarding?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'vend-3',
    category: 'Vendor Risk',
    text: 'Are vendor contracts reviewed for compliance and data protection clauses?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'vend-4',
    category: 'Vendor Risk',
    text: 'Are critical vendors reviewed annually?',
    weight: 3,
    answerType: AnswerType.YES_NO
  },

  // Business Continuity
  {
    id: 'bc-1',
    category: 'Business Continuity Risk',
    text: 'Does the company have a business continuity plan?',
    weight: 5,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'bc-2',
    category: 'Business Continuity Risk',
    text: 'Has the business continuity plan been tested in the last 12 months?',
    weight: 5,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'bc-3',
    category: 'Business Continuity Risk',
    text: 'Are backup and recovery responsibilities documented?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'bc-4',
    category: 'Business Continuity Risk',
    text: 'Are critical systems and processes prioritized?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },

  // Data Privacy
  {
    id: 'priv-1',
    category: 'Data Privacy Risk',
    text: 'Does the company process personal data?',
    weight: 5,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'priv-2',
    category: 'Data Privacy Risk',
    text: 'Is there a data retention policy?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'priv-3',
    category: 'Data Privacy Risk',
    text: 'Are privacy incidents tracked?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'priv-4',
    category: 'Data Privacy Risk',
    text: 'Are access rights reviewed periodically?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },

  // IT Governance
  {
    id: 'it-1',
    category: 'IT Governance Risk',
    text: 'Are IT assets tracked?',
    weight: 3,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'it-2',
    category: 'IT Governance Risk',
    text: 'Are access rights reviewed?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'it-3',
    category: 'IT Governance Risk',
    text: 'Are critical systems monitored?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'it-4',
    category: 'IT Governance Risk',
    text: 'Is there an incident response process?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },

  // Financial Risk
  {
    id: 'fin-1',
    category: 'Financial Risk',
    text: 'Are internal financial controls audited regularly?',
    weight: 5,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'fin-2',
    category: 'Financial Risk',
    text: 'Is there a clear separation of duties in financial transactions?',
    weight: 5,
    answerType: AnswerType.YES_NO
  },

  // Strategic Risk
  {
    id: 'strat-1',
    category: 'Strategic Risk',
    text: 'Is there an annual strategic plan approved by the board?',
    weight: 4,
    answerType: AnswerType.YES_NO
  },
  {
    id: 'strat-2',
    category: 'Strategic Risk',
    text: 'Are market competition risks reviewed quarterly?',
    weight: 3,
    answerType: AnswerType.YES_NO
  }
];
