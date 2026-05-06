import { Router, Request, Response } from 'express';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const assessmentRouter = Router();
assessmentRouter.use(authMiddleware);

// ─────────────────────────────────────────────
// Hardcoded question fallback (mirrors frontend src/data/questionnaire.ts)
// ─────────────────────────────────────────────
const FALLBACK_QUESTIONS: Array<{ id: string; category: string; text: string; weight: number }> = [
  { id: 'op-1',   category: 'Operational Risk',  text: 'Are operational procedures documented?',               weight: 5 },
  { id: 'op-2',   category: 'Operational Risk',  text: 'Are business continuity plans in place?',              weight: 4 },
  { id: 'op-3',   category: 'Operational Risk',  text: 'Are critical processes regularly tested?',             weight: 4 },
  { id: 'op-4',   category: 'Operational Risk',  text: 'Is there a change management process?',               weight: 3 },
  { id: 'op-5',   category: 'Operational Risk',  text: 'Are vendor/supplier risks managed?',                  weight: 3 },
  { id: 'comp-1', category: 'Compliance Risk',   text: 'Is there a compliance monitoring programme?',         weight: 5 },
  { id: 'comp-2', category: 'Compliance Risk',   text: 'Are regulatory obligations tracked?',                 weight: 4 },
  { id: 'comp-3', category: 'Compliance Risk',   text: 'Is staff trained on compliance requirements?',        weight: 4 },
  { id: 'comp-4', category: 'Compliance Risk',   text: 'Are compliance breaches reported and remediated?',    weight: 3 },
  { id: 'comp-5', category: 'Compliance Risk',   text: 'Is a data protection policy in place?',              weight: 3 },
  { id: 'fin-1',  category: 'Financial Risk',    text: 'Are financial controls and audits in place?',        weight: 5 },
  { id: 'fin-2',  category: 'Financial Risk',    text: 'Is fraud detection and prevention active?',          weight: 4 },
  { id: 'fin-3',  category: 'Financial Risk',    text: 'Are budgets reviewed against actuals regularly?',    weight: 3 },
  { id: 'fin-4',  category: 'Financial Risk',    text: 'Are financial risk limits defined and monitored?',   weight: 3 },
  { id: 'it-1',   category: 'IT & Security',     text: 'Is access management and MFA enforced?',            weight: 5 },
  { id: 'it-2',   category: 'IT & Security',     text: 'Are security patches applied within SLA?',          weight: 5 },
  { id: 'it-3',   category: 'IT & Security',     text: 'Are data backups tested regularly?',                weight: 4 },
  { id: 'it-4',   category: 'IT & Security',     text: 'Is an incident response plan documented?',          weight: 4 },
  { id: 'it-5',   category: 'IT & Security',     text: 'Is network security monitoring in place?',          weight: 3 },
  { id: 'hr-1',   category: 'Human Resources',   text: 'Are HR policies documented and communicated?',      weight: 4 },
  { id: 'hr-2',   category: 'Human Resources',   text: 'Is background screening conducted for new hires?',  weight: 3 },
  { id: 'hr-3',   category: 'Human Resources',   text: 'Are staff performance and conduct issues managed?', weight: 3 },
  { id: 'str-1',  category: 'Strategic Risk',    text: 'Is a strategic risk review conducted annually?',    weight: 5 },
  { id: 'str-2',  category: 'Strategic Risk',    text: 'Are key strategic dependencies identified?',        weight: 4 },
  { id: 'str-3',  category: 'Strategic Risk',    text: 'Is market/competitive risk monitored?',             weight: 3 },
];

