/**
 * Tactical Engine Service
 * Pre-analyzes match statistics, timelines, and events to extract tactical features.
 * Also provides an intelligent rules-based Mock Generator if Watsonx credentials are missing.
 */

export function analyzeMatchTactics(matchData) {
  const { homeTeam, awayTeam, stats, homeFormation, awayFormation, timeline, refereeRulings } = matchData;
  
  // 1. xG and Stats analysis
  const homeXG = stats.xG?.home || 0;
  const awayXG = stats.xG?.away || 0;
  const xGDiff = Math.abs(homeXG - awayXG);
  const dominantXG = homeXG > awayXG ? homeTeam : awayTeam;
  const underXG = homeXG > awayXG ? awayTeam : homeTeam;
  
  // 2. Identify Tactical Changes (Substitutions and formations)
  const homeSubs = timeline.filter(t => t.type === 'SUBSTITUTION' && t.team === homeTeam);
  const awaySubs = timeline.filter(t => t.type === 'SUBSTITUTION' && t.team === awayTeam);
  
  // 3. Find key momentum shifts
  const keySwings = [];
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1];
    const curr = timeline[i];
    const diff = curr.momentum - prev.momentum;
    
    // Major shift if momentum changes by > 40 points or direction flips significantly
    if (Math.abs(diff) >= 40 || (prev.momentum > 0 && curr.momentum < -10) || (prev.momentum < 0 && curr.momentum > 10)) {
      keySwings.push({
        minute: curr.minute,
        fromMomentum: prev.momentum,
        toMomentum: curr.momentum,
        direction: curr.momentum > prev.momentum ? homeTeam : awayTeam,
        event: curr.type || 'PLAY_FLOW',
        description: curr.description
      });
    }
  }

  // 4. Formations clash assessment
  let formationClashDesc = '';
  if (homeFormation.includes('4-3-3') && awayFormation.includes('4-2-3-1')) {
    formationClashDesc = `Classic tactical mismatch. ${homeTeam}'s 3-man midfield (De Paul, Enzo, Mac Allister) matches up directly against ${awayTeam}'s double pivot, but the positioning of the Advanced Midfielder (Griezmann) creates a crucial spatial battle in the central zones. ${homeTeam} attempted to bypass this by utilizing wide wingers to stretch ${awayTeam}'s fullbacks.`;
  } else if (homeFormation.includes('4-4-2-diamond') && awayFormation.includes('4-4-1-1')) {
    formationClashDesc = `${homeTeam}'s narrow Diamond midfield packed the center of the pitch, creating an overload. Kaká operated freely behind ${awayTeam}'s double pivot of Gerrard and Alonso. To combat this, ${awayTeam} had to adapt in the second half, shifting to a 3-5-2 to insert Didi Hamann as a dedicated defensive screen.`;
  } else {
    formationClashDesc = `A tactical battle between ${homeTeam}'s ${homeFormation} and ${awayTeam}'s ${awayFormation}. ${homeTeam} focused on maintaining central possession while ${awayTeam} looked to exploit wide channels or transition play.`;
  }

  return {
    homeTeam,
    awayTeam,
    statsSummary: {
      xgComparison: `${homeTeam} (${homeXG} xG) vs ${awayTeam} (${awayXG} xG). ${xGDiff > 0.5 ? `${dominantXG} was much more effective at creating high-quality scoring chances compared to ${underXG}.` : 'Both teams created similar quality chances, indicating a highly competitive tactical balance.'}`,
      possessionPhase: `${homeTeam} controlled ${stats.possession.home}% of the ball, forcing ${awayTeam} (${stats.possession.away}%) to play primarily in a medium-to-low block.`,
      conversionRate: `${homeTeam} had ${stats.shotsOnTarget.home} shots on target from ${stats.shots.home} total attempts. ${awayTeam} recorded ${stats.shotsOnTarget.away} from ${stats.shots.away} shots.`
    },
    formationClash: formationClashDesc,
    tacticalSubs: {
      home: homeSubs.map(s => ({ minute: s.minute, detail: s.description })),
      away: awaySubs.map(s => ({ minute: s.minute, detail: s.description }))
    },
    keySwings,
    refereeRulingsCount: refereeRulings?.length || 0
  };
}

