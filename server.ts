import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { aiService } from "./src/server/ai/aiService";
import ExcelJS from "exceljs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Risk Register Template Download
  app.get("/api/templates/risk-register", async (req, res) => {
    const templateData = [
      {
        title: "No formal risk register exists",
        category: "Operational Risk",
        description: "The organization lacks a centralized repository for tracking and managing business risks.",
        likelihood: 4,
        impact: 4,
        owner: "Risk Manager",
        status: "Open",
        recommendation: "Establish a centralized risk register and assign risk owners.",
        dueDate: "2026-06-30"
      },
      {
        title: "Business continuity plan has not been tested",
        category: "Business Continuity Risk",
        likelihood: 4,
        impact: 5,
        owner: "Operations Manager",
        status: "Open",
        recommendation: "Conduct a tabletop exercise and document recovery responsibilities.",
        dueDate: "2026-07-15"
      },
      {
        title: "Vendor review process is informal",
        category: "Vendor Risk",
        likelihood: 3,
        impact: 4,
        owner: "Procurement Lead",
        status: "In Progress",
        recommendation: "Implement a vendor onboarding and annual review process.",
        dueDate: "2026-08-01"
      }
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Risk Register Template');
    
    sheet.columns = [
      { header: 'Risk Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Risk Description', key: 'description', width: 40 },
      { header: 'Likelihood', key: 'likelihood', width: 12 },
      { header: 'Impact', key: 'impact', width: 12 },
      { header: 'Owner', key: 'owner', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Recommendation', key: 'recommendation', width: 40 },
      { header: 'Due Date', key: 'dueDate', width: 15 }
    ];

    templateData.forEach(item => sheet.addRow(item));
    
    res.setHeader("Content-Disposition", 'attachment; filename="Riskeez_RiskRegister_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    
    await workbook.xlsx.write(res);
    res.end();
  });

  // AI Generation Endpoint
  app.post("/api/ai/generate", async (req, res) => {
    const { task, context, subTaskParams = {} } = req.body;
    
    try {
      let result;
      switch (task) {
        case "postureSummary":
          result = await aiService.generateRiskPostureSummary(context);
          break;
        case "findings":
          result = await aiService.generateRiskFindings(context);
          break;
        case "remediationPlan":
          result = await aiService.generateRemediationPlan(subTaskParams.riskTitle, context);
          break;
        case "summarizeDoc":
          result = await aiService.summarizeDocument(subTaskParams.docTitle, context);
          break;
        case "missingEvidence":
          result = await aiService.identifyMissingEvidence(context);
          break;
        case "executiveSummary":
          result = await aiService.generateExecutiveSummary(context);
          break;
        case "managementRewrite":
          result = await aiService.rewriteForManagement(subTaskParams.text, context);
          break;
        case "thirtySixtyNinety":
          result = await aiService.create306090Plan(subTaskParams.riskTitle, context);
          break;
        case "chat":
          result = await aiService.conductChat(req.body.prompt, context);
          break;
        default:
          return res.status(400).json({ error: "Invalid task requested." });
      }
      res.json(result);
    } catch (error: any) {
      console.error("AI Service Error:", error);
      res.status(500).json({ error: "Risk Intelligence failed to process request." });
    }
  });

  // AI Status Endpoint
  app.get("/api/ai/status", async (req, res) => {
    try {
      const status = await aiService.getAiStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Could not retrieve AI status." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
