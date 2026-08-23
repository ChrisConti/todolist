import React from 'react';
import type { User } from '../types';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' });
const getCountryName = (code?: string): string => {
  if (!code) return '—';
  try { return countryNames.of(code) ?? code; } catch { return code; }
};

const TASK_LABELS: Record<number, string> = {
  0: 'Biberon',
  1: 'Couche',
  2: 'Santé',
  3: 'Sommeil',
  4: 'Température',
  5: 'Allaitement',
};

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const creationDate = user.creationDate
    ? new Date(typeof user.creationDate === 'string' ? user.creationDate : user.creationDate.toDate()).toLocaleDateString('fr-FR')
    : 'N/A';

  const providerLabel = user.provider === 'google' ? '🔵 Google'
    : user.provider === 'apple' ? '🍎 Apple'
    : '✉️ Email';

  const baby = user.linkedBaby;

  const babyAge = baby?.birthDate ? (() => {
    const birth = new Date(baby.birthDate!);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    if (days < 30) return `${days}j`;
    if (days < 365) return `${Math.floor(days / 30)} mois`;
    return `${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
  })() : null;

  const taskBreakdown = baby?.tasks?.reduce<Record<number, number>>((acc, t) => {
    acc[t.id] = (acc[t.id] || 0) + 1;
    return acc;
  }, {});

  const lastTask = baby?.tasks?.length
    ? baby.tasks.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
    : null;

  const premiumDate = user.premiumDate
    ? new Date(typeof user.premiumDate === 'string' ? user.premiumDate : user.premiumDate.toDate()).toLocaleDateString('fr-FR')
    : null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Email', value: user.email },
    { label: 'Nom', value: user.username || '—' },
    { label: 'Provider', value: providerLabel },
    { label: 'Opt-in email', value: user.emailOptIn ? '✅ Oui' : '❌ Non' },
    { label: 'Pays', value: getCountryName(user.country) },
    { label: 'Créé le', value: creationDate },
    { label: 'Premium', value: user.isPremium ? <span style={{ color: '#E8960A', fontWeight: 700 }}>⭐ Actif{premiumDate ? ` — acheté le ${premiumDate}` : ' (offert)'}</span> : '—' },
    { label: 'User ID', value: <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>{user.userId}</span> },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>👤 Profil utilisateur</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(({ label, value }) => (
              <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 4px', color: '#888', fontSize: 13, width: 120, fontWeight: 500 }}>{label}</td>
                <td style={{ padding: '8px 4px', fontSize: 13, fontWeight: 600 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {baby ? (
          <div style={{ marginTop: 20, background: '#fafafa', borderRadius: 10, padding: '16px 18px', border: '1px solid #ececec' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.5px' }}>
              👶 Bébé associé
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{baby.name}</div>
                {baby.type && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{baby.type === 'Boy' ? '👦 Garçon' : '👧 Fille'}</div>}
              </div>
              {babyAge && (
                <div style={{ background: '#e9f5ff', color: '#1a7abf', borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 700 }}>
                  {babyAge}
                </div>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
              <tbody>
                {baby.birthDate && (
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 4px', color: '#888', fontSize: 12, width: 130 }}>Naissance</td>
                    <td style={{ padding: '6px 4px', fontSize: 13, fontWeight: 600 }}>{new Date(baby.birthDate).toLocaleDateString('fr-FR')}</td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 4px', color: '#888', fontSize: 12 }}>Tâches totales</td>
                  <td style={{ padding: '6px 4px', fontSize: 13, fontWeight: 600 }}>{baby.tasks?.length ?? 0}</td>
                </tr>
                {lastTask && (
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 4px', color: '#888', fontSize: 12 }}>Dernière activité</td>
                    <td style={{ padding: '6px 4px', fontSize: 13, fontWeight: 600 }}>
                      {new Date(lastTask.date).toLocaleDateString('fr-FR')} — {TASK_LABELS[lastTask.id] ?? lastTask.labelTask}
                    </td>
                  </tr>
                )}
                {baby.user && baby.user.length > 1 && (
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 4px', color: '#888', fontSize: 12 }}>Parents</td>
                    <td style={{ padding: '6px 4px', fontSize: 13, fontWeight: 600 }}>{baby.user.length} parents</td>
                  </tr>
                )}
                {baby.memberRoles?.[user.userId] && (
                  <tr>
                    <td style={{ padding: '6px 4px', color: '#888', fontSize: 12 }}>Rôle</td>
                    <td style={{ padding: '6px 4px', fontSize: 13, fontWeight: 600 }}>{baby.memberRoles[user.userId]}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {taskBreakdown && Object.keys(taskBreakdown).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 8 }}>Répartition des tâches</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(taskBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([id, count]) => (
                      <span key={id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                        {TASK_LABELS[Number(id)] ?? `Type ${id}`} · {count}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 20, padding: '12px 14px', background: '#fff8f0', borderRadius: 8, border: '1px solid #ffe0b2', color: '#e65100', fontSize: 13 }}>
            Aucun bébé associé à ce compte.
          </div>
        )}
      </div>
    </div>
  );
};
