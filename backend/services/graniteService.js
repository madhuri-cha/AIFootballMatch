import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import dotenv from 'dotenv';
import { generateMockGraniteAnalysis } from './tacticalEngine.js';

dotenv.config();

const apiKey = process.env.WATSONX_AI_APIKEY;
const projectId = process.env.WATSONX_AI_PROJECT_ID;
const serviceUrl = process.env.WATSONX_AI_URL || 'https://us-south.ml.cloud.ibm.com';

let watsonxService = null;

if (apiKey && projectId) {
  try {
    watsonxService = new WatsonXAI({
      version: '2024-05-31',
      serviceUrl: serviceUrl,
    });
    console.log('Watsonx.ai Client initialized successfully.');
  } catch (error) {
    console.error('Error creating Watsonx.ai service:', error);
  }
} else {
  console.log('Watsonx API key or Project ID not set. System running in local rules-based simulation mode.');
}

/**
 * Invokes IBM Granite to perform tactical analysis on match data.
 * Falls back to rules-based local compiler if client is not configured.
 */
export async function analyzeMatchWithGranite(matchData) {
  if (!watsonxService) {
    console.log('Using Mock/Rules-Engine for match analysis.');
    return generateMockGraniteAnalysis(matchData);
  }

  const prompt = `
You are an expert tactical football analyst and coach, specializing in breaking down games for casual and enthusiastic fans alike.
Analyze the following football match statistics and events, and provide a comprehensive, engaging tactical and momentum breakdown.

MATCH DATA:
Home Team: ${matchData.homeTeam} (${matchData.homeFormation})
Away Team: ${matchData.awayTeam} (${matchData.awayFormation})
Score: ${matchData.homeTeam} ${matchData.homeScore} - ${matchData.awayScore} ${matchData.awayTeam} ${matchData.homePenalties !== undefined ? `(Penalties: ${matchData.homePenalties}-${matchData.awayPenalties})` : ''}
Statistics: ${JSON.stringify(matchData.stats, null, 2)}

Timeline Events:
${JSON.stringify(matchData.timeline.map(t => ({ minute: t.minute, type: t.type, team: t.team, desc: t.description })), null, 2)}

Referee Decisions to Review:
${JSON.stringify(matchData.refereeRulings || [], null, 2)}

INSTRUCTIONS:
Provide your analysis strictly in JSON format. Do not write any text outside of the JSON block. The JSON must match this structure exactly:
{
  "summary": "A 3-4 sentence engaging summary narrative of the match, highlighting its flow and outcome.",
  "tactics": "A detailed analysis in Markdown format covering: 1. Formation clash and spatial control. 2. Impact of key substitutions (detail specific minutes and players). 3. Tactical shifts made by either coach.",
  "momentumAnalysis": "An analysis in Markdown format explaining: 1. Who dominated key periods and why. 2. The tactical reasons behind the main spikes and swings in momentum. 3. How goals or red cards altered the game flow.",
  "refereeDecisions": [
    {
      "minute": 21,
      "decision": "Decision Name",
      "ruling": "e.g., Correct Decision / Controversial / Error",
      "explanation": "Provide a simplified, expert explanation of the rule applied and why the decision was made, making it understandable for a casual fan."
    }
  ],
  "keyPlayers": [
    {
      "name": "Player Name",
      "team": "Team Name",
      "impact": "Detailed explanation of their tactical role, visual impact, and how they influenced the game."
    }
  ]
}
`;

  try {
    const params = {
      modelId: 'ibm/granite-3-8b-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a professional football tactical analyst. You always return output strictly as a valid JSON object matching the requested structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      projectId: projectId,
    };

    const response = await watsonxService.generateChat(params);
    const content = response.result.choices[0].message.content.trim();
    
    // Clean up potential markdown formatting wrapping the JSON
    let cleanJson = content;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Granite API call failed, falling back to local simulation:', error);
    return generateMockGraniteAnalysis(matchData);
  }
}

/**
 * Translates match analysis elements into the target language using IBM Granite.
 * Falls back to rules-based translator if credentials are not configured.
 */
export async function translateAnalysisWithGranite(analysis, targetLanguage) {
  if (!watsonxService) {
    console.log('Using local rules-based translation.');
    // Simple mock translation
    return analysis;
  }

  const prompt = `
You are a professional multilingual sports translator. Translate the following football match analysis JSON into the language code: "${targetLanguage}" (e.g., es = Spanish, fr = French, de = German, ar = Arabic, it = Italian, pt = Portuguese).

Ensure the output is written in standard football terminology for the target language. Do not translate player names, team names, or timestamps, but translate all descriptions, explanations, and analyses.

ANALYSIS JSON TO TRANSLATE:
${JSON.stringify(analysis, null, 2)}

INSTRUCTIONS:
Return the translated analysis strictly in JSON format matching the original keys ("summary", "tactics", "momentumAnalysis", "refereeDecisions", "keyPlayers"). Do not include any text outside the JSON.
`;

  try {
    const params = {
      modelId: 'ibm/granite-3-8b-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a professional football translator. Always output only valid JSON matching the exact key structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      projectId: projectId,
    };

    const response = await watsonxService.generateChat(params);
    const content = response.result.choices[0].message.content.trim();

    let cleanJson = content;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Granite translation call failed:', error);
    return analysis;
  }
}

