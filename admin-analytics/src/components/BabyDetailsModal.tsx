import React, { useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Baby } from '../types';
import type { ChartOptions } from 'chart.js';
import './BabyDetailsModal.css';

interface BabyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  baby: Baby | null;
  onBabyDeleted?: () => void;
  onParentClick?: (userId: string) => void;
}

export const BabyDetailsModal: React.FC<BabyDetailsModalProps> = ({ isOpen, onClose, baby, onBabyDeleted, onParentClick }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !baby) return null;

  // Format a Firestore Timestamp (or date-like value) for display
  const formatTimestamp = (ts: any): string => {
    if (!ts) return 'N/A';
    try {
      const date = typeof ts === 'object' && 'toDate' in ts ? ts.toDate() : new Date(ts);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  // Calculate age from birthdate
  const calculateAge = (birthDate: string | undefined): string => {
    if (!birthDate) return 'N/A';

    let birth: Date;
    if (birthDate.includes('/')) {
      let [day, month, year] = birthDate.split('/').map(Number);

      // Handle 2-digit years: if year <= 50, assume 20XX, else 19XX
      if (year < 100) {
        year = year <= 50 ? 2000 + year : 1900 + year;
      }

      birth = new Date(year, month - 1, day);
    } else {
      birth = new Date(birthDate);
    }

    if (isNaN(birth.getTime())) return 'N/A';

    const now = new Date();

    // For very recent babies, show days
    const diffMs = now.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'N/A';
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return '1 jour';
    if (diffDays < 30) return `${diffDays} jours`;

    // Calculate months difference properly
    const yearsDiff = now.getFullYear() - birth.getFullYear();
    const monthsDiff = now.getMonth() - birth.getMonth();
    const daysDiff = now.getDate() - birth.getDate();

    let totalMonths = yearsDiff * 12 + monthsDiff;

    // If the day hasn't been reached yet this month, subtract one month
    if (daysDiff < 0) {
      totalMonths--;
    }

    if (totalMonths < 0) return 'N/A';
    if (totalMonths === 1) return '1 mois';
    if (totalMonths < 12) return `${totalMonths} mois`;

    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    if (years === 1 && remainingMonths === 0) return '1 an';
    if (years === 1) return `1 an ${remainingMonths}m`;
    if (remainingMonths === 0) return `${years} ans`;
    return `${years} ans ${remainingMonths}m`;
  };

  // Task statistics
  const tasks = baby.tasks || [];
  const totalTasks = tasks.length;

  const taskTypes: { [key: string]: { count: number; label: string; icon: string } } = {
    'biberon': { count: 0, label: 'Biberons', icon: '🍼' },
    'couche': { count: 0, label: 'Couches', icon: '💩' },
    'Sante': { count: 0, label: 'Santé', icon: '💊' },
    'sommeil': { count: 0, label: 'Sommeil', icon: '😴' },
    'thermo': { count: 0, label: 'Température', icon: '🌡️' },
    'allaitement': { count: 0, label: 'Allaitement', icon: '🤱' },
  };

  let bottlesMl = 0;
  let milkArtificial = 0;
  let milkMaternal = 0;
  let milkOther = 0;
  let sleepMinutes = 0;
  let breastfeedingLeft = 0;
  let breastfeedingRight = 0;
  let tempCount = 0;
  let tempSum = 0;
  let tempMin = Infinity;
  let tempMax = -Infinity;
  let diaperPee = 0;
  let diaperPoop = 0;
  let diaperBoth = 0;
  let diaperSolid = 0;
  let diaperSoft = 0;
  let diaperLiquid = 0;

  tasks.forEach(task => {
    const type = task.labelTask;
    if (taskTypes[type]) {
      taskTypes[type].count++;
    }

    if (type === 'biberon') {
      bottlesMl += Number(task.label) || 0;
      if (task.milkType === 'artificial') milkArtificial++;
      else if (task.milkType === 'maternal') milkMaternal++;
      else milkOther++;
    } else if (type === 'couche') {
      const content = task.diaperContent;
      if (content === 0) diaperPee++;
      else if (content === 1) diaperPoop++;
      else if (content === 2) diaperBoth++;
      const dtype = task.diaperType ?? task.idCaca;
      if (dtype === 0) diaperSolid++;
      else if (dtype === 1) diaperSoft++;
      else if (dtype === 2) diaperLiquid++;
    } else if (type === 'sommeil' && task.label) {
      sleepMinutes += Number(task.label) || 0;
    } else if (type === 'allaitement') {
      breastfeedingLeft += task.boobLeft || 0;
      breastfeedingRight += task.boobRight || 0;
    } else if (type === 'thermo' && task.label) {
      const t = Number(String(task.label).replace(',', '.')) || 0;
      if (t > 0) {
        tempSum += t;
        tempCount++;
        if (t < tempMin) tempMin = t;
        if (t > tempMax) tempMax = t;
      }
    }
  });

  const sleepHours = sleepMinutes / 60;
  const breastfeedingHours = (breastfeedingLeft + breastfeedingRight) / 60;

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

  const handleDeleteBaby = async () => {
    if (!baby) {
      console.error('No baby to delete');
      return;
    }

    console.log('Starting deletion for baby:', baby.id, baby.name);

    try {
      setIsDeleting(true);
      const babyDocRef = doc(db, 'Baby', baby.id);
      console.log('Deleting document at path:', `Baby/${baby.id}`);

      await deleteDoc(babyDocRef);
      console.log('Baby deleted successfully from Firestore');

      // Close the confirmation dialog
      setShowDeleteConfirm(false);

      // Notify parent to refresh data
      if (onBabyDeleted) {
        console.log('Calling onBabyDeleted callback');
        await onBabyDeleted();
      }

      // Close the modal
      onClose();

      alert(`${baby.name} a été supprimé avec succès !`);
    } catch (error: any) {
      console.error('Error deleting baby:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`Erreur lors de la suppression: ${error.message}\nCode: ${error.code || 'unknown'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="baby-modal-overlay" onClick={onClose}>
      <div className="baby-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="baby-modal-header">
          <div className="baby-header-content">
            {baby.profilePhoto && (
              <div className="baby-profile-photo">
                <img src={baby.profilePhoto} alt={baby.name} />
              </div>
            )}
            <h2>👶 {baby.name}</h2>
          </div>
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
                <span className="info-value">{(() => {
                  if (!baby.birthDate) return 'N/A';
                  if (baby.birthDate.includes('/')) {
                    let [day, month, year] = baby.birthDate.split('/').map(Number);
                    if (year < 100) {
                      year = year <= 50 ? 2000 + year : 1900 + year;
                    }
                    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                  }
                  return baby.birthDate;
                })()}</span>
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
                <div className="info-value">
                  {(() => {
                    const uids = baby.user && baby.user.length > 0 ? baby.user : [];
                    const parents = uids.length > 0
                      ? uids.map((uid, idx) => {
                          const linked = baby.linkedUsers?.find(u => u.userId === uid);
                          const email = linked?.email || baby.parentEmails?.[idx] || 'N/A';
                          const role = baby.memberRoles?.[uid];
                          const ageRange = linked?.parentAgeRange;
                          const isCreator = uid === baby.admin;
                          // Le créateur n'a pas d'entrée memberJoinDates dédiée : il "rejoint" à la création du bébé
                          const joinTs = baby.memberJoinDates?.[uid] ?? (isCreator ? baby.createdDate : undefined);
                          return { uid, email, role, ageRange, isCreator, joinDate: formatTimestamp(joinTs), isRealUid: true };
                        })
                      : (baby.parentEmails && baby.parentEmails.length > 0
                          ? baby.parentEmails.map((email, idx) => ({ uid: `e${idx}`, email, role: undefined, ageRange: undefined, isCreator: false, joinDate: 'N/A', isRealUid: false }))
                          : [{ uid: 'fallback', email: baby.userEmail || 'N/A', role: undefined as string | undefined, ageRange: undefined as string | undefined, isCreator: false, joinDate: 'N/A', isRealUid: false }]);

                    return parents.map((p) => (
                      <div key={p.uid} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid #f0f0f0' }}>
                        {p.isRealUid && onParentClick ? (
                          <div
                            onClick={() => onParentClick(p.uid)}
                            style={{ fontSize: '13px', color: '#C75B4A', cursor: 'pointer', textDecoration: 'underline', width: 'fit-content' }}
                          >
                            {p.email}
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px' }}>{p.email}</div>
                        )}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.isCreator && (
                            <span style={{ background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: '8px', fontSize: '10px' }}>Créateur</span>
                          )}
                          {p.role && (
                            <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: '8px', fontSize: '10px' }}>{p.role}</span>
                          )}
                          {p.ageRange && (
                            <span style={{ background: '#f3e5f5', color: '#6a1b9a', padding: '1px 6px', borderRadius: '8px', fontSize: '10px' }}>{p.ageRange}</span>
                          )}
                          <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: '8px', fontSize: '10px' }}>
                            Rejoint le : {p.joinDate}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
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
                  {lastTask ? new Date(lastTask.date).toLocaleDateString('fr-FR') + ' ' + new Date(lastTask.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
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
                      {type.label === 'Biberons' && type.count > 0 && (() => {
                        const pct = (n: number) => `${Math.round((n / type.count) * 100)}%`;
                        return (
                          <div className="task-type-pills">
                            <span className="task-pill">🥛 Artificiel: {milkArtificial} ({pct(milkArtificial)})</span>
                            <span className="task-pill">🤱 Maternel: {milkMaternal} ({pct(milkMaternal)})</span>
                            {milkOther > 0 && <span className="task-pill">— Autre: {milkOther} ({pct(milkOther)})</span>}
                            {bottlesMl > 0 && <span className="task-pill muted">{bottlesMl.toLocaleString()} ml total</span>}
                          </div>
                        );
                      })()}
                      {type.label === 'Couches' && type.count > 0 && (() => {
                        const pct = (n: number) => `${Math.round((n / type.count) * 100)}%`;
                        const hasConsistency = (diaperSolid + diaperSoft + diaperLiquid) > 0;
                        return (
                          <div className="task-type-pills">
                            <span className="task-pill">💦 Pipi: {diaperPee} ({pct(diaperPee)})</span>
                            <span className="task-pill">💩 Caca: {diaperPoop} ({pct(diaperPoop)})</span>
                            <span className="task-pill">💦💩 Les deux: {diaperBoth} ({pct(diaperBoth)})</span>
                            {hasConsistency && <>
                              <span className="task-pill">Dur: {diaperSolid} ({pct(diaperSolid)})</span>
                              <span className="task-pill">Mou: {diaperSoft} ({pct(diaperSoft)})</span>
                              <span className="task-pill">Liquide: {diaperLiquid} ({pct(diaperLiquid)})</span>
                            </>}
                          </div>
                        );
                      })()}
                      {type.label === 'Sommeil' && sleepMinutes > 0 && (
                        <div className="task-type-pills">
                          <span className="task-pill">{sleepHours.toFixed(1)}h total</span>
                          <span className="task-pill">moy. {(sleepMinutes / type.count).toFixed(0)} min/session</span>
                        </div>
                      )}
                      {type.label === 'Allaitement' && (breastfeedingLeft + breastfeedingRight) > 0 && (() => {
                        const total = breastfeedingLeft + breastfeedingRight;
                        const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
                        return (
                          <div className="task-type-pills">
                            <span className="task-pill">◀ Gauche: {breastfeedingLeft} min ({pct(breastfeedingLeft)})</span>
                            <span className="task-pill">Droite ▶: {breastfeedingRight} min ({pct(breastfeedingRight)})</span>
                            <span className="task-pill muted">{breastfeedingHours.toFixed(1)}h total</span>
                          </div>
                        );
                      })()}
                      {type.label === 'Température' && tempCount > 0 && (
                        <div className="task-type-pills">
                          <span className="task-pill">Moy: {(tempSum / tempCount).toFixed(1)}°C</span>
                          <span className="task-pill">Min: {tempMin.toFixed(1)}°C</span>
                          <span className="task-pill">Max: {tempMax.toFixed(1)}°C</span>
                        </div>
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
              <button className="action-btn delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                🗑️ Supprimer ce bébé
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="delete-confirm-header">
                <h3>⚠️ Confirmation de suppression</h3>
              </div>
              <div className="delete-confirm-body">
                <p>
                  Êtes-vous sûr de vouloir supprimer <strong>{baby.name}</strong> ?
                </p>
                <p className="delete-warning">
                  Cette action est irréversible et supprimera :
                </p>
                <ul className="delete-warning-list">
                  <li>Toutes les informations du bébé</li>
                  <li>Les {totalTasks} tâches enregistrées</li>
                  <li>Toutes les données associées</li>
                </ul>
              </div>
              <div className="delete-confirm-footer">
                <button
                  className="cancel-delete-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Annuler
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={handleDeleteBaby}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
