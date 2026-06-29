import React from 'react';

/**
 * TacticalPitch Component
 * Renders a visual 2D tactical football pitch with players positioned dynamically based on coordinate arrays.
 */
export default function TacticalPitch({ 
  homeLineup = [], 
  awayLineup = [], 
  homeTeam = 'Home Team', 
  awayTeam = 'Away Team', 
  homeFormation = '', 
  awayFormation = '' 
}) {
  return (
    <div className="glass-card">
      <div className="card-title">
        <span>Tactical Lineups</span>
        <span className="team-formation" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {homeFormation} vs {awayFormation}
        </span>
      </div>
      
      <div className="pitch-container">
        {/* Pitch markings */}
        <div className="pitch-marking pitch-midline"></div>
        <div className="pitch-marking pitch-center-circle"></div>
        <div className="pitch-marking pitch-center-spot"></div>
        <div className="pitch-marking pitch-penalty-home"></div>
        <div className="pitch-marking pitch-penalty-away"></div>
        
        {/* Render Home Team (Bottom half) */}
        {homeLineup.map((player, idx) => (
          <div 
            key={`home-player-${idx}`} 
            className="pitch-player home"
            style={{ 
              left: `${player.x}%`, 
              top: `${player.y}%` 
            }}
          >
            {player.number}
            <div className="player-tooltip">
              <strong>{player.name}</strong> ({player.position})
            </div>
          </div>
        ))}

        {/* Render Away Team (Top half) */}
        {awayLineup.map((player, idx) => (
          <div 
            key={`away-player-${idx}`} 
            className="pitch-player away"
            style={{ 
              left: `${player.x}%`, 
              top: `${player.y}%` 
            }}
          >
            {player.number}
            <div className="player-tooltip">
              <strong>{player.name}</strong> ({player.position})
            </div>
          </div>
        ))}
      </div>
      
      <div className="timeline-legends" style={{ marginTop: '1rem', justifyContent: 'center', gap: '2rem' }}>
        <div className="legend-item">
          <div className="legend-dot home"></div>
          <span style={{ fontWeight: 'bold' }}>{homeTeam}</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot away"></div>
          <span style={{ fontWeight: 'bold' }}>{awayTeam}</span>
        </div>
      </div>
    </div>
  );
}
