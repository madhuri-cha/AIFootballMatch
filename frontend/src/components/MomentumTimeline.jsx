import React, { useState } from 'react';

/**
 * MomentumTimeline Component
 * Plots a custom interactive SVG graph representing match momentum changes.
 * Allows clicking on timeline dots or markers to explore tactical reasoning in detail.
 */
export default function MomentumTimeline({ 
  timeline = [], 
  homeTeam = 'Home Team', 
  awayTeam = 'Away Team', 
  onSelectEvent = () => {} 
}) {
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (timeline.length === 0) return null;

  // Determine max minute (standard 90 or extra time 120)
  const maxMinute = Math.max(...timeline.map(t => t.minute), 90);
  
  // SVG Canvas dimensions
  const svgWidth = 800;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Convert (minute, momentum) to SVG coordinates
  const getCoordinates = (minute, momentum) => {
    const x = paddingX + (minute / maxMinute) * chartWidth;
    // momentum is between -100 and +100.
    // +100 (Home Dominance) goes UP (closer to 0 on Y axis)
    // -100 (Away Dominance) goes DOWN (closer to height on Y axis)
    const y = (svgHeight / 2) - (momentum / 100) * (chartHeight / 2);
    return { x, y };
  };

  // Build the path string for the line
  let pathD = '';
  timeline.forEach((point, idx) => {
    const { x, y } = getCoordinates(point.minute, point.momentum);
    if (idx === 0) {
      pathD = `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  // Helper to check and render event icons
  const getEventColor = (type) => {
    switch (type) {
      case 'GOAL': return '#f59e0b'; // Gold
      case 'FOUL': return '#ef4444'; // Red (typically card/penalty fouls)
      case 'SUBSTITUTION': return '#10b981'; // Green
      default: return '#3b82f6';
    }
  };

  const getEventEmoji = (type) => {
    switch (type) {
      case 'GOAL': return '⚽';
      case 'FOUL': return '🚨';
      case 'SUBSTITUTION': return '🔄';
      default: return '📍';
    }
  };

  const handleMarkerHover = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTooltipPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top - 45
    });
    setHoveredEvent(item);
  };

  const handleMarkerLeave = () => {
    setHoveredEvent(null);
  };

  // Find all key events (goals, subs, major fouls)
  const events = timeline.filter(t => t.type);

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-title">
        <span>Interactive Momentum Analysis</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Click markers to explain key moments
        </span>
      </div>

      <div className="timeline-container">
        <div className="momentum-y-axis">
          <span>← {awayTeam} Dominance | {homeTeam} Dominance →</span>
        </div>

        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="momentum-svg"
          width="100%"
        >
          {/* Defs for gradients & glows */}
          <defs>
            <linearGradient id="grid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.02)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>

          {/* Grid background */}
          <rect x={paddingX} y={paddingY} width={chartWidth} height={chartHeight} fill="url(#grid-grad)" />

          {/* Zero/neutral momentum line */}
          <line 
            x1={paddingX} 
            y1={svgHeight / 2} 
            x2={svgWidth - paddingX} 
            y2={svgHeight / 2} 
            className="momentum-zero-line" 
          />

          {/* Minute indicators */}
          {[0, 15, 30, 45, 60, 75, 90, 105, 120].filter(m => m <= maxMinute).map((m) => {
            const { x } = getCoordinates(m, 0);
            return (
              <g key={`grid-line-${m}`}>
                <line 
                  x1={x} 
                  y1={paddingY} 
                  x2={x} 
                  y2={svgHeight - paddingY} 
                  className="momentum-grid-line" 
                />
                <text 
                  x={x} 
                  y={svgHeight - 4} 
                  fill="var(--text-secondary)" 
                  fontSize="9" 
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {m}'
                </text>
              </g>
            );
          })}

          {/* Momentum Line */}
          <path 
            d={pathD} 
            className="momentum-line momentum-line-home" // Fallback style
            style={{
              stroke: `url(#line-gradient)`
            }}
          />

          {/* Line Gradient: red for negative momentum (away), blue for positive (home) */}
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-home)" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="var(--accent-away)" />
          </linearGradient>

          {/* Interactive Event Markers */}
          {timeline.map((item, idx) => {
            const { x, y } = getCoordinates(item.minute, item.momentum);
            const isEvent = !!item.type;

            return (
              <circle
                key={`point-${idx}`}
                cx={x}
                cy={y}
                r={isEvent ? 6 : 3}
                fill={isEvent ? getEventColor(item.type) : '#94a3b8'}
                stroke="#0f172a"
                strokeWidth={isEvent ? 2 : 1}
                className="timeline-event-marker"
                onClick={() => onSelectEvent(item)}
                onMouseEnter={(e) => handleMarkerHover(e, item)}
                onMouseLeave={handleMarkerLeave}
                style={{
                  filter: isEvent ? `drop-shadow(0 0 4px ${getEventColor(item.type)})` : 'none'
                }}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredEvent && (
          <div 
            className="timeline-tooltip"
            style={{
              position: 'absolute',
              left: `${(tooltipPos.x / svgWidth) * 100}%`,
              top: `${tooltipPos.y - 10}px`,
              transform: 'translateX(-50%)',
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem' }}>
              <span style={{ fontWeight: 'bold', color: hoveredEvent.type ? getEventColor(hoveredEvent.type) : 'var(--accent-home)' }}>
                {getEventEmoji(hoveredEvent.type)} {hoveredEvent.minute}'
              </span>
              {hoveredEvent.type && (
                <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {hoveredEvent.type}
                </span>
              )}
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: '0.75rem', lineHeight: '1.4' }}>
              {hoveredEvent.description}
            </div>
          </div>
        )}
      </div>

      <div className="timeline-legends">
        <div className="legend-item">
          <div className="legend-dot home"></div>
          <span>{homeTeam} Control</span>
        </div>
        <div className="legend-item" style={{ gap: '0.8rem' }}>
          <span>⚽ Goal</span>
          <span>🚨 Foul/Card</span>
          <span>🔄 Sub</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot away"></div>
          <span>{awayTeam} Control</span>
        </div>
      </div>
    </div>
  );
}
