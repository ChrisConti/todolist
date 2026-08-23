import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import './Migration.css';

export const Migration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number; } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const migrateUsersCreationDate = async () => {
    if (!window.confirm('⚠️ Êtes-vous sûr de vouloir mettre à jour tous les comptes sans date de création avec la date du 03/03/2025 ?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('🔄 Starting migration...');

      // Date: 03/03/2025
      const creationDate = new Date('2025-03-03T00:00:00Z');
      const timestamp = Timestamp.fromDate(creationDate);

      console.log('📅 Using date:', creationDate.toISOString());

      // Get all users
      const usersRef = collection(db, 'Users');
      const snapshot = await getDocs(usersRef);

      console.log(`📊 Total users: ${snapshot.docs.length}`);

      let updated = 0;
      let skipped = 0;

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();

        // Check if creationDate is missing or null
        if (!userData.creationDate) {
          console.log(`✏️  Updating user: ${userDoc.id} (${userData.email || 'no email'})`);

          await updateDoc(doc(db, 'Users', userDoc.id), {
            creationDate: timestamp
          });

          updated++;
        } else {
          skipped++;
        }
      }

      console.log('✅ Migration complete!');
      setResult({ updated, skipped });
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Erreur lors de la migration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="migration">
      <h2>🔧 Migration de données</h2>

      <div className="migration-card">
        <h3>Ajouter creationDate aux comptes</h3>
        <p>
          Cette opération va mettre à jour tous les comptes utilisateurs qui n'ont pas de date de création
          en leur assignant la date du <strong>03/03/2025</strong>.
        </p>

        <button
          onClick={migrateUsersCreationDate}
          disabled={loading}
          className="migration-button"
        >
          {loading ? '⏳ Migration en cours...' : '▶️ Lancer la migration'}
        </button>

        {error && (
          <div className="migration-error">
            ❌ Erreur : {error}
          </div>
        )}

        {result && (
          <div className="migration-success">
            <h4>✅ Migration terminée !</h4>
            <ul>
              <li>Comptes mis à jour : <strong>{result.updated}</strong></li>
              <li>Comptes ignorés (avaient déjà une date) : <strong>{result.skipped}</strong></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
