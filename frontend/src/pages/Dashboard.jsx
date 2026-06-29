import React, { useState, useEffect } from 'react';
import MomentumTimeline from '../components/MomentumTimeline';
import TacticalPitch from '../components/TacticalPitch';
import ChatbotPanel from '../components/ChatbotPanel';

export default function Dashboard() {
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  
  // Interactive Momentum Explainer state
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [language, setLanguage] = useState('en');
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      setPresets(data);
      if (data.length > 0) {
        setSelectedPresetId(data[0].matchId);
        analyzePreset(data[0].matchId);
      }
    } catch (err) {
      console.error('Error fetching presets:', err);
    }
  };

  const analyzePreset = async (matchId) => {
    setLoading(true);
    setLoadingMessage('Aggregating match stats & initializing IBM Granite analysis...');
    setSelectedEvent(null);
    setLanguage('en'); // Reset language to english for new analysis
    
    try {
      const res = await fetch(`/api/analyze/preset/${matchId}`, {
        method: 'POST'
      });
      const data = await res.json();
      setActiveReport(data);
      
      // Default select the first goal or sub event as the interactive highlighted event
      const firstImportantEvent = data.timeline.find(t => t.type === 'GOAL' || t.type === 'SUBSTITUTION');
      if (firstImportantEvent) {
        setSelectedEvent(firstImportantEvent);
      }
    } catch (err) {
      console.error('Error analyzing preset:', err);
      alert('Failed to analyze match. Please check server logs.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (matchId) => {
    setSelectedPresetId(matchId);
    analyzePreset(matchId);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setLoading(true);
      setLoadingMessage('Parsing custom match logs and feeding into IBM Granite tactical compiler...');
      setSelectedEvent(null);
      setLanguage('en');
      
      try {
        const matchData = JSON.parse(event.target.result);
        const res = await fetch('/api/analyze/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(matchData)
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to upload custom file');
        }

        const data = await res.json();
        setActiveReport(data);
        
        // Select first major event
        const firstEvent = data.timeline.find(t => t.type);
        if (firstEvent) setSelectedEvent(firstEvent);
      } catch (err) {
        console.error('Upload error:', err);
        alert(err.message || 'Error parsing custom match file. Please make sure it matches the required JSON template.');
      } finally {
        setLoading(false);
        // Clear input value to allow uploading same file
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (!activeReport) return;

    if (newLang === 'en') {
      // English is the baseline, re-run analysis/load preset to restore original
      analyzePreset(activeReport.matchId);
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch(`/api/translate/${activeReport.matchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lang: newLang })
      });
      const data = await res.json();
      
      // Update active report with translated analysis
      setActiveReport(prev => ({
        ...prev,
        analysis: data.translated
      }));
    } catch (err) {
      console.error('Translation error:', err);
      alert('Failed to translate the analysis.');
    } finally {
      setTranslating(false);
    }
  };

  const handleLoadMatchJson = async (parsedJson) => {
    setLoading(true);
    setLoadingMessage('Loading parsed JSON into dashboard and compiling tactical overview...');
    try {
      const res = await fetch('/api/analyze/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedJson)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload/analyze parsed JSON');
      }

      const data = await res.json();
      setActiveReport(data);
      setSelectedEvent(data.timeline.find(t => t.type) || null);
    } catch (err) {
      console.error(err);
      alert('Failed to load match JSON: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageLabel = (code) => {
    switch (code) {
      case 'es': return 'Spanish';
      case 'fr': return 'French';
      case 'de': return 'German';
      case 'ar': return 'Arabic';
      case 'it': return 'Italian';
      case 'pt': return 'Portuguese';
      default: return 'English';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header controls & file upload */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Match Analytics Hub</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Select a legendary match preset or upload your custom match statistics to start analyzing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label className="btn-primary" style={{ display: 'inline-flex', cursor: 'pointer' }}>
              <span>📤 Upload Match JSON</span>
              <input 
                type="file" 
                accept=".json" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
            </label>
            <a 
              href="data:text/json;charset=utf-8,%7B%22matchId%22%3A%22custom_match_1%22%2C%22homeTeam%22%3A%22TeamA%22%2C%22awayTeam%22%3A%22TeamB%22%2C%22homeScore%22%3A1%2C%22awayScore%22%3A0%2C%22stats%22%3A%7B%22possession%22%3A%7B%22home%22%3A50%2C%22away%22%3A50%7D%2C%22shots%22%3A%7B%22home%22%3A10%2C%22away%22%3A8%7D%2C%22shotsOnTarget%22%3A%7B%22home%22%3A5%2C%22away%22%3A3%7D%2C%22xG%22%3A%7B%22home%22%3A1.2%2C%22away%22%3A0.8%7D%2C%22passes%22%3A%7B%22home%22%3A400%2C%22away%22%3A380%7D%2C%22passAccuracy%22%3A%7B%22home%22%3A80%2C%22away%22%3A78%7D%2C%22fouls%22%3A%7B%22home%22%3A12%2C%22away%22%3A15%7D%2C%22yellowCards%22%3A%7B%22home%22%3A1%2C%22away%22%3A2%7D%2C%22redCards%22%3A%7B%22home%22%3A0%2C%22away%22%3A0%7D%7D%2C%22homeFormation%22%3A%224-3-3%22%2C%22awayFormation%22%3A%224-2-3-1%22%2C%22homeLineup%22%3A%5B%7B%22name%22%3A%22GK%22%2C%22number%22%3A1%2C%22position%22%3A%22GK%22%2C%22x%22%3A50%2C%22y%22%3A90%7D%5D%2C%22awayLineup%22%3A%5B%7B%22name%22%3A%22GK%22%2C%22number%22%3A1%2C%22position%22%3A%22GK%22%2C%22x%22%3A50%2C%22y%22%3A10%7D%5D%2C%22timeline%22%3A%5B%7B%22minute%22%3A0%2C%22momentum%22%3A0%2C%22description%22%3A%22Kickoff%22%7D%2C%7B%22minute%22%3A45%2C%22momentum%22%3A50%2C%22type%22%3A%22GOAL%22%2C%22team%22%3A%22TeamA%22%2C%22description%22%3A%22Goal%20for%20TeamA%22%7D%5D%7D"
              download="match_template.json"
              className="file-template-link"
            >
              📥 Download Custom JSON Template
            </a>
          </div>
        </div>
        
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <div className="preset-section">
            <h4 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              Select Preset World Cup / Legendary Match:
            </h4>
            <div className="preset-grid">
              {presets.map((preset) => (
                <div 
                  key={preset.matchId}
                  className={`preset-card ${selectedPresetId === preset.matchId ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(preset.matchId)}
                >
                  <div className="preset-card-meta">{preset.competition}</div>
                  <div className="preset-card-title">
                    {preset.homeTeam} vs {preset.awayTeam}
                  </div>
                  <div className="preset-card-score">
                    {preset.homeScore} - {preset.awayScore}
                    {preset.homePenalties !== undefined && ` (${preset.homePenalties}-${preset.awayPenalties} pens)`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card loading-container">
          <div className="spinner"></div>
          <div className="loading-text">{loadingMessage}</div>
        </div>
      ) : activeReport ? (
        <>
          {/* Scoreboard block */}
          <div className="scoreboard">
            <div className="scoreboard-team home">
              <span className="team-name">{activeReport.homeTeam}</span>
              <span className="team-formation">{activeReport.homeFormation}</span>
            </div>
            
            <div className="scoreboard-score-container">
              <span className="scoreboard-score">
                {activeReport.homeScore} - {activeReport.awayScore}
              </span>
              {activeReport.homePenalties !== undefined && (
                <span className="scoreboard-penalties">
                  ({activeReport.homePenalties} - {activeReport.awayPenalties} Penalties)
                </span>
              )}
            </div>
            
            <div className="scoreboard-team away">
              <span className="team-name">{activeReport.awayTeam}</span>
              <span className="team-formation">{activeReport.awayFormation}</span>
            </div>
            
            <div className="scoreboard-meta">
              <span>🏟️ {activeReport.venue}</span> | <span>📅 {activeReport.date}</span>
            </div>
          </div>

          {/* Interactive Momentum Timeline */}
          <MomentumTimeline 
            timeline={activeReport.timeline} 
            homeTeam={activeReport.homeTeam} 
            awayTeam={activeReport.awayTeam}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
          />

          {/* Interactive Momentum Explainer Panel */}
          {selectedEvent && (
            <div className="timeline-explainer-card">
              <div className="timeline-explainer-header">
                <span>Momentum Highlight</span>
                <span className="timeline-explainer-minute">{selectedEvent.minute}'</span>
                {selectedEvent.type && (
                  <span className="logo-badge" style={{ fontSize: '0.6rem' }}>
                    {selectedEvent.type}
                  </span>
                )}
              </div>
              <div className="timeline-explainer-body">
                <strong>Event description:</strong> {selectedEvent.description}
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  💡 <em>Tactical insight:</em> This event triggered a momentum rating of <strong>{selectedEvent.momentum}</strong> (where positive values represent {activeReport.homeTeam} control and negative represent {activeReport.awayTeam}). Look at the tactical layout below to see the player positioning associated with this match phase.
                </div>
              </div>
            </div>
          )}

          {/* Grid Layout for Pitch, Stats, and AI Explanations */}
          <div className="dashboard-grid">
            {/* Left Column: AI Explainer Content */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-title">
                <span>AI Granite Explainer Dashboard</span>
                
                {/* Multilingual Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="status-badge">
                    <span className={`status-dot ${activeReport.watsonxConfigured ? 'green' : 'yellow'}`}></span>
                    {activeReport.watsonxConfigured ? 'Granite Engine' : 'Simulation Mode'}
                  </span>
                  <select 
                    className="select-custom" 
                    value={language}
                    onChange={handleLanguageChange}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    disabled={translating}
                  >
                    <option value="en">English (Baseline)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="ar">العربية (Arabic)</option>
                    <option value="it">Italiano (Italian)</option>
                    <option value="pt">Português (Portuguese)</option>
                  </select>
                </div>
              </div>

              {translating ? (
                <div className="loading-container" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
                  <div className="loading-text" style={{ fontSize: '0.9rem' }}>Translating tactical report using IBM Granite...</div>
                </div>
              ) : (
                <>
                  {/* Explainer Tabs */}
                  <div className="tabs-header">
                    <button 
                      className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                      onClick={() => setActiveTab('summary')}
                    >
                      Match Summary
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'tactics' ? 'active' : ''}`}
                      onClick={() => setActiveTab('tactics')}
                    >
                      Tactics & Subs
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'momentum' ? 'active' : ''}`}
                      onClick={() => setActiveTab('momentum')}
                    >
                      Momentum Swings
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'referee' ? 'active' : ''}`}
                      onClick={() => setActiveTab('referee')}
                    >
                      VAR & Rulings ({activeReport.analysis.refereeDecisions.length})
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                      onClick={() => setActiveTab('players')}
                    >
                      Key Performers
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="tab-content">
                    {activeTab === 'summary' && (
                      <div>
                        <h3>Narrative Summary ({getLanguageLabel(language)})</h3>
                        <p style={{ fontSize: '1.05rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                          {activeReport.analysis.summary}
                        </p>
                        <div style={{ marginTop: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tactical Overview</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                            <div>
                              <strong>{activeReport.homeTeam}:</strong> {activeReport.homeFormation} formation focusing on controlled possession phase and high transition counter pressing.
                            </div>
                            <div>
                              <strong>{activeReport.awayTeam}:</strong> {activeReport.awayFormation} formation targeting rapid counters and exploiting vertical flank channels.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'tactics' && (
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {/* Format markdown manually if it has formatting or display directly */}
                        {activeReport.analysis.tactics.split('\n').map((line, idx) => {
                          if (line.startsWith('###')) {
                            return <h3 key={idx}>{line.replace('###', '')}</h3>;
                          } else if (line.startsWith('-')) {
                            return <li key={idx}>{line.substring(2)}</li>;
                          }
                          return <p key={idx}>{line}</p>;
                        })}
                      </div>
                    )}

                    {activeTab === 'momentum' && (
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {activeReport.analysis.momentumAnalysis.split('\n').map((line, idx) => {
                          if (line.startsWith('###')) {
                            return <h3 key={idx}>{line.replace('###', '')}</h3>;
                          } else if (line.startsWith('-')) {
                            return <li key={idx}>{line.substring(2)}</li>;
                          }
                          return <p key={idx}>{line}</p>;
                        })}
                      </div>
                    )}

                    {activeTab === 'referee' && (
                      <div>
                        <h3 style={{ marginBottom: '1rem' }}>Referee Decisions Explained</h3>
                        {activeReport.analysis.refereeDecisions.length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            No major VAR or referee rulings reviewed for this match.
                          </p>
                        ) : (
                          activeReport.analysis.refereeDecisions.map((decision, idx) => (
                            <div key={`decision-${idx}`} className="ruling-card">
                              <div className="ruling-header">
                                <div className="ruling-title">
                                  <span className="ruling-minute">{decision.minute}'</span>
                                  <span>{decision.decision}</span>
                                </div>
                                <span className={`ruling-verdict ${decision.ruling.toLowerCase().includes('correct') ? 'correct' : 'controversial'}`}>
                                  {decision.ruling}
                                </span>
                              </div>
                              <div className="ruling-desc">{decision.explanation}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === 'players' && (
                      <div>
                        <h3 style={{ marginBottom: '1rem' }}>Key Player tactical impact</h3>
                        <div className="players-grid">
                          {activeReport.analysis.keyPlayers.map((player, idx) => (
                            <div key={`player-${idx}`} className="player-card">
                              <span className="player-card-name">{player.name}</span>
                              <span className="player-card-team">{player.team}</span>
                              <p className="player-card-desc">{player.impact}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Visual Layouts (Pitch & Statistics) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Tactical Pitch Component */}
              <TacticalPitch 
                homeLineup={activeReport.homeLineup}
                awayLineup={activeReport.awayLineup}
                homeTeam={activeReport.homeTeam}
                awayTeam={activeReport.awayTeam}
                homeFormation={activeReport.homeFormation}
                awayFormation={activeReport.awayFormation}
              />

              {/* Statistics Grid */}
              <div className="glass-card">
                <div className="card-title">Match Statistics</div>
                <div className="stats-grid">
                  {Object.entries(activeReport.stats).map(([key, value]) => {
                    // Capitalize first letter and format camelcase
                    const label = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase());
                    
                    const homeVal = value.home;
                    const awayVal = value.away;
                    
                    // Calculate percentages for the visual slider bars
                    const total = homeVal + awayVal;
                    const homePercent = total > 0 ? (homeVal / total) * 100 : 50;
                    
                    return (
                      <div key={key} className="stat-row">
                        <div className="stat-info">
                          <span>{homeVal}</span>
                          <span className="stat-label">{label}</span>
                          <span>{awayVal}</span>
                        </div>
                        <div className="stat-bar-container">
                          <div 
                            className="stat-bar-home" 
                            style={{ width: `${homePercent}%` }}
                          ></div>
                          <div 
                            className="stat-bar-away" 
                            style={{ width: `${100 - homePercent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* AI Match JSON Chatbot Agent */}
              <ChatbotPanel 
                activeMatchReport={activeReport}
                onLoadMatchJson={handleLoadMatchJson}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <h3>No Match Data Loaded</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Please select a preset above or upload a match JSON log.
          </p>
        </div>
      )}
    </div>
  );
}
