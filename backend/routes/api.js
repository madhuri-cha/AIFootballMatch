import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import MatchReport from '../models/MatchReport.js';
import { analyzeMatchWithGranite, translateAnalysisWithGranite, askGraniteAboutMatch, parseRawTextToMatchJson } from '../services/graniteService.js';
import { analyzeMatchTactics } from '../services/tacticalEngine.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const presetsDir = path.join(__dirname, '../presets');

// In-memory cache fallback for when MongoDB is unavailable
const inMemoryReports = new Map();

// Helper to check if DB is connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// Get metadata of available presets
router.get('/presets', (req, res) => {
  try {
    const files = fs.readdirSync(presetsDir);
    const presets = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(presetsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        presets.push({
          matchId: data.matchId,
          homeTeam: data.homeTeam,
          awayTeam: data.awayTeam,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          homePenalties: data.homePenalties,
          awayPenalties: data.awayPenalties,
          date: data.date,
          competition: data.competition,
          venue: data.venue
        });
      }
    }
    res.json(presets);
  } catch (error) {
    console.error('Error reading presets:', error);
    res.status(500).json({ error: 'Failed to load presets.' });
  }
});

// Analyze preset match
router.post('/analyze/preset/:id', async (req, res) => {
  const matchId = req.params.id;
  try {
    // 1. Check if report is already cached in DB/memory
    if (isDbConnected()) {
      const existing = await MatchReport.findOne({ matchId });
      if (existing) {
        const reportObj = existing.toObject();
        reportObj.watsonxConfigured = !!process.env.WATSONX_AI_APIKEY;
        return res.json(reportObj);
      }
    } else {
      const existing = inMemoryReports.get(matchId);
      if (existing) {
        const reportObj = { ...existing, watsonxConfigured: !!process.env.WATSONX_AI_APIKEY };
        return res.json(reportObj);
      }
    }

    // 2. Load Preset File
    const presetPath = path.join(presetsDir, `${matchId}.json`);
    if (!fs.existsSync(presetPath)) {
      return res.status(404).json({ error: 'Preset match not found' });
    }

    const matchData = JSON.parse(fs.readFileSync(presetPath, 'utf8'));

    // 3. Generate Analysis with Granite / Rules Engine
    console.log(`Analyzing preset match: ${matchId}...`);
    const analysisResult = await analyzeMatchWithGranite(matchData);

    const fullReport = {
      ...matchData,
      analysis: analysisResult,
      translations: {}
    };

    // 4. Save to Cache
    if (isDbConnected()) {
      const savedReport = await MatchReport.findOneAndUpdate(
        { matchId },
        fullReport,
        { upsert: true, new: true }
      );
      const reportObj = savedReport.toObject();
      reportObj.watsonxConfigured = !!process.env.WATSONX_AI_APIKEY;
      res.json(reportObj);
    } else {
      inMemoryReports.set(matchId, fullReport);
      const reportObj = { ...fullReport, watsonxConfigured: !!process.env.WATSONX_AI_APIKEY };
      res.json(reportObj);
    }
  } catch (error) {
    console.error(`Error analyzing preset ${matchId}:`, error);
    res.status(500).json({ error: 'Failed to analyze match preset.' });
  }
});

