import React from 'react';
import { Pie } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import './TaskDistribution.css';

type MilkDist = { artificial: number; maternal: number; unknown: number };
type DiaperDist = { pee: number; poop: number; both: number };
type TimerDist = { timer: number; manual: number };

interface TaskDistributionProps {
  distribution: {
    totalTasks: number;
    biberon: { count: number; percentage: number };
    couche: { count: number; percentage: number };
    sante: { count: number; percentage: number };
    sommeil: { count: number; percentage: number };
    temperature: { count: number; percentage: number };
    allaitement: { count: number; percentage: number };
  };
  biberonMilkType?: MilkDist;
  allaitementTimerType?: TimerDist;
  diaperContent?: DiaperDist;
}

export const TaskDistribution: React.FC<TaskDistributionProps> = ({ distribution, biberonMilkType, allaitementTimerType, diaperContent }) => {
  const pct = (n: number, total: number) => total > 0 ? `${Math.round(n / total * 100)}%` : '—';
  const milkSub = (d: MilkDist) => {
    const total = d.artificial + d.maternal + d.unknown;
    return [
      { label: 'Maternel', val: pct(d.maternal, total) },
      { label: 'Artificiel', val: pct(d.artificial, total) },
      { label: 'N/A', val: pct(d.unknown, total) },
    ];
  };
  const timerSub = (d: TimerDist) => {
    const total = d.timer + d.manual;
    return [
      { label: 'Timer', val: pct(d.timer, total) },
      { label: 'Manuel', val: pct(d.manual, total) },
    ];
  };
  const diaperSub = (d: DiaperDist) => {
    const total = d.pee + d.poop + d.both;
    return [
      { label: 'Pipi', val: pct(d.pee, total) },
      { label: 'Caca', val: pct(d.poop, total) },
      { label: 'Les deux', val: pct(d.both, total) },
    ];
  };
  const pieData = {
    labels: ['Biberons', 'Couches', 'Santé', 'Sommeil', 'Température', 'Allaitement'],
    datasets: [
      {
        data: [
          distribution.biberon.count,
          distribution.couche.count,
          distribution.sante.count,
          distribution.sommeil.count,
          distribution.temperature.count,
          distribution.allaitement.count,
        ],
        backgroundColor: [
          '#5ac8fa', // Biberon - bleu clair
          '#ffcc00', // Couche - jaune
          '#ff3b30', // Santé - rouge
          '#5856d6', // Sommeil - violet
          '#ff9500', // Température - orange
          '#34c759', // Allaitement - vert
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 13,
          },
        },
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = Math.round((value / distribution.totalTasks) * 100);
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const taskTypes = [
    { icon: '🍼', label: 'Biberons', data: distribution.biberon, color: '#5ac8fa', sub: biberonMilkType ? milkSub(biberonMilkType) : undefined },
    { icon: '💩', label: 'Couches', data: distribution.couche, color: '#ffcc00', sub: diaperContent ? diaperSub(diaperContent) : undefined },
    { icon: '💊', label: 'Santé', data: distribution.sante, color: '#ff3b30', sub: undefined },
    { icon: '😴', label: 'Sommeil', data: distribution.sommeil, color: '#5856d6', sub: undefined },
    { icon: '🌡️', label: 'Température', data: distribution.temperature, color: '#ff9500', sub: undefined },
    { icon: '🤱', label: 'Allaitement', data: distribution.allaitement, color: '#34c759', sub: allaitementTimerType ? timerSub(allaitementTimerType) : undefined },
  ];

  return (
    <div className="task-distribution-section">
      <h3>📊 Répartition des tâches par catégorie <span style={{ fontSize: 14, fontWeight: 400, color: '#718096' }}>({distribution.totalTasks.toLocaleString()} total)</span></h3>

      <div className="distribution-content">
        <div className="distribution-chart">
          <div className="chart-wrapper">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>

        <div className="distribution-details">
          {[...taskTypes].sort((a, b) => b.data.percentage - a.data.percentage).map((type, idx) => (
            <div key={idx} className={`distribution-item${type.sub ? ' distribution-item--has-sub' : ''}`}>
              <div className="distribution-main-row">
                <span className="distribution-icon">{type.icon}</span>
                <span className="distribution-label">{type.label}</span>
                <span className="distribution-count">{type.data.count.toLocaleString()}</span>
                <span className="distribution-percentage" style={{ color: type.color }}>{type.data.percentage}%</span>
              </div>
              {type.sub && (
                <div className="distribution-sub">
                  {type.sub.map(({ label, val }) => (
                    <span key={label} className="distribution-sub-item">
                      <span className="distribution-sub-label">{label}</span>
                      <span className="distribution-sub-val">{val}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