/**
 * Chatbot QA using IBM Granite.
 */
export async function askGraniteAboutMatch(matchJson, userQuestion) {
  if (!watsonxService) {
    const { generateMockChatbotAnswer } = await import('./tacticalEngine.js');
    return generateMockChatbotAnswer(matchJson, userQuestion);
  }
  
  const systemPrompt = `
You are the match_json_agent.
Your only job is to answer specific user questions strictly using the provided match JSON data.

Rules:
1. Use only the information available in the match JSON. Do not guess, invent, or add extra context.
2. If the user asks a question that is not specific enough (e.g., "tell me about the match", "what happened", "explain the match"), reply exactly:
   "Please ask a specific question such as final score, scorers, cards, possession, or substitutions."
3. If the answer is not present in the JSON, reply exactly:
   "I don't have enough information in the match data."
4. Keep answers short, direct, and factual. Use only one exact response relevant to the question. Do not provide long explanations.
5. If the user asks a question, return a concise natural-language answer only. No formatting other than plain text.
6. If the user asks about the match JSON file, explain it in simple language (do not assume the user knows what JSON is, and do not use technical language unless they ask for it):
   - Tell them they can upload a match data file,
   - Tell them the file may be a JSON file or other exported match data,
   - Tell them the file should contain teams, score, players, timeline events, and statistics,
   - Tell them that if they do not have a file, they can copy and paste the match text details manually in the 'Text-to-JSON' tab at the top of this panel, and I will compile the visual dashboard for them.
`;

  const promptText = `
MATCH JSON DATA:
${JSON.stringify(matchJson, null, 2)}

USER QUESTION:
"${userQuestion}"
`;

  try {
    const params = {
      modelId: 'ibm/granite-3-8b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText }
      ],
      projectId: projectId,
    };

    const response = await watsonxService.generateChat(params);
    return response.result.choices[0].message.content.trim();
  } catch (error) {
    console.error('Granite QA call failed, falling back to local simulation:', error);
    const { generateMockChatbotAnswer } = await import('./tacticalEngine.js');
    return generateMockChatbotAnswer(matchJson, userQuestion);
  }
}

/**
 * Converts raw match description text to structured JSON using IBM Granite.
 */
export async function parseRawTextToMatchJson(rawText) {
  if (!watsonxService) {
    const { generateMockParsedJson } = await import('./tacticalEngine.js');
    return generateMockParsedJson(rawText);
  }

  const systemPrompt = `
You are the match_json_agent.
Your job is to convert the provided raw football match text description into valid, structured JSON conforming to the requested schema.

JSON structure schema:
{
  "matchId": "unique_lowercase_id",
  "homeTeam": "Home Team Name",
  "awayTeam": "Away Team Name",
  "homeScore": 0,
  "awayScore": 0,
  "date": "Date of match",
  "venue": "Stadium Name",
  "stats": {
    "possession": { "home": 50, "away": 50 },
    "shots": { "home": 0, "away": 0 },
    "shotsOnTarget": { "home": 0, "away": 0 },
    "xG": { "home": 0.0, "away": 0.0 },
    "passes": { "home": 0, "away": 0 },
    "passAccuracy": { "home": 0, "away": 0 },
    "fouls": { "home": 0, "away": 0 },
    "yellowCards": { "home": 0, "away": 0 },
    "redCards": { "home": 0, "away": 0 }
  },
  "homeFormation": "e.g., 4-3-3",
  "awayFormation": "e.g., 4-2-3-1",
  "homeLineup": [], // Array of { name, number, position, x, y }
  "awayLineup": [], // Array of { name, number, position, x, y }
  "timeline": [],   // Array of { minute, period, type (GOAL, FOUL, SUBSTITUTION), team, player, description, momentum }
  "refereeRulings": [] // Array of { minute, decision, ruling, explanation }
}

Rules:
1. Extract as many fields as possible from the raw text.
2. If lineups or player coordinates are missing, generate standard positions based on the extracted formation (x goes from 0-100, y goes from 50-100 for home, and 0-50 for away).
3. If specific stats are missing, estimate or default to standard averages based on the score and events described.
4. If the timeline is missing, create a simple list of key goal/card events described in the text.
5. Return ONLY a valid, parseable JSON block. Do not write any explanations or text outside the JSON.
`;

  try {
    const params = {
      modelId: 'ibm/granite-3-8b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText }
      ],
      projectId: projectId,
    };

    const response = await watsonxService.generateChat(params);
    let cleanJson = response.result.choices[0].message.content.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    return JSON.parse(cleanJson.trim());
  } catch (error) {
    console.error('Granite JSON Parse call failed, falling back to local simulation:', error);
    const { generateMockParsedJson } = await import('./tacticalEngine.js');
    return generateMockParsedJson(rawText);
  }
}
