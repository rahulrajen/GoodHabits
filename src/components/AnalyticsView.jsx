import { Award, Target, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function AnalyticsView({ history, habits, dailyTarget, streak }) {
  // Generate data for the last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - idx);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    return { dateStr, label };
  }).reverse();

  // Compute scores for each of these days
  const chartData = last7Days.map(day => {
    const log = history[day.dateStr];
    let score = 0;
    if (log && log.loggedHabits) {
      score = log.loggedHabits.reduce((sum, hId) => {
        const habit = habits.find(h => h.id === hId);
        return sum + (habit ? habit.points : 0);
      }, 0);
    }
    const dayTarget = log ? log.target : dailyTarget;
    return {
      ...day,
      score,
      target: dayTarget,
      targetMet: score >= dayTarget
    };
  });

  // Calculate statistics over all history
  const historyDays = Object.keys(history);
  const totalDays = historyDays.length || 1;
  
  let totalPoints = 0;
  let daysTargetMet = 0;
  
  historyDays.forEach(dayStr => {
    const log = history[dayStr];
    const score = log.loggedHabits.reduce((sum, hId) => {
      const h = habits.find(habit => habit.id === hId);
      return sum + (h ? h.points : 0);
    }, 0);
    totalPoints += score;
    const target = log.target || dailyTarget;
    if (score >= target) daysTargetMet++;
  });

  const completionRate = Math.round((daysTargetMet / totalDays) * 100) || 0;
  const averageScore = Math.round(totalPoints / totalDays) || 0;

  // Chart layout config
  const width = 500;
  const height = 200;
  const paddingX = 40;
  const paddingY = 30;

  const maxScore = Math.max(...chartData.map(d => d.score), dailyTarget, 10);
  
  // Map points to SVG coordinates
  const points = chartData.map((d, idx) => {
    const x = paddingX + (idx / (chartData.length - 1)) * (width - paddingX * 2);
    // Y is inverted: 0 score maps to height - paddingY, maxScore maps to paddingY
    const y = height - paddingY - (d.score / maxScore) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  // Build SVG Path string
  let linePath = '';
  let areaPath = '';
  
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    areaPath = `M ${points[0].x} ${height - paddingY} L ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
      areaPath += ` L ${points[i].x} ${points[i].y}`;
    }
    
    areaPath += ` L ${points[points.length - 1].x} ${height - paddingY} Z`;
  }

  // Draw a guide line for current target
  const targetY = height - paddingY - (dailyTarget / maxScore) * (height - paddingY * 2);

  return (
    <div className="analytics-view fade-in">
      <h2 className="section-title">Analytics Dashboard</h2>
      
      {/* Grid of Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper theme-orange">
            <Award size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Streak</span>
            <span className="stat-value">{streak} Days</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper theme-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Goal Met Rate</span>
            <span className="stat-value">{completionRate}%</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper theme-indigo">
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg Daily Score</span>
            <span className="stat-value">{averageScore} pts</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper theme-pink">
            <Target size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Earned</span>
            <span className="stat-value">{totalPoints} pts</span>
          </div>
        </div>
      </div>

      {/* SVG Trendline Graph Card */}
      <div className="chart-card glass-card">
        <h3 className="chart-title">7-Day Score Trend</h3>
        <div className="chart-wrapper">
          <svg viewBox={`0 0 ${width} ${height}`} className="analytics-svg">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Target line */}
            <line 
              x1={paddingX} 
              y1={targetY} 
              x2={width - paddingX} 
              y2={targetY} 
              className="target-guide-line"
              strokeDasharray="4 4"
            />
            <text 
              x={width - paddingX + 5} 
              y={targetY + 4} 
              className="target-guide-label"
            >
              Goal ({dailyTarget})
            </text>

            {/* Area under line */}
            {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

            {/* Line connecting points */}
            {linePath && <path d={linePath} className="chart-line-stroke" />}

            {/* Data points */}
            {points.map((pt, idx) => (
              <g key={idx} className="chart-point-group">
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r={5} 
                  className={`chart-point-circle ${pt.targetMet ? 'met' : ''}`}
                />
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r={9} 
                  className="chart-point-hover-ring"
                />
                {/* Score value display above node */}
                <text 
                  x={pt.x} 
                  y={pt.y - 12} 
                  textAnchor="middle" 
                  className="chart-point-label"
                >
                  {pt.score}
                </text>
              </g>
            ))}

            {/* X Axis labels */}
            {points.map((pt, idx) => (
              <text 
                key={idx} 
                x={pt.x} 
                y={height - 8} 
                textAnchor="middle" 
                className="chart-axis-label"
              >
                {pt.label}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