/**
 * Generates high-fidelity mock explanations matching the IBM Granite output structure.
 * This guarantees the system functions beautifully with realistic, comprehensive responses when WATSONX is not set.
 */
export function generateMockGraniteAnalysis(matchData) {
  const meta = analyzeMatchTactics(matchData);
  const { homeTeam, awayTeam, stats, homeFormation, awayFormation, refereeRulings } = matchData;

  const isWorldCup = matchData.matchId === 'argentina_france_2022';
  const isIstanbul = matchData.matchId === 'liverpool_milan_2005';

  if (isWorldCup) {
    return {
      summary: `The 2022 World Cup Final between Argentina and France will go down as one of the greatest matches in football history. Argentina dominated the first 75 minutes, executing Lionel Scaloni's tactical plan to perfection by squeezing France's midfield and exploiting the left wing through Angel Di María. However, Didier Deschamps' drastic double substitution in the 41st minute eventually paid dividends. Shifting to a direct, athletic 4-2-4 bypass, France capitalized on Argentinian fatigue. Kylian Mbappé's sensational 97-second brace completely overturned the momentum, leading to a dramatic extra-time exchange and a penalty shootout where Argentina ultimately triumphed 4-2.`,
      tactics: `
### Formation Clash
Argentina's **4-3-3** vs France's **4-2-3-1**.
- **Argentina's Left-Wing Exploitation**: Lionel Scaloni placed Angel Di María on the left flank rather than his usual right. This caught France completely off-guard. Di María stretched France's right-back Jules Koundé and isolated Ousmane Dembélé, earning the penalty for the first goal and scoring the second.
- **Midfield Overload**: Enzo Fernández, Rodrigo De Paul, and Alexis Mac Allister formed a compact triangle that completely choked Antoine Griezmann out of the match, forcing him to drop extremely deep.

### Key Substitutions
- **41st Minute (France)**: Giroud and Dembélé OUT, Kolo Muani and Thuram IN. Deschamps recognized that France was losing every physical duel. This shifted France to a highly direct, fast 4-2-4, bypassing the midfield entirely.
- **64th Minute (Argentina)**: Di María OUT, Marcos Acuña IN. Scaloni attempted to lock down the left side and transition into a defensive 4-4-2. However, this removed Argentina's primary counter-attacking outlet, allowing France's fullbacks to push high and squeeze play.
      `,
      momentumAnalysis: `
### Momentum Timeline Breakdown
- **0' - 75' (Argentina Dominance - Momentum +80)**: Argentina's counter-press was elite. France recorded 0 shots in the first half and struggled to complete passes in the final third. The momentum was firmly with Argentina.
- **80' - 90+8' (France Resurgence - Momentum -95)**: The turning point. Nicolás Otamendi's foul on Kolo Muani gave France a lifeline. Kylian Mbappé scored the penalty, and just 97 seconds later, scored a breathtaking volley. The psychological and tactical momentum swung 100% to France.
- **Extra Time (105' - 120' - The Pendulum)**: Fresh legs in Argentina's midfield (Paredes, Lautaro) restored balance. Messi's 108th-minute goal pushed Argentina ahead, but Montiel's handball allowed Mbappé to equalize again.
- **120+3' (The Deciding Moment)**: Emiliano Martínez's legendary save against Kolo Muani prevented France from winning in open play.
      `,
      refereeDecisions: refereeRulings.map(r => ({
        minute: r.minute,
        decision: r.decision,
        ruling: r.ruling,
        explanation: r.explanation
      })),
      keyPlayers: [
        {
          name: "Lionel Messi",
          team: "Argentina",
          impact: "Scored two goals, orchestrated the entire counter-attack for the second, and converted his shootout penalty. His spatial awareness allowed Argentina to escape France's high press."
        },
        {
          name: "Kylian Mbappé",
          team: "France",
          impact: "Scored a historic World Cup final hat-trick. Carried France on his back during their momentum resurgence, converting two high-pressure penalties and scoring an elite volley."
        },
        {
          name: "Emiliano Martínez",
          team: "Argentina",
          impact: "Made the crucial 120+3' save against Kolo Muani to force penalties, and saved Kingsley Coman's penalty in the shootout, breaking France's composure."
        }
      ]
    };
  }

  if (isIstanbul) {
    return {
      summary: `Known as the 'Miracle of Istanbul', the 2005 Champions League Final saw AC Milan completely outclass Liverpool in the first half, taking a commanding 3-0 lead. Milan's diamond midfield, orchestrated by Andrea Pirlo and Kaká, sliced through Liverpool's flat 4-4-2. In the second half, Liverpool manager Rafael Benítez made a legendary tactical adjustment: replacing right-back Steve Finnan with defensive midfielder Didi Hamann, shifting to a 3-5-2. This neutralized Kaká, freed Steven Gerrard to push forward, and triggered an incredible six-minute blitz where Liverpool scored three goals to draw 3-3, eventually winning on penalties.`,
      tactics: `
### Formation Clash
AC Milan's **4-4-2 Diamond** vs Liverpool's **4-4-1-1**.
- **The First-Half Midfield Trap**: Milan's diamond packed the center. Kaká operated in the pocket between Liverpool's midfield and defense. Steven Gerrard and Xabi Alonso were constantly pulled out of position, leaving Kaká free to assist Crespo's goals.
- **The Halftime Shift (3-5-2)**: By introducing Didi Hamann, Liverpool formed a back three of Traoré, Hyypiä, and Carragher. Hamann sat directly on Kaká, shutting down Milan's transitions.

### Key Substitutions
- **46th Minute (Liverpool)**: Finnan OUT, Hamann IN. The match-defining sub. Shifting to a 3-5-2 allowed wing-backs Riise and Smicer to push high, while Hamann stabilized the defensive spine.
- **70th Minute (AC Milan)**: Seedorf OUT, Serginho IN. Ancelotti adapted to Liverpool's 3-5-2 by introducing direct winger pace, reclaiming control of the flanks for the final stages of the match.
      `,
      momentumAnalysis: `
### Momentum Timeline Breakdown
- **1' - 45' (Milan Stranglehold - Momentum +95)**: Paolo Maldini's 1st-minute goal set the tone. Kaká's masterclass and Crespo's double gave Milan a 3-0 lead, leaving Liverpool's momentum in ruins.
- **54' - 60' (The 6-Minute Miracle - Momentum -95)**: Gerrard's header in the 54th minute acted as the catalyst. Smicer's long-range strike 2 minutes later shook Milan, and Alonso's rebound penalty in the 60th minute completed a legendary comeback.
- **Extra Time (105' - 120' - Milan Pressing)**: Milan regained dominance. Serginho's crosses created multiple opportunities, culminated by Jerzy Dudek's heroic double-save against Shevchenko in the 117th minute.
      `,
      refereeDecisions: refereeRulings.map(r => ({
        minute: r.minute,
        decision: r.decision,
        ruling: r.ruling,
        explanation: r.explanation
      })),
      keyPlayers: [
        {
          name: "Steven Gerrard",
          team: "Liverpool",
          impact: "Ignited the comeback with his looping header. Won the penalty for the third goal. Shitted to right-back in extra time to shut down Serginho, displaying unmatched leadership."
        },
        {
          name: "Didi Hamann",
          team: "Liverpool",
          impact: "His halftime introduction shut down Kaká's playmaker space, turning a defensive disaster into a controlled possession base. Converted his penalty in the shootout despite a broken toe."
        },
        {
          name: "Kaká",
          team: "AC Milan",
          impact: "Unplayable in the first half. Set up Crespo's second goal with one of the greatest assists in CL history (a curling 40-yard grass-cutter). Shuffled out of the game by Hamann's marking in the second half."
        }
      ]
    };
  }

  // Custom Match Fallback mock generator
  return {
    summary: `A highly competitive match between ${homeTeam} and ${awayTeam} which ended ${matchData.homeScore}-${matchData.awayScore}. ${meta.statsSummary.xgComparison} Tactical structures played a key role as both coaches adjusted formations and setups throughout the game.`,
    tactics: `
### Formation Duel
- **${homeTeam} (${homeFormation}) vs ${awayTeam} (${awayFormation})**
- ${meta.formationClash}

### Positional Adjustments
- **${homeTeam}**: Worked on cycling possession in midfield (completed ${stats.passes.home} passes with ${stats.passAccuracy.home}% accuracy).
- **${awayTeam}**: Focused on transitional play, taking advantage of space in wide areas.
${meta.tacticalSubs.home.length > 0 ? `\n### ${homeTeam} Tactical Subs:\n` + meta.tacticalSubs.home.map(s => `- ${s.detail}`).join('\n') : ''}
${meta.tacticalSubs.away.length > 0 ? `\n### ${awayTeam} Tactical Subs:\n` + meta.tacticalSubs.away.map(s => `- ${s.detail}`).join('\n') : ''}
    `,
    momentumAnalysis: `
### Momentum Analysis
- ${meta.statsSummary.possessionPhase}
- **Key Swings Recorded**:
${meta.keySwings.map(k => `- **Minute ${k.minute}**: Momentum shifted towards ${k.direction} following a **${k.event}**. *Detail: ${k.description}*`).join('\n')}
    `,
    refereeDecisions: refereeRulings?.map(r => ({
      minute: r.minute,
      decision: r.decision,
      ruling: r.ruling,
      explanation: r.explanation
    })) || [],
    keyPlayers: [
      {
        name: "Key Performer 1",
        team: homeTeam,
        impact: `Helped secure possession and dictate the tempo. Completed key passes in the opponent's third.`
      },
      {
        name: "Key Performer 2",
        team: awayTeam,
        impact: `Created critical threat on the counter, leading his team's momentum push.`
      }
    ]
  };
}

