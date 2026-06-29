import mongoose from 'mongoose';

const RefereeDecisionSchema = new mongoose.Schema({
  minute: Number,
  decision: String,
  ruling: String,
  explanation: String
});

const KeyPlayerSchema = new mongoose.Schema({
  name: String,
  team: String,
  impact: String
});

const MatchReportSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  homeScore: Number,
  awayScore: Number,
  homePenalties: Number,
  awayPenalties: Number,
  date: String,
  competition: String,
  venue: String,
  stats: {
    possession: { home: Number, away: Number },
    shots: { home: Number, away: Number },
    shotsOnTarget: { home: Number, away: Number },
    xG: { home: Number, away: Number },
    passes: { home: Number, away: Number },
    passAccuracy: { home: Number, away: Number },
    fouls: { home: Number, away: Number },
    yellowCards: { home: Number, away: Number },
    redCards: { home: Number, away: Number }
  },
  homeFormation: String,
  awayFormation: String,
  homeLineup: [mongoose.Schema.Types.Mixed],
  awayLineup: [mongoose.Schema.Types.Mixed],
  timeline: [mongoose.Schema.Types.Mixed],
  
  // Generated Analysis
  analysis: {
    summary: String,
    tactics: String,
    momentumAnalysis: String,
    refereeDecisions: [RefereeDecisionSchema],
    keyPlayers: [KeyPlayerSchema]
  },

  // Multilingual Cache: langCode -> Translated Analysis
  translations: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
});

const MatchReport = mongoose.model('MatchReport', MatchReportSchema);
export default MatchReport;
