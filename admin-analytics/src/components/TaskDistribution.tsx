import React from 'react';
import { Pie } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import './TaskDistribution.css';

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
}

export const TaskDistribution: React.FC<TaskDistributionProps> = ({ distribution }) => {
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
      title: {
        display: true,
        text: `Répartition de toutes les tâches (${distribution.totalTasks.toLocaleString()} total)`,
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 20 },
      },
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
    {
      icon: '🍼',
      label: 'Biberons',
      data: distribution.biberon,
      color: '#5ac8fa',
    },
    {
      icon: '💩',
      label: 'Couches',
      data: distribution.couche,
      color: '#ffcc00',
    },
    {
      icon: '💊',
      label: 'Santé',
      data: distribution.sante,
      color: '#ff3b30',
    },
    {
      icon: '😴',
      label: 'Sommeil',
      data: distribution.sommeil,
      color: '#5856d6',
    },
    {
      icon: '🌡️',
      label: 'Température',
      data: distribution.temperature,
      color: '#ff9500',
    },
    {
      icon: '🤱',
      label: 'Allaitement',
      data: distribution.allaitement,
      color: '#34c759',
    },
  ];

  return (
    <div className="task-distribution-section">
      <h3>📊 Répartition des tâches par catégorie</h3>

      <div className="distribution-content">
        <div className="distribution-chart">
          <div className="chart-wrapper">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>

        <div className="distribution-details">
          {taskTypes.map((type, idx) => (
            <div key={idx} className="distribution-item">
              <div className="distribution-item-header">
                <span className="distribution-icon">{type.icon}</span>
                <span className="distribution-label">{type.label}</span>
              </div>
              <div className="distribution-stats">
                <div className="distribution-count">
                  {type.data.count.toLocaleString()}
                </div>
                <div className="distribution-percentage" style={{ color: type.color }}>
                  {type.data.percentage}%
                </div>
              </div>
              <div className="distribution-bar">
                <div
                  className="distribution-bar-fill"
                  style={{
                    width: `${type.data.percentage}%`,
                    backgroundColor: type.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