/**
 * Rules-based translator to support multilingual features when offline/no Watsonx.
 * Standard translates for key football-related words & summaries.
 */
export function translateMockAnalysis(analysis, languageCode) {
  const translations = {
    es: {
      summaryTitle: "Resumen del Partido",
      tacticsTitle: "Análisis Táctico",
      momentumTitle: "Análisis de Momento",
      refereeTitle: "Decisiones del Árbitro",
      playersTitle: "Jugadores Clave",
      // Simple translations for key terms
      overview: "Perspectiva general táctica",
      impact: "Impacto en el partido"
    },
    fr: {
      summaryTitle: "Résumé du Match",
      tacticsTitle: "Analyse Tactique",
      momentumTitle: "Analyse de Dynamique",
      refereeTitle: "Décisions de l'Arbitre",
      playersTitle: "Joueurs Clés",
      overview: "Aperçu tactique",
      impact: "Impact sur le match"
    },
    de: {
      summaryTitle: "Spielzusammenfassung",
      tacticsTitle: "Taktische Analyse",
      momentumTitle: "Spieldynamik-Analyse",
      refereeTitle: "Schiedsrichterentscheidungen",
      playersTitle: "Schlüsselspieler",
      overview: "Taktische Übersicht",
      impact: "Einfluss auf das Spiel"
    },
    ar: {
      summaryTitle: "ملخص المباراة",
      tacticsTitle: "التحليل التكتيكي",
      momentumTitle: "تحليل الزخم",
      refereeTitle: "قرارات الحكم",
      playersTitle: "اللاعبين المؤثرين",
      overview: "نظرة عامة تكتيكية",
      impact: "تأثير اللاعب"
    },
    it: {
      summaryTitle: "Sintesi della Partita",
      tacticsTitle: "Analisi Tattica",
      momentumTitle: "Analisi del Momento",
      refereeTitle: "Decisioni Arbitrali",
      playersTitle: "Giocatori Chiave",
      overview: "Panoramica tattica",
      impact: "Impatto sulla partita"
    },
    pt: {
      summaryTitle: "Resumo da Partida",
      tacticsTitle: "Análise Tática",
      momentumTitle: "Análise de Momento",
      refereeTitle: "Decisões de Arbitragem",
      playersTitle: "Jogadores-Chave",
      overview: "Visão geral tática",
      impact: "Impacto no jogo"
    }
  };

  const tr = translations[languageCode];
  if (!tr) return analysis; // Return original if not supported

  // Map fields with translated sections
  return {
    summary: `[Traducido/Translated] ${analysis.summary}`,
    tactics: `### ${tr.tacticsTitle}\n${analysis.tactics}`,
    momentumAnalysis: `### ${tr.momentumTitle}\n${analysis.momentumAnalysis}`,
    refereeDecisions: analysis.refereeDecisions.map(d => ({
      ...d,
      ruling: `[${tr.refereeTitle}] ${d.ruling}`,
      explanation: `[Translated] ${d.explanation}`
    })),
    keyPlayers: analysis.keyPlayers.map(p => ({
      ...p,
      impact: `[${tr.impact}] ${p.impact}`
    }))
  };
}

