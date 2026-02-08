import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import type { User, Baby } from '../types';
import './Charts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartsProps {
  users: User[];
  babies: Baby[];
  iosDownloads: number;
  androidDownloads: number;
}

export const Charts: React.FC<ChartsProps> = ({ users, babies, iosDownloads, androidDownloads }) => {
  // Growth chart data (last 30 days)
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
  const accountsByDay = days.map(day => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    return users.filter(u => {
      if (!u.creationDate) return false;
      let userDate: Date;
      if (typeof u.creationDate === 'string') {
        userDate = new Date(u.creationDate);
      } else if (typeof u.creationDate === 'object' && 'toDate' in u.creationDate) {
        userDate = (u.creationDate as any).toDate();
      } else {
        return false;
      }
      return userDate >= day && userDate < nextDay;
    }).length;
  });

  const babiesByDay = days.map(day => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    return babies.filter(b => {
      if (!b.CreatedDate) return false;
      const babyDate = new Date(b.CreatedDate);
      if (isNaN(babyDate.getTime())) return false;
      return babyDate >= day && babyDate < nextDay;
    }).length;
  });

  const growthData = {
    labels: days.map(d => `${d.getDate()}/${d.getMonth() + 1}`),
    datasets: [
      {
        label: 'Comptes créés',
        data: accountsByDay,
        borderColor: '#C75B4A',
        backgroundColor: 'rgba(199, 91, 74, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Bébés créés',
        data: babiesByDay,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const growthOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Croissance (30 derniers jours)',
        font: { size: 16, weight: 'bold' },
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

  // Platform pie chart
  const platformData = {
    labels: ['iOS', 'Android'],
    datasets: [
      {
        data: [iosDownloads, androidDownloads],
        backgroundColor: ['#5ac8fa', '#34c759'],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const platformOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Téléchargements par plateforme',
        font: { size: 16, weight: 'bold' },
      },
    },
  };

  // Task distribution bar chart
  const taskRanges = [
    { label: '0', min: 0, max: 0 },
    { label: '1-10', min: 1, max: 10 },
    { label: '11-30', min: 11, max: 30 },
    { label: '31-100', min: 31, max: 100 },
    { label: '100+', min: 101, max: Infinity },
  ];

  const taskDistribution = taskRanges.map(range => {
    return babies.filter(b => {
      const taskCount = b.tasks?.length || 0;
      return taskCount >= range.min && taskCount <= range.max;
    }).length;
  });

  const taskDistData = {
    labels: taskRanges.map(r => r.label + ' tâches'),
    datasets: [
      {
        label: 'Nombre de bébés',
        data: taskDistribution,
        backgroundColor: '#C75B4A',
      },
    ],
  };

  const taskDistOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Répartition des bébés par nombre de tâches',
        font: { size: 16, weight: 'bold' },
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

  return (
    <div className="charts-section">
      <h3>📊 Graphiques</h3>
      <div className="charts-grid">
        <div className="chart-card large">
          <div className="chart-container">
            <Line data={growthData} options={growthOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-container">
            <Pie data={platformData} options={platformOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-container">
            <Bar data={taskDistData} options={taskDistOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
