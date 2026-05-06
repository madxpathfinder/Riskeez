import { Answer } from '../types/assessment';
import { storageService } from './storageService';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const ANSWERS_KEY = 'riskeez_answers';

export const answerService = {
  async getAnswers(assessmentId?: string): Promise<Answer[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      if (assessmentId) {
        try {
          const res = await api.get<{ answers: Answer[] }>(`/api/assessments/${assessmentId}/answers`);
          return res.answers.map((a: any) => ({
            id: a.id,
            assessmentId: a.assessmentId || a.assessment_id,
            questionId: a.questionId || a.question_id,
            value: a.value || a.answer,
            notes: a.notes || ''
          }));
        } catch {
          return [];
        }
      }
      return [];
    }
    const allAnswers = storageService.getItem<Answer[]>(ANSWERS_KEY) || [];
    if (assessmentId) {
      return allAnswers.filter(a => a.assessmentId === assessmentId);
    }
    return allAnswers;
  },

  saveAnswers(answers: Answer[]) {
    storageService.setItem(ANSWERS_KEY, answers);
  },

  async submitAnswer(answer: Omit<Answer, 'id'>): Promise<Answer> {
    if (APP_CONFIG.DATA_PROVIDER === 'api' && answer.assessmentId && answer.assessmentId !== 'new') {
      try {
        const res = await api.post<{ answer: any }>(`/api/assessments/${answer.assessmentId}/answers`, {
          questionId: answer.questionId,
          value: answer.value,
          notes: answer.notes
        });
        return {
          id: res.answer.id,
          assessmentId: res.answer.assessmentId || res.answer.assessment_id,
          questionId: res.answer.questionId || res.answer.question_id,
          value: res.answer.value || res.answer.answer,
          notes: res.answer.notes || ''
        };
      } catch (err) {
        console.warn('API answer save failed, falling back to local:', err);
      }
    }

    const allAnswers = await this.getAnswers();
    const existingIndex = allAnswers.findIndex(
      a => a.assessmentId === answer.assessmentId && a.questionId === answer.questionId
    );

    const newAnswer: Answer = {
      ...answer,
      id: existingIndex !== -1 ? allAnswers[existingIndex].id : `ans-${Date.now()}`
    };

    if (existingIndex !== -1) {
      allAnswers[existingIndex] = newAnswer;
    } else {
      allAnswers.push(newAnswer);
    }

    this.saveAnswers(allAnswers);
    return newAnswer;
  }
};