/**
 * Mock chatbot question answering following strict match_json_agent rules.
 */
export function generateMockChatbotAnswer(matchJson, userQuestion) {
  const q = userQuestion.toLowerCase().trim();

  // Vague checking
  const vaguePatterns = ['tell me about', 'what happened', 'explain the match', 'summary', 'overview', 'how was the game', 'can you explain'];
  if (vaguePatterns.some(pat => q.includes(pat)) || q === 'match' || q === 'what' || q === 'hello' || q === 'hi') {
    return "Please ask a specific question such as final score, scorers, cards, possession, or substitutions.";
  }

  // Match JSON/file file upload checks
  if (q.includes('json') || q.includes('upload') || q.includes('where is the file') || q.includes('provide file') || q.includes('get match file') || q.includes('how to get file') || q.includes('retrieve file') || q.includes('file format') || q.includes('what file')) {
    return "You can upload a match data file (which can be a JSON file or other exported match data) containing the team names, score, players, timeline events, and match statistics. If you don't have a file, you can copy and paste the raw match text details manually in the 'Text-to-JSON' tab at the top of this panel, and I will create the layout for you.";
  }

  // Final score
  if (q.includes('score') || q.includes('result') || q.includes('who won') || q.includes('outcome')) {
    const isPen = matchJson.homePenalties !== undefined && matchJson.homePenalties !== null;
    const penStr = isPen ? ` (${matchJson.homePenalties}-${matchJson.awayPenalties} on penalties)` : '';
    const winnerText = matchJson.homeScore > matchJson.awayScore ? `${matchJson.homeTeam} won.` : (matchJson.awayScore > matchJson.homeScore ? `${matchJson.awayTeam} won.` : 'It was a draw.');
    return `The final score was ${matchJson.homeTeam} ${matchJson.homeScore}, ${matchJson.awayTeam} ${matchJson.awayScore}${penStr}. ${winnerText}`;
  }

  // Scorers
  if (q.includes('scorers') || q.includes('who scored') || q.includes('scorer') || q.includes('goal')) {
    const goals = matchJson.timeline.filter(t => t.type === 'GOAL');
    if (goals.length === 0) {
      return "No goals were scored in this match.";
    }
    
    // Who scored first
    if (q.includes('first') || q.includes('scored first') || q.includes('opens the scoring')) {
      const firstGoal = goals[0];
      return `${firstGoal.player} scored first in the ${firstGoal.minute}th minute.`;
    }

    const scorerDetails = goals.map(g => `${g.player} (${g.minute}')`).join(', ');
    return `The scorers were: ${scorerDetails}.`;
  }

  // Cards
  if (q.includes('cards') || q.includes('yellow') || q.includes('red') || q.includes('card') || q.includes('booked')) {
    const yellowHome = matchJson.stats?.yellowCards?.home ?? 0;
    const yellowAway = matchJson.stats?.yellowCards?.away ?? 0;
    const redHome = matchJson.stats?.redCards?.home ?? 0;
    const redAway = matchJson.stats?.redCards?.away ?? 0;
    return `${matchJson.homeTeam} received ${yellowHome} yellow card(s) and ${redHome} red card(s). ${matchJson.awayTeam} received ${yellowAway} yellow card(s) and ${redAway} red card(s).`;
  }

  // Substitutions
  if (q.includes('substitutions') || q.includes('substitution') || q.includes('subbed') || q.includes('subs') || q.includes('sub ')) {
    const subs = matchJson.timeline.filter(t => t.type === 'SUBSTITUTION');
    if (subs.length === 0) {
      return "No substitutions were recorded in the match data.";
    }
    const details = subs.map(s => `${s.team}: ${s.description}`).join(' | ');
    return `Substitutions: ${details}`;
  }

  // Possession
  if (q.includes('possession') || q.includes('ball control')) {
    const posHome = matchJson.stats?.possession?.home ?? 0;
    const posAway = matchJson.stats?.possession?.away ?? 0;
    return `${matchJson.homeTeam} had ${posHome}% possession and ${matchJson.awayTeam} had ${posAway}% possession.`;
  }

  // Man of the Match
  if (q.includes('man of the match') || q.includes('motm') || q.includes('mvp') || q.includes('best player')) {
    if (matchJson.matchId === 'argentina_france_2022') {
      return "Lionel Messi was named man of the match.";
    } else if (matchJson.matchId === 'liverpool_milan_2005') {
      return "Steven Gerrard was named man of the match.";
    }
    return "I don't have enough information in the match data.";
  }

  // If match date or venue
  if (q.includes('date') || q.includes('when was')) {
    return `The match took place on ${matchJson.date || 'unknown date'}.`;
  }
  if (q.includes('venue') || q.includes('stadium') || q.includes('where was')) {
    return `The match was played at ${matchJson.venue || 'unknown venue'}.`;
  }

  return "I don't have enough information in the match data.";
}

