import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import './TaskDistributionByAge.css';

interface TaskDistributionByAgeProps {
  distributionByAge: {
    [ageRange: string]: {
      totalTasks: number;
      biberon: number;
      couche: number;
      sante: number;
      sommeil: number;
      temperature: number;
      allaitement: number;
    };
  };
}

export const TaskDistributionByAge: React.FC<TaskDistributionByAgeProps> = ({ distributionByAge }) => {
  const ageRanges = Object.keys(distributionByAge);

  if (ageRanges.length === 0) {
    return null;
  }

  // Calculate percentages for each age range
  const getPercentages = (ageRange: string) => {
    const data = distributionByAge[ageRange];
    const total = data.totalTasks;
    return {
      biberon: Math.round((data.biberon / total) * 100),
      couche: Math.round((data.couche / total) * 100),
      sante: Math.round((data.sante / total) * 100),
      sommeil: Math.round((data.sommeil / total) * 100),
      temperature: Math.round((data.temperature / total) * 100),
      allaitement: Math.round((data.allaitement / total) * 100),
    };
  };

  // Prepare data for stacked bar chart
  const chartData = {
    labels: ageRanges,
    datasets: [
      {
        label: '🍼 Biberons',
        data: ageRanges.map(range => getPercentages(range).biberon),
        backgroundColor: '#5ac8fa',
      },
      {
        label: '💩 Couches',
        data: ageRanges.map(range => getPercentages(range).couche),
        backgroundColor: '#ffcc00',
      },
      {
        label: '💊 Santé',
        data: ageRanges.map(range => getPercentages(range).sante),
        backgroundColor: '#ff3b30',
      },
      {
        label: '😴 Sommeil',
        data: ageRanges.map(range => getPercentages(range).sommeil),
        backgroundColor: '#5856d6',
      },
      {
        label: '🌡️ Température',
        data: ageRanges.map(range => getPercentages(range).temperature),
        backgroundColor: '#ff9500',
      },
      {
        label: '🤱 Allaitement',
        data: ageRanges.map(range => getPercentages(range).allaitement),
        backgroundColor: '#34c759',
      },
    ],
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: 'Répartition des tâches par âge du bébé (%)',
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 20 },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            const ageRange = context.label;
            const data = distributionByAge[ageRange];
            const taskType = ['biberon', 'couche', 'sante', 'sommeil', 'temperature', 'allaitement'][context.datasetIndex];
            const count = data[taskType as keyof typeof data] as number;
            return `${label}: ${value}% (${count} tâches)`;
          },
          footer: (items) => {
            const ageRange = items[0].label;
            const total = distributionByAge[ageRange].totalTasks;
            return `Total: ${total} tâches`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
        },
        grid: {
          color: '#e2e8f0',
        },
      },
    },
  };

  return (
    <div className="task-distribution-by-age-section">
      <h3>📈 Évolution des tâches selon l'âge du bébé</h3>

      <div className="age-distribution-content">
        <div className="age-chart">
          <div className="age-chart-wrapper">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="age-details-grid">
          {ageRanges.map((ageRange) => {
            const data = distributionByAge[ageRange];
            const percentages = getPercentages(ageRange);

            return (
              <div key={ageRange} className="age-range-card">
                <div className="age-range-header">
                  <h4>{ageRange}</h4>
                  <span className="age-range-total">{data.totalTasks} tâches</span>
                </div>

                <div className="age-range-details">
                  {data.biberon > 0 && (
                    <div className="age-task-item">
                      <span className="age-task-icon">🍼</span>
                      <span className="age-task-label">Biberons</span>
                      <span className="age-task-value">{percentages.biberon}%</span>
                    </div>
                  )}
                  {data.couche > 0 && (
                    <div className="age-task-item">
                      <span className="age-task-icon">💩</span>
                      <span className="age-task-label">Couches</span>
                      <span className="age-task-value">{percentages.couche}%</span>
                    </div>
                  )}
                  {data.sante > 0 && (
                    <div className="age-task-item">
                      <span className="age-task-icon">💊</span>
                      <span className="age-task-label">Santé</span>
                      <span className="age-task-value">{percentages.sante}%</span>
                    </div>
                  )}
                  {data.sommeil > 0 && (
                    <div className="age-task-item">
                      <span className="age-task-icon">😴</span>
                      <span className="age-task-label">Sommeil</span>
                      <span className="age-task-value">{percentages.sommeil}%</span>
                    </div>
                  )}
                  {data.temperature > 0 && (
                    <div className="age-task-item">
                      <span className="age-task-icon">🌡️</span>
                      <span className="age-task-label">Température</span>
                      <span className="age-task-value">{percentages.temperature}%</span>
                    </div>
                  )}
                  {data.allaitement > 0 && (
                    <div className="age-task-item">
                      <span className="age-task-icon">🤱</span>
                      <span className="age-task-label">Allaitement</span>
                      <span className="age-task-value">{percentages.allaitement}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