// ─────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────
const toAssessment = (row: any) => ({
  id: row.id,
  organizationId: row.organization_id,
  title: row.title,
  scope: row.scope,
  description: row.description || '',
  status: row.status,
  overallScore: row.overall_score ?? row.score ?? 0,
  riskLevel: row.risk_level || null,
  framework: row.framework || '',
  startedBy: row.started_by || '',
  startedAt: row.started_at || null,
  completedAt: row.completed_at || null,
  aiAnalysis: row.ai_analysis || null,
  inferredRisks: row.inferred_risks || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toAnswer = (row: any) => ({
  id: row.id,
  assessmentId: row.assessment_id,
  questionId: row.question_id,
  value: row.answer,
  notes: row.notes || '',
  score: row.score || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ─────────────────────────────────────────────
// Score helpers
// ─────────────────────────────────────────────
const calculateScore = (
  answers: any[],
  questions: Array<{ id: string; weight: number }>,
): number => {
  const nonNA = answers.filter((a) => a.answer?.toLowerCase() !== 'n/a');
  if (!nonNA.length) return 0;
  const totalWeight = nonNA.reduce((sum, a) => {
    const q = questions.find((q) => q.id === a.question_id);
    return sum + (q?.weight || 3);
  }, 0);
  const yesWeight = nonNA
    .filter((a) => a.answer?.toLowerCase() === 'yes')
    .reduce((sum, a) => {
      const q = questions.find((q) => q.id === a.question_id);
      return sum + (q?.weight || 3);
    }, 0);
  return totalWeight > 0 ? Math.round((yesWeight / totalWeight) * 100) : 0;
};

const scoreToLevel = (score: number): string => {
  if (score <= 25) return 'critical';
  if (score <= 50) return 'high';
  if (score <= 75) return 'medium';
  return 'low';
};

// ─────────────────────────────────────────────
// Deterministic inferred-risks generator
// ─────────────────────────────────────────────
const generateInferredRisks = (
  answers: any[],
  questions: Array<{ id: string; category: string; text: string; weight: number }>,
): any[] => {
  const categories = [...new Set(questions.map((q) => q.category))];
  const risks: any[] = [];

  for (const cat of categories) {
    const catQuestions = questions.filter((q) => q.category === cat);
    const catAnswers = answers.filter((a) => catQuestions.find((q) => q.id === a.question_id));
    const noAnswers = catAnswers.filter((a) => a.answer?.toLowerCase() === 'no');

    if (noAnswers.length === 0) continue;
    const noRatio = noAnswers.length / catAnswers.length;
    if (noRatio < 0.3) continue;

    const likelihood = noRatio > 0.7 ? 4 : noRatio > 0.5 ? 3 : 2;
    const impact = noRatio > 0.7 ? 5 : noRatio > 0.5 ? 4 : 3;
    const score = likelihood * impact;
    const level =
      score >= 16 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';

    risks.push({
      title: `${cat} Risk Gap`,
      category: cat,
      reason: `${noAnswers.length} of ${catAnswers.length} ${cat} controls failed (${Math.round(noRatio * 100)}% non-compliance)`,
      likelihood,
      impact,
      score,
      level,
      missingEvidence: noAnswers
        .map((a: any) => {
          const q = catQuestions.find((q) => q.id === a.question_id);
          return q?.text || a.question_id;
        })
        .slice(0, 3),
      suggestedControls: [
        `Implement ${cat} controls`,
        `Review and remediate failed checks`,
      ],
    });
  }

  return risks;
};

// ─────────────────────────────────────────────
// Audit log helper
// ─────────────────────────────────────────────
const auditLog = async (
  userId: string,
  userName: string,
  userRole: string,
  action: string,
  details: string,
): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details, severity, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        userName,
        userRole,
        action,
        'Assessment',
        details,
        'Medium',
        'System',
      ],
    );
  } catch {
    // non-fatal – swallow
  }
};