/**
 * Mock raw text parser converting match details to structured JSON.
 */
export function generateMockParsedJson(rawText) {
  const cleanText = rawText.replace(/\r/g, '').trim();
  const matches = cleanText.match(/([^.\n:]+)\s+vs\s+([^.\n:]+)/i) || 
                  cleanText.match(/([^.\n:]+)\s+beat\s+([^.\n:]+)/i) || 
                  cleanText.match(/([^.\n:]+)\s+against\s+([^.\n:]+)/i);
  let home = "Team A";
  let away = "Team B";
  if (matches) {
    home = matches[1].trim();
    away = matches[2].trim();
    
    // Clean up any preceding league details (e.g. "Premier League. Arsenal" -> capture "Arsenal")
    if (home.includes('.')) {
      const parts = home.split('.');
      home = parts[parts.length - 1].trim();
    }
  }

  const scoreMatch = rawText.match(/(\d+)\s*-\s*(\d+)/) || rawText.match(/(\d+)\s*to\s*(\d+)/);
  let homeScore = 1;
  let awayScore = 0;
  if (scoreMatch) {
    homeScore = parseInt(scoreMatch[1]);
    awayScore = parseInt(scoreMatch[2]);
  }

  return {
    matchId: `custom_parsed_${Date.now()}`,
    homeTeam: home,
    awayTeam: away,
    homeScore: homeScore,
    awayScore: awayScore,
    date: "June 27, 2026",
    venue: "Main Stadium",
    stats: {
      possession: { home: 55, away: 45 },
      shots: { home: 12, away: 8 },
      shotsOnTarget: { home: 6, away: 3 },
      xG: { home: 1.45, away: 0.95 },
      passes: { home: 450, away: 380 },
      passAccuracy: { home: 82, away: 78 },
      fouls: { home: 10, away: 12 },
      yellowCards: { home: 1, away: 2 },
      redCards: { home: 0, away: 0 }
    },
    homeFormation: "4-3-3",
    awayFormation: "4-2-3-1",
    homeLineup: [
      { name: "GK", number: 1, position: "GK", x: 50, y: 90 },
      { name: "Forward", number: 10, position: "ST", x: 50, y: 30 }
    ],
    awayLineup: [
      { name: "GK", number: 1, position: "GK", x: 50, y: 10 },
      { name: "Striker", number: 9, position: "ST", x: 50, y: 65 }
    ],
    timeline: [
      { minute: 0, momentum: 0, description: "Match starts." },
      { minute: 15, momentum: 50, type: "GOAL", team: home, player: "Forward", description: `Goal for ${home}!`, details: { xG: 0.4 } },
      { minute: 90, momentum: 0, description: "Match ends." }
    ],
    refereeRulings: []
  };
}
