import React, { useState, useEffect, useRef } from 'react';

/**
 * ChatbotPanel Component
 * Operates the match_json_agent interface:
 * Mode 1: Strict Match Q&A - answers specific factual questions about the currently loaded match JSON.
 * Mode 2: Match Parser - converts pasted raw match text into structured JSON, which can then be downloaded or loaded directly.
 */
export default function ChatbotPanel({ activeMatchReport, onLoadMatchJson }) {
  const [activeMode, setActiveMode] = useState('qa'); // 'qa' or 'parser'
  
  // Q&A Chat State
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'agent',
      text: "Hello! I am the match_json_agent. Ask me specific questions about the currently loaded match (e.g. final score, scorers, cards, substitutions, possession, or man of the match)."
    }
  ]);
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);

  // Parser State
  const [rawText, setRawText] = useState('');
  const [parsedJson, setParsedJson] = useState(null);
  const [parserLoading, setParserLoading] = useState(false);

  const chatEndRef = useRef(null);

  // Scroll to bottom of chat history when a new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Reset chat when active match changes
  useEffect(() => {
    if (activeMatchReport) {
      setChatHistory([
        {
          sender: 'agent',
          text: `Match loaded: "${activeMatchReport.homeTeam} vs ${activeMatchReport.awayTeam}". Ask me specific questions about this game.`
        }
      ]);
    }
  }, [activeMatchReport]);

  const handleSendQaMessage = async (e) => {
    e.preventDefault();
    if (!qaInput.trim() || !activeMatchReport) return;

    const userMsg = qaInput.trim();
    setQaInput('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setQaLoading(true);

    try {
      const res = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: activeMatchReport.matchId,
          message: userMsg
        })
      });

      if (!res.ok) throw new Error('Chatbot request failed');
      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'agent', text: data.answer }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { sender: 'agent', text: "Error: Failed to fetch reply from AI agent." }]);
    } finally {
      setQaLoading(false);
    }
  };

  const handleParseText = async () => {
    if (!rawText.trim()) return;

    setParsedJson(null);
    setParserLoading(true);

    try {
      const res = await fetch('/api/chatbot/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawText.trim() })
      });

      if (!res.ok) throw new Error('Parsing request failed');
      const data = await res.json();
      setParsedJson(data.matchJson);
    } catch (err) {
      console.error(err);
      alert('Failed to parse match data. Please try entering a different text format.');
    } finally {
      setParserLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!parsedJson) return;
    const blob = new Blob([JSON.stringify(parsedJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${parsedJson.matchId || 'parsed_match'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadIntoDashboard = () => {
    if (!parsedJson) return;
    onLoadMatchJson(parsedJson);
    setActiveMode('qa');
    alert('Parsed match JSON loaded successfully into the dashboard!');
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '420px', padding: '1rem' }}>
      {/* Mode Switches */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem', paddingBottom: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--accent-home)' }}>💬 match_json_agent</span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            className="tab-btn" 
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderBottom: activeMode === 'qa' ? '2px solid var(--accent-home)' : 'none' }}
            onClick={() => setActiveMode('qa')}
          >
            Factual Q&A
          </button>
          <button 
            className="tab-btn" 
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderBottom: activeMode === 'parser' ? '2px solid var(--accent-home)' : 'none' }}
            onClick={() => setActiveMode('parser')}
          >
            Text-to-JSON
          </button>
        </div>
      </div>

      {/* Mode 1: Strict Q&A Interface */}
      {activeMode === 'qa' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Messages view */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem', marginBottom: '0.75rem' }}>
            {chatHistory.map((msg, idx) => (
              <div 
                key={`msg-${idx}`} 
                style={{ 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: msg.sender === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  color: msg.sender === 'user' ? '#ffffff' : '#e2e8f0'
                }}
              >
                {msg.text}
              </div>
            ))}
            {qaLoading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.4rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span className="status-dot green" style={{ width: '5px', height: '5px', animation: 'spin 1s infinite' }}></span>
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input bar */}
          <form onSubmit={handleSendQaMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="select-custom" 
              style={{ flex: 1, fontSize: '0.85rem', padding: '0.4rem 0.75rem' }} 
              placeholder={activeMatchReport ? "Ask about scorers, cards, MOTM..." : "Please load a match first..."}
              value={qaInput}
              onChange={(e) => setQaInput(e.target.value)}
              disabled={qaLoading || !activeMatchReport}
            />
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              disabled={qaLoading || !activeMatchReport || !qaInput.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Mode 2: Match Parser Interface */}
      {activeMode === 'parser' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: '0.75rem' }}>
          {parserLoading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Compiling text into structured JSON schema...</span>
            </div>
          ) : parsedJson ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>
                {JSON.stringify(parsedJson, null, 2)}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--accent-tactical), #047857)' }}
                  onClick={handleLoadIntoDashboard}
                >
                  🟢 Load into Field
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', background: '#334155' }}
                  onClick={handleDownloadJson}
                >
                  💾 Download JSON
                </button>
                <button 
                  className="btn-primary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#475569' }}
                  onClick={() => setParsedJson(null)}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PASTE RAW MATCH STATISTICS / TEXT:</span>
              <textarea 
                className="select-custom" 
                style={{ flex: 1, resize: 'none', fontSize: '0.8rem', fontFamily: 'inherit', padding: '0.5rem', lineHeight: '1.4' }}
                placeholder="Example: Spain against Germany. Final Score 2-1 on June 2026. Morata scored first in 45th min. Wirtz equalized for Germany in 80th min. Olmo scored the winner for Spain in 115th min of extra time. Yellow cards: Spain 3, Germany 4. Venue: Stuttgart Arena."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <button 
                className="btn-primary" 
                style={{ alignSelf: 'flex-end', padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}
                onClick={handleParseText}
                disabled={!rawText.trim()}
              >
                Parse into JSON
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