// ─────────────────────────────────────────────
// GET /questions  (must be before /:id to avoid collision)
// ─────────────────────────────────────────────
assessmentRouter.get('/questions', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM assessment_questions WHERE active = true ORDER BY category, id`,
    );

    if (result.rows.length > 0) {
      return res.json({ questions: result.rows });
    }

    // Return hardcoded fallback when table is empty
    return res.json({ questions: FALLBACK_QUESTIONS });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /
// ─────────────────────────────────────────────
assessmentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM assessments WHERE organization_id = $1 ORDER BY created_at DESC`,
      [user.organizationId],
    );
    return res.json({ assessments: result.rows.map(toAssessment) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /
// ─────────────────────────────────────────────
assessmentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, scope, description, framework, startedBy } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const id = `a-${Date.now()}`;
    const result = await db.query(
      `INSERT INTO assessments
         (id, organization_id, title, scope, description, status, framework, started_by, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       RETURNING *`,
      [
        id,
        user.organizationId,
        title,
        scope || null,
        description || null,
        'In Progress',
        framework || null,
        startedBy || user.name || null,
      ],
    );

    await auditLog(
      user.id,
      user.name,
      user.role,
      'assessment_created',
      `Assessment "${title}" (${id}) created`,
    );

    return res.status(201).json({ assessment: toAssessment(result.rows[0]) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /:id
// ─────────────────────────────────────────────
assessmentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const aResult = await db.query(
      `SELECT * FROM assessments WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    if (!aResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const ansResult = await db.query(
      `SELECT * FROM answers WHERE assessment_id = $1 ORDER BY created_at`,
      [id],
    );

    return res.json({
      assessment: toAssessment(aResult.rows[0]),
      answers: ansResult.rows.map(toAnswer),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /:id
// ─────────────────────────────────────────────
assessmentRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { title, scope, description, framework, status } = req.body;

    const result = await db.query(
      `UPDATE assessments
       SET title=$1, scope=$2, description=$3, framework=$4, status=$5, updated_at=NOW()
       WHERE id=$6 AND organization_id=$7
       RETURNING *`,
      [title, scope, description, framework, status, id, user.organizationId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    return res.json({ assessment: toAssessment(result.rows[0]) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /:id/answers
// ─────────────────────────────────────────────
assessmentRouter.get('/:id/answers', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM answers WHERE assessment_id = $1 ORDER BY created_at`,
      [req.params.id],
    );
    return res.json({ answers: result.rows.map(toAnswer) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /:id/answers  (upsert)
// ─────────────────────────────────────────────
assessmentRouter.post('/:id/answers', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { questionId, value, notes } = req.body;

    if (!questionId || value === undefined) {
      return res.status(400).json({ error: 'questionId and value are required' });
    }

    const existing = await db.query(
      `SELECT id FROM answers WHERE assessment_id = $1 AND question_id = $2`,
      [id, questionId],
    );

    let row: any;
    if (existing.rows.length > 0) {
      const upd = await db.query(
        `UPDATE answers
         SET answer=$1, notes=$2, updated_at=NOW()
         WHERE assessment_id=$3 AND question_id=$4
         RETURNING *`,
        [value, notes || null, id, questionId],
      );
      row = upd.rows[0];
    } else {
      const ins = await db.query(
        `INSERT INTO answers (id, assessment_id, question_id, answer, notes)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [`ans-${Date.now()}`, id, questionId, value, notes || null],
      );
      row = ins.rows[0];
    }

    // Promote Draft → In Progress
    await db.query(
      `UPDATE assessments SET status='In Progress', updated_at=NOW()
       WHERE id=$1 AND status='Draft'`,
      [id],
    );

    await auditLog(
      user.id,
      user.name,
      user.role,
      'assessment_answer_saved',
      `Answer saved for question ${questionId} on assessment ${id}`,
    );

    return res.json({ answer: toAnswer(row) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /:id/complete
// ─────────────────────────────────────────────
assessmentRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Verify ownership
    const aResult = await db.query(
      `SELECT * FROM assessments WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    if (!aResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Fetch answers
    const ansResult = await db.query(
      `SELECT * FROM answers WHERE assessment_id = $1`,
      [id],
    );
    const answers = ansResult.rows;

    // Fetch questions from DB; fall back to hardcoded list
    const qResult = await db.query(
      `SELECT id, category, text, weight FROM assessment_questions WHERE active = true`,
    );
    const questions: Array<{ id: string; category: string; text: string; weight: number }> =
      qResult.rows.length > 0 ? qResult.rows : FALLBACK_QUESTIONS;

    const score = calculateScore(answers, questions);
    const riskLevel = scoreToLevel(score);
    const inferredRisks = generateInferredRisks(answers, questions);

    const updated = await db.query(
      `UPDATE assessments
       SET status='Completed',
           overall_score=$1,
           risk_level=$2,
           completed_at=NOW(),
           inferred_risks=$3,
           updated_at=NOW()
       WHERE id=$4
       RETURNING *`,
      [score, riskLevel, JSON.stringify(inferredRisks), id],
    );

    await auditLog(
      user.id,
      user.name,
      user.role,
      'assessment_completed',
      `Assessment ${id} completed. Score: ${score}, Risk level: ${riskLevel}`,
    );

    return res.json({
      assessment: toAssessment(updated.rows[0]),
      score,
      riskLevel,
      inferredRisks,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /:id/ai-analysis
// ─────────────────────────────────────────────
assessmentRouter.post('/:id/ai-analysis', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { analysis } = req.body;

    if (!analysis) {
      return res.status(400).json({ error: 'analysis is required' });
    }

    // Check whether there are already inferred_risks stored
    const existing = await db.query(
      `SELECT inferred_risks FROM assessments WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const currentInferred = existing.rows[0].inferred_risks;
    const hasInferred =
      Array.isArray(currentInferred) ? currentInferred.length > 0 : !!currentInferred;

    // Derive inferred risks from AI analysis when none exist yet
    const aiInferredRisks =
      analysis.inferredRisks || analysis.relatedRisks || null;
    const shouldUpdateInferred = !hasInferred && aiInferredRisks && aiInferredRisks.length > 0;

    if (shouldUpdateInferred) {
      await db.query(
        `UPDATE assessments
         SET ai_analysis=$1, inferred_risks=$2, updated_at=NOW()
         WHERE id=$3`,
        [JSON.stringify(analysis), JSON.stringify(aiInferredRisks), id],
      );
    } else {
      await db.query(
        `UPDATE assessments
         SET ai_analysis=$1, updated_at=NOW()
         WHERE id=$2`,
        [JSON.stringify(analysis), id],
      );
    }

    await auditLog(
      user.id,
      user.name,
      user.role,
      'assessment_ai_analysis_generated',
      `AI analysis saved for assessment ${id}`,
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /:id/report
// ─────────────────────────────────────────────
assessmentRouter.post('/:id/report', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Fetch assessment
    const aResult = await db.query(
      `SELECT * FROM assessments WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    if (!aResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    const assessment = aResult.rows[0];

    // Fetch answers
    const ansResult = await db.query(
      `SELECT * FROM answers WHERE assessment_id = $1 ORDER BY created_at`,
      [id],
    );
    const answers = ansResult.rows;

    const generatedAt = new Date().toISOString();
    const score = assessment.overall_score ?? assessment.score ?? 0;
    const riskLevel = assessment.risk_level || scoreToLevel(score);

    const yesCount = answers.filter((a) => a.answer?.toLowerCase() === 'yes').length;
    const noCount  = answers.filter((a) => a.answer?.toLowerCase() === 'no').length;
    const naCount  = answers.filter((a) => a.answer?.toLowerCase() === 'n/a').length;

    const answerSummaryLines = answers
      .slice(0, 20)
      .map((a) => `  - [${(a.answer || '').toUpperCase()}] ${a.question_id}${a.notes ? ` — ${a.notes}` : ''}`)
      .join('\n');

    const inferredRisks: any[] = Array.isArray(assessment.inferred_risks)
      ? assessment.inferred_risks
      : [];

    const recommendationLines = inferredRisks
      .slice(0, 5)
      .map(
        (r: any) =>
          `  • [${(r.level || '').toUpperCase()}] ${r.title}: ${r.reason || ''}\n` +
          `    Suggested: ${(r.suggestedControls || []).join('; ')}`,
      )
      .join('\n');

    const report = [
      `RISK ASSESSMENT REPORT`,
      `═══════════════════════════════════════`,
      `Title       : ${assessment.title}`,
      `Scope       : ${assessment.scope || 'N/A'}`,
      `Framework   : ${assessment.framework || 'N/A'}`,
      `Status      : ${assessment.status}`,
      `Generated   : ${generatedAt}`,
      ``,
      `OVERALL SCORE: ${score} / 100  —  Risk Level: ${riskLevel.toUpperCase()}`,
      ``,
      `ANSWER SUMMARY`,
      `──────────────`,
      `  Yes: ${yesCount}  |  No: ${noCount}  |  N/A: ${naCount}  |  Total: ${answers.length}`,
      ``,
      answers.length > 0
        ? `RESPONSES (first ${Math.min(answers.length, 20)} of ${answers.length})\n──────────────\n${answerSummaryLines}`
        : `No answers recorded.`,
      ``,
      inferredRisks.length > 0
        ? `IDENTIFIED RISK GAPS\n────────────────────\n${recommendationLines}`
        : `No risk gaps identified.`,
      ``,
      `─────────────────────────────────────────`,
      `Report generated by Riskeez on ${generatedAt}`,
    ].join('\n');

    await auditLog(
      user.id,
      user.name,
      user.role,
      'assessment_report_generated',
      `Report generated for assessment ${id}`,
    );

    return res.json({ report, generatedAt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
