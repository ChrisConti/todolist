import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Clipboard, ToastAndroid, Platform, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import Copy from './assets/copy.svg';
import { FontAwesome } from '@expo/vector-icons';
import analytics from './services/analytics';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

const ROLES = ['maman', 'papa', 'mamie', 'papy', 'nounou', 'tata', 'tonton', 'autre'] as const;

const ROLE_EMOJIS: Record<string, string> = {
  maman: '👩', papa: '👨', mamie: '👵', papy: '👴',
  nounou: '🍼', tata: '👩‍🦰', tonton: '🧔', autre: '✨',
};

interface BabyFamilyTabProps {
  babyID: string;
  babyDocId: string;
  usersList: Array<{
    userId: string;
    username: string;
    email: string;
  }>;
  memberRoles: Record<string, string>;
  currentUserId: string;
  adminId: string;
  onLeaveBaby: () => void;
  onRoleUpdated: () => void;
}

const BabyFamilyTab: React.FC<BabyFamilyTabProps> = ({
  babyID,
  babyDocId,
  usersList,
  memberRoles,
  currentUserId,
  adminId,
  onLeaveBaby,
  onRoleUpdated,
}) => {
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    analytics.logEvent('baby_code_copied', { baby_id: babyID, user_id: currentUserId });
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('success.copied'), ToastAndroid.SHORT);
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const canEditRole = (userId: string) =>
    userId === currentUserId || currentUserId === adminId;

  const handleSelectRole = async (userId: string, role: string) => {
    if (savingRole || !babyDocId) return;
    setSavingRole(true);
    const previousRole = memberRoles[userId] || '';
    try {
      await updateDoc(doc(db, 'Baby', babyDocId), {
        [`memberRoles.${userId}`]: role,
      });
      analytics.logEvent('role_updated', {
        baby_id: babyID,
        user_id: userId,
        updated_by: currentUserId,
        old_role: previousRole,
        new_role: role,
      });
      onRoleUpdated();
    } catch (e) {
      console.error('Error updating role:', e);
    } finally {
      setSavingRole(false);
      setEditingUserId(null);
    }
  };

  const getRoleLabel = (userId: string) => {
    const role = memberRoles[userId];
    if (!role) return t('baby.roles.famille');
    return t(`baby.roles.${role}`);
  };

  const isRoleSet = (userId: string) => !!memberRoles[userId];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Membres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('baby.familyMembers')}</Text>
          {usersList.map((user) => (
            <TouchableOpacity
              key={user.userId}
              style={styles.userCard}
              onPress={() => canEditRole(user.userId) ? setEditingUserId(user.userId) : null}
              activeOpacity={canEditRole(user.userId) ? 0.7 : 1}
            >
              <View style={styles.userInfo}>
                <FontAwesome name="user-circle" size={24} color="#C75B4A" />
                <View style={styles.userDetails}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.username}</Text>
                    {user.userId === adminId && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.roleRow}>
                    <Text style={[styles.userRole, !isRoleSet(user.userId) && styles.userRoleEmpty]}>
                      {isRoleSet(user.userId) ? `${ROLE_EMOJIS[memberRoles[user.userId]]} ` : ''}
                      {getRoleLabel(user.userId)}
                    </Text>
                    {canEditRole(user.userId) && (
                      <FontAwesome name="pencil" size={11} color="#C0B0A8" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Partage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('baby.shareBaby')}</Text>
          <Text style={styles.shareDescription}>{t('baby.shareMessage')}</Text>
          <TouchableOpacity style={styles.copyCodeButton} onPress={() => copyToClipboard(babyID)}>
            <Text style={styles.copyCodeText}>{t('baby.copyCode')}</Text>
            <Copy height={20} width={20} />
          </TouchableOpacity>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>{t('baby.codeLabel')} :</Text>
            <Text style={styles.codeValue}>{babyID}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.leaveButton} onPress={onLeaveBaby}>
          <Text style={styles.leaveButtonText}>{t('baby.leaveBaby')}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal édition de rôle */}
      <Modal
        visible={editingUserId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingUserId(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditingUserId(null)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('baby.yourRole')}</Text>
            <View style={styles.rolesGrid}>
              {ROLES.map((role) => {
                const isSelected = editingUserId ? memberRoles[editingUserId] === role : false;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                    onPress={() => editingUserId && handleSelectRole(editingUserId, role)}
                    disabled={savingRole}
                  >
                    {isSelected && (
                      <View style={styles.roleCheck}>
                        <Text style={styles.roleCheckText}>✓</Text>
                      </View>
                    )}
                    <Text style={styles.roleEmoji}>{ROLE_EMOJIS[role]}</Text>
                    <Text style={[styles.roleLabel, isSelected && styles.roleLabelSelected]}>
                      {t(`baby.roles.${role}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Toast iOS */}
      {showToast && (
        <View style={styles.customToast}>
          <View style={styles.customToastContent}>
            <Text style={styles.customToastText}>{t('success.copied')}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF1E7' },
  scrollView: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userDetails: { marginLeft: 12, flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 16, fontWeight: '600', color: '#333' },
  adminBadge: {
    backgroundColor: '#FDF1E7',
    borderWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  adminBadgeText: { fontSize: 10, color: '#C75B4A', fontWeight: '600' },
  userEmail: { fontSize: 14, color: '#7A8889', marginTop: 2 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userRole: { fontSize: 13, color: '#C75B4A', fontWeight: '600' },
  userRoleEmpty: { color: '#B0B8B9', fontWeight: '500' },
  shareDescription: { fontSize: 14, color: '#7A8889', marginBottom: 15, lineHeight: 20 },
  copyCodeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C75B4A',
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
  },
  copyCodeText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginRight: 10 },
  codeContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: { fontSize: 14, fontWeight: '600', color: '#7A8889' },
  codeValue: { fontSize: 14, color: '#333', fontFamily: 'monospace' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FDF1E7',
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  leaveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FDF1E7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleCard: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  roleCardSelected: { backgroundColor: '#C75B4A' },
  roleCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCheckText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  roleEmoji: { fontSize: 26 },
  roleLabel: { fontSize: 11, fontWeight: '600', color: '#555', textAlign: 'center' },
  roleLabelSelected: { color: '#FFF' },
  customToast: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  customToastContent: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customToastText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});

export default BabyFamilyTab;
