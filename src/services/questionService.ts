import { Question, AnswerType } from '../types/assessment';
import { auditLogService } from './auditLogService';

const QUESTIONS_KEY = 'riskeez_questions';

export const questionService = {
  getQuestions(): Question[] {
    const stored = localStorage.getItem(QUESTIONS_KEY);
    if (stored) return JSON.parse(stored);
    
    const initial = [
      {
        id: 'q1',
        category: 'Access Control',
        text: 'Are administrative privileges restricted to authorized personnel only?',
        weight: 10,
        answerType: AnswerType.YES_NO,
        helpText: 'Check user role distribution and access request logs.'
      },
      {
        id: 'q2',
        category: 'Data Privacy',
        text: 'Is sensitive data encrypted at rest and in transit?',
        weight: 15,
        answerType: AnswerType.YES_NO,
        helpText: 'Verify TLS configurations and database encryption settings.'
      }
    ];
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(initial));
    return initial;
  },

  async createQuestion(data: Omit<Question, 'id'>): Promise<Question> {
    const questions = this.getQuestions();
    const newQuestion = { ...data, id: `q-${Date.now()}` };
    questions.push(newQuestion);
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
    await auditLogService.log('assessment_question_created', 'Assessment', `Created question: ${newQuestion.text}`);
    return newQuestion;
  },

  async updateQuestion(id: string, data: Partial<Question>): Promise<void> {
    const questions = this.getQuestions();
    const index = questions.findIndex(q => q.id === id);
    if (index !== -1) {
      questions[index] = { ...questions[index], ...data };
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
      await auditLogService.log('assessment_question_updated', 'Assessment', `Updated question: ${questions[index].text}`);
    }
  },

  async disableQuestion(id: string): Promise<void> {
    const questions = this.getQuestions();
    const index = questions.findIndex(q => q.id === id);
    if (index !== -1) {
      const qText = questions[index].text;
      questions.splice(index, 1);
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
      await auditLogService.log('assessment_question_disabled', 'Assessment', `Disabled question: ${qText}`);
    }
  }
};
