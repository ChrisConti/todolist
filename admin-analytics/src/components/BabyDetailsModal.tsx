import React from 'react';
import { Line, Pie } from 'react-chartjs-2';
import type { Baby } from '../types';
import type { ChartOptions } from 'chart.js';
import './BabyDetailsModal.css';

interface BabyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  baby: Baby | null;
}

export const BabyDetailsModal: React.FC<BabyDetailsModalProps> = ({ isOpen, onClose, baby }) => {
  if (!isOpen || !baby) return null;

  // Calculate age from birthdate
  const calculateAge = (birthDate: string | undefined): string => {
    if (!birthDate) return 'N/A';

    let birth: Date;
    if (birthDate.includes('/')) {
      const [day, month, year] = birthDate.split('/').map(Number);
      birth = new Date(year, month - 1, day);
    } else {
      birth = new Date(birthDate);
    }

    if (isNaN(birth.getTime())) return 'N/A';

    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'N/A';
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return '1 jour';
    if (diffDays < 30) return `${diffDays} jours`;

    const months = Math.floor(diffDays / 30);
    if (months === 1) return '1 mois';
    if (months < 12) return `${months} mois`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 1 && remainingMonths === 0) return '1 an';
    if (years === 1) return `1 an ${remainingMonths}m`;
    if (remainingMonths === 0) return `${years} ans`;
    return `${years} ans ${remainingMonths}m`;
  };

  // Task statistics
  const tasks = baby.tasks || [];
  const totalTasks = tasks.length;

  const taskTypes: { [key: string]: { count: number; label: string; icon: string } } = {
    '0': { count: 0, label: 'Biberons', icon: '🍼' },
    '1': { count: 0, label: 'Couches', icon: '💩' },
    '2': { count: 0, label: 'Santé', icon: '💊' },
    '3': { count: 0, label: 'Sommeil', icon: '😴' },
    '4': { count: 0, label: 'Température', icon: '🌡️' },
    '5': { count: 0, label: 'Allaitement', icon: '🤱' },
  };

  let bottlesMl = 0;
  let sleepHours = 0;
  let breastfeedingHours = 0;
  let tempCount = 0;
  let tempSum = 0;

  tasks.forEach(task => {
    const type = task.labelTask;
    if (taskTypes[type]) {
      taskTypes[type].count++;
    }

    // Calculate specifics
    if (type === '0' && task.label) {
      bottlesMl += Number(task.label) || 0;
    } else if (type === '3' && task.label) {
      sleepHours += Number(task.label) || 0;
    } else if (type === '5') {
      const left = task.boobLeft || 0;
      const right = task.boobRight || 0;
      breastfeedingHours += (left + right) / 60;
    } else if (type === '4' && task.label) {
      tempSum += Number(task.label) || 0;
      tempCount++;
    }
  });

  // Timeline data (last 30 days)
  const getLast30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const days = getLast30Days();
  const tasksByDay = days.map(day => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    return tasks.filter(task => {
      if (!task.date) return false;
      const taskDate = new Date(task.date);
      if (isNaN(taskDate.getTime())) return false;
      return taskDate >= day && taskDate < nextDay;
    }).length;
  });

  const timelineData = {
    labels: days.map(d => `${d.getDate()}/${d.getMonth() + 1}`),
    datasets: [
      {
        label: 'Tâches par jour',
        data: tasksByDay,
        borderColor: '#C75B4A',
        backgroundColor: 'rgba(199, 91, 74, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const timelineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Activité (30 derniers jours)',
        font: { size: 14, weight: 'bold' },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  // Pie chart for task types
  const pieData = {
    labels: Object.values(taskTypes).map(t => t.label),
    datasets: [
      {
        data: Object.values(taskTypes).map(t => t.count),
        backgroundColor: [
          '#5ac8fa',
          '#ffcc00',
          '#ff3b30',
          '#5856d6',
          '#ff9500',
          '#34c759',
        ],
      },
    ],
  };

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Répartition par type',
        font: { size: 14, weight: 'bold' },
      },
    },
  };

  // Calculate dates
  const firstTask = tasks.length > 0 ? tasks.reduce((earliest, task) => {
    const taskDate = new Date(task.date);
    return taskDate < new Date(earliest.date) ? task : earliest;
  }) : null;

  const lastTask = tasks.length > 0 ? tasks.reduce((latest, task) => {
    const taskDate = new Date(task.date);
    return taskDate > new Date(latest.date) ? task : latest;
  }) : null;

  const activityPeriodDays = firstTask && lastTask ? Math.ceil((new Date(lastTask.date).getTime() - new Date(firstTask.date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const avgTasksPerDay = activityPeriodDays > 0 ? (totalTasks / activityPeriodDays).toFixed(1) : '0';

  const exportBabyData = () => {
    let csv = 'Type,Date,Détails\n';
    tasks.forEach(task => {
      const typeName = taskTypes[task.labelTask]?.label || 'Autre';
      const date = new Date(task.date).toLocaleString('fr-FR');
      const details = task.comment || '';
      csv += `${typeName},${date},"${details}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${baby.name}_donnees.csv`;
    link.click();
  };

  return (
    <div className="baby-modal-overlay" onClick={onClose}>
      <div className="baby-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="baby-modal-header">
          <h2>👶 {baby.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="baby-modal-body">
          {/* Section 1: General Info */}
          <div className="baby-section">
            <h3>Informations générales</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Sexe:</span>
                <span className="info-value">{baby.type === 'Boy' ? '👦 Garçon' : baby.type === 'Girl' ? '👧 Fille' : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date de naissance:</span>
                <span className="info-value">{baby.birthDate || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Âge:</span>
                <span className="info-value">{calculateAge(baby.birthDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Poids:</span>
                <span className="info-value">{baby.weight ? `${baby.weight} kg` : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Taille:</span>
                <span className="info-value">{baby.height ? `${baby.height} cm` : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Nb de parents:</span>
                <span className="info-value">{baby.user?.length || 0}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Parents:</span>
                <span className="info-value">
                  {baby.parentEmails && baby.parentEmails.length > 0
                    ? baby.parentEmails.join(', ')
                    : baby.userEmail || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Task Overview */}
          <div className="baby-section">
            <h3>Vue d'ensemble des tâches</h3>
            <div className="overview-grid">
              <div className="overview-card">
                <div className="overview-label">Total de tâches</div>
                <div className="overview-value">{totalTasks}</div>
              </div>
              <div className="overview-card">
                <div className="overview-label">Première tâche</div>
                <div className="overview-value">
                  {firstTask ? new Date(firstTask.date).toLocaleDateString('fr-FR') : 'N/A'}
                </div>
              </div>
              <div className="overview-card">
                <div className="overview-label">Dernière tâche</div>
                <div className="overview-value">
                  {lastTask ? new Date(lastTask.date).toLocaleDateString('fr-FR') : 'N/A'}
                </div>
              </div>
              <div className="overview-card">
                <div className="overview-label">Période d'activité</div>
                <div className="overview-value">{activityPeriodDays} jours</div>
              </div>
              <div className="overview-card">
                <div className="overview-label">Moyenne par jour</div>
                <div className="overview-value">{avgTasksPerDay}</div>
              </div>
            </div>
          </div>

          {/* Section 3: Task Types */}
          <div className="baby-section">
            <h3>Répartition par type de tâche</h3>
            <div className="task-types-grid">
              {Object.values(taskTypes).map((type, idx) => {
                const percentage = totalTasks > 0 ? Math.round((type.count / totalTasks) * 100) : 0;
                return (
                  <div key={idx} className="task-type-card">
                    <div className="task-type-icon">{type.icon}</div>
                    <div className="task-type-content">
                      <div className="task-type-label">{type.label}</div>
                      <div className="task-type-count">{type.count} ({percentage}%)</div>
                      {type.label === 'Biberons' && bottlesMl > 0 && (
                        <div className="task-type-detail">{bottlesMl.toLocaleString()} ml au total</div>
                      )}
                      {type.label === 'Sommeil' && sleepHours > 0 && (
                        <div className="task-type-detail">{sleepHours.toFixed(1)}h au total</div>
                      )}
                      {type.label === 'Allaitement' && breastfeedingHours > 0 && (
                        <div className="task-type-detail">{breastfeedingHours.toFixed(1)}h au total</div>
                      )}
                      {type.label === 'Température' && tempCount > 0 && (
                        <div className="task-type-detail">Moy: {(tempSum / tempCount).toFixed(1)}°C</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Charts */}
          {totalTasks > 0 && (
            <div className="baby-section">
              <h3>Graphiques</h3>
              <div className="baby-charts-grid">
                <div className="baby-chart-card">
                  <div className="baby-chart-container">
                    <Line data={timelineData} options={timelineOptions} />
                  </div>
                </div>
                <div className="baby-chart-card">
                  <div className="baby-chart-container">
                    <Pie data={pieData} options={pieOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Actions */}
          <div className="baby-section">
            <h3>Actions</h3>
            <div className="actions-grid">
              <button className="action-btn" onClick={exportBabyData}>
                📥 Exporter toutes les données (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