// Upload custom match file (JSON)
router.post('/analyze/upload', upload.single('file'), async (req, res) => {
  try {
    let matchData;

    // Check if uploaded via file or sent directly in the body
    if (req.file) {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      matchData = JSON.parse(fileContent);
      fs.unlinkSync(req.file.path); // clean up file
    } else if (req.body && req.body.matchId) {
      matchData = req.body;
    } else {
      return res.status(400).json({ error: 'No match data uploaded or provided.' });
    }

    // Basic structure validation
    if (!matchData.matchId || !matchData.homeTeam || !matchData.awayTeam || !matchData.stats || !matchData.timeline) {
      return res.status(400).json({ error: 'Invalid match data structure. Missing key parameters (matchId, homeTeam, stats, timeline, etc.)' });
    }

    console.log(`Analyzing custom match: ${matchData.matchId}...`);
    const analysisResult = await analyzeMatchWithGranite(matchData);

    const fullReport = {
      ...matchData,
      analysis: analysisResult,
      translations: {}
    };

    // Save to Cache
    if (isDbConnected()) {
      const savedReport = await MatchReport.findOneAndUpdate(
        { matchId: matchData.matchId },
        fullReport,
        { upsert: true, new: true }
      );
      const reportObj = savedReport.toObject();
      reportObj.watsonxConfigured = !!process.env.WATSONX_AI_APIKEY;
      res.json(reportObj);
    } else {
      inMemoryReports.set(matchData.matchId, fullReport);
      const reportObj = { ...fullReport, watsonxConfigured: !!process.env.WATSONX_AI_APIKEY };
      res.json(reportObj);
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to analyze custom uploaded match data. Please verify your file structure.' });
  }
});

// Translate analysis
router.post('/translate/:id', async (req, res) => {
  const matchId = req.params.id;
  const { lang } = req.body;

  if (!lang) {
    return res.status(400).json({ error: 'Language code (lang) is required.' });
  }

  try {
    let report;

    // 1. Retrieve report
    if (isDbConnected()) {
      report = await MatchReport.findOne({ matchId });
    } else {
      report = inMemoryReports.get(matchId);
    }

    if (!report) {
      return res.status(404).json({ error: 'Match report not found. Analyze the match first.' });
    }

    // 2. Check if translation exists in cache
    const reportObj = isDbConnected() ? report.toObject() : report;
    if (reportObj.translations && reportObj.translations[lang]) {
      return res.json({ translated: reportObj.translations[lang] });
    }

    // 3. Perform translation
    console.log(`Translating report ${matchId} into language: ${lang}...`);
    
    // Simulate translation if Watsonx is not connected
    let translatedAnalysis;
    if (!isDbConnected() && !process.env.WATSONX_AI_APIKEY) {
      // Import the mock translator from tacticalEngine
      const { translateMockAnalysis } = await import('../services/tacticalEngine.js');
      translatedAnalysis = translateMockAnalysis(reportObj.analysis, lang);
    } else {
      translatedAnalysis = await translateAnalysisWithGranite(reportObj.analysis, lang);
    }

    // 4. Save back to cache
    if (isDbConnected()) {
      report.translations.set(lang, translatedAnalysis);
      await report.save();
    } else {
      report.translations[lang] = translatedAnalysis;
      inMemoryReports.set(matchId, report);
    }

    res.json({ translated: translatedAnalysis });
  } catch (error) {
    console.error(`Error translating report ${matchId} to ${lang}:`, error);
    res.status(500).json({ error: 'Failed to translate report.' });
  }
});

// Chatbot Q&A route conforming strictly to match_json_agent rules
router.post('/chatbot/message', async (req, res) => {
  const { matchId, message } = req.body;

  if (!matchId || !message) {
    return res.status(400).json({ error: 'matchId and message parameters are required.' });
  }

  try {
    let report;
    if (isDbConnected()) {
      report = await MatchReport.findOne({ matchId });
    } else {
      report = inMemoryReports.get(matchId);
    }

    if (!report) {
      return res.status(404).json({ error: 'Match data not found. Please analyze the match first.' });
    }

    const reportObj = isDbConnected() ? report.toObject() : report;
    console.log(`Chatbot processing QA question for match ${matchId}: "${message}"`);
    
    // We pass the core match statistics, timeline, dates, etc to the QA model
    const answer = await askGraniteAboutMatch(reportObj, message);
    res.json({ answer });
  } catch (error) {
    console.error('Chatbot message handler failed:', error);
    res.status(500).json({ error: 'Chatbot QA failed.' });
  }
});

// Chatbot Parser route converting raw description text to structured JSON
router.post('/chatbot/parse', async (req, res) => {
  const { rawText } = req.body;

  if (!rawText) {
    return res.status(400).json({ error: 'rawText parameter is required.' });
  }

  try {
    console.log('Chatbot compiling raw match text to structured JSON...');
    const parsedJson = await parseRawTextToMatchJson(rawText);
    res.json({ matchJson: parsedJson });
  } catch (error) {
    console.error('Chatbot parser handler failed:', error);
    res.status(500).json({ error: 'Chatbot conversion to JSON failed.' });
  }
});

export default router;
