import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, ToastAndroid, Platform, Modal, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import analytics from './services/analytics';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { useTheme } from './Context/ThemeContext';
import type { Theme } from './constants/theme';
import { initialOf } from './utils/initials';

const ROLES = ['maman', 'papa', 'mamie', 'papy', 'nounou', 'tata', 'tonton', 'autre'] as const;

const ROLE_EMOJIS: Record<string, string> = {
  maman: '👩', papa: '👨', mamie: '👵', papy: '👴',
  nounou: '🍼', tata: '👩‍🦰', tonton: '🧔', autre: '✨',
};

interface BabyFamilySectionProps {
  babyID: string;
  babyName: string;
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
  /** Confirmation « Copié » affichée par l'écran parent, hors de la zone qui défile. */
  onCopied?: () => void;
}

// Membres, partage du code et départ, sur la page unique de l'écran Bébé.
const BabyFamilySection: React.FC<BabyFamilySectionProps> = ({
  babyID,
  babyName,
  babyDocId,
  usersList,
  memberRoles,
  currentUserId,
  adminId,
  onLeaveBaby,
  onRoleUpdated,
  onCopied,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    analytics.logEvent('baby_code_copied', { baby_id: babyID, user_id: currentUserId });
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('success.copied'), ToastAndroid.SHORT);
    } else if (onCopied) {
      onCopied();
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const shareCode = async () => {
    await Share.share({ message: babyID });
    analytics.logEvent('baby_code_shared', { baby_id: babyID, user_id: currentUserId });
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

  // Avatars des membres : teintes du thème, attribuées dans l'ordre d'arrivée.
  const avatarTints = [
    { bg: theme.tintTerracotta, fg: theme.onTintTerracotta },
    { bg: theme.tintSage, fg: theme.onTintSage },
    { bg: theme.tintViolet, fg: theme.categoryAccent[4] },
    { bg: theme.tintGold, fg: theme.onTintGold },
  ];

  return (
    <View style={styles.container}>
      {/* Membres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('baby.familyMembers')}</Text>
        <View style={styles.card}>
          {usersList.map((user, i) => {
            const tint = avatarTints[i % avatarTints.length];
            return (
              <TouchableOpacity
                key={user.userId}
                style={[styles.member, i > 0 && styles.memberBorder]}
                onPress={() => canEditRole(user.userId) ? setEditingUserId(user.userId) : null}
                activeOpacity={canEditRole(user.userId) ? 0.7 : 1}
              >
                <View style={[styles.avatar, { backgroundColor: tint.bg }]}>
                  <Text style={[styles.avatarText, { color: tint.fg }]}>{initialOf(user.username, user.email)}</Text>
                </View>
                <View style={styles.memberDetails}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName} numberOfLines={1}>{user.username}</Text>
                    {user.userId === adminId && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>
                <View style={[styles.roleChip, !isRoleSet(user.userId) && styles.roleChipEmpty]}>
                  <Text style={[styles.userRole, !isRoleSet(user.userId) && styles.userRoleEmpty]}>
                    {isRoleSet(user.userId) ? `${ROLE_EMOJIS[memberRoles[user.userId]]} ` : ''}
                    {getRoleLabel(user.userId)}
                  </Text>
                  {canEditRole(user.userId) && (
                    <FontAwesome name="pencil" size={11} color={theme.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Partage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('baby.shareBaby')}</Text>
        <View style={[styles.card, styles.shareCard]}>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>{t('baby.codeLabel')}</Text>
            <Text style={styles.codeValue} numberOfLines={1} adjustsFontSizeToFit>{babyID}</Text>
          </View>
          <View style={styles.shareButtons}>
            <TouchableOpacity style={styles.shareButton} onPress={shareCode}>
              <MaterialCommunityIcons name="share-variant" size={17} color={theme.onPrimary} />
              <Text style={styles.shareButtonText} numberOfLines={1}>{t('baby.shareCode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(babyID)}>
              <MaterialCommunityIcons name="content-copy" size={16} color={theme.accent} />
              <Text style={styles.copyButtonText} numberOfLines={1}>{t('baby.copyCode')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.leaveButton} onPress={onLeaveBaby}>
        <Text style={styles.leaveButtonText}>{t('baby.leaveBaby')}</Text>
      </TouchableOpacity>

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

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: 24 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase',
    color: theme.textSecondary, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.dark ? 0 : 0.06,
    shadowRadius: 12,
    elevation: theme.dark ? 0 : 2,
  },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  memberBorder: { borderTopWidth: 1, borderTopColor: theme.separator },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  memberDetails: { flex: 1, minWidth: 0 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { flexShrink: 1, fontSize: 16, fontWeight: '800', color: theme.text },
  adminBadge: { backgroundColor: theme.tintTerracotta, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  adminBadgeText: { fontSize: 11, color: theme.onTintTerracotta, fontWeight: '800' },
  userEmail: { fontSize: 13, color: theme.textSecondary, marginTop: 1 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.tintSage, borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  roleChipEmpty: { backgroundColor: theme.soft },
  userRole: { fontSize: 14, fontWeight: '700', color: theme.onTintSage },
  userRoleEmpty: { color: theme.textMuted, fontWeight: '500' },
  shareCard: { padding: 16, gap: 12 },
  codeContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.background, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  codeLabel: { fontSize: 14, color: theme.textSecondary },
  // Les anciens bébés ont un code UUID de 36 caractères : il rétrécit au lieu de déborder.
  codeValue: { flexShrink: 1, marginLeft: 12, fontSize: 22, fontWeight: '800', letterSpacing: 3, color: theme.text },
  shareButtons: { flexDirection: 'row', gap: 10 },
  shareButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 12, minHeight: 48, paddingHorizontal: 8,
  },
  shareButtonText: { flexShrink: 1, color: theme.onPrimary, fontSize: 14, fontWeight: '800' },
  copyButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 12, minHeight: 48, paddingHorizontal: 8,
  },
  copyButtonText: { flexShrink: 1, color: theme.accent, fontSize: 14, fontWeight: '700' },
  leaveButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  leaveButtonText: { color: theme.danger, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text, marginBottom: 20, textAlign: 'center' },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleCard: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  roleCardSelected: { backgroundColor: theme.primary },
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
  roleCheckText: { color: theme.onPrimary, fontSize: 10, fontWeight: '700' },
  roleEmoji: { fontSize: 26 },
  roleLabel: { fontSize: 11, fontWeight: '600', color: theme.textSecondary, textAlign: 'center' },
  roleLabelSelected: { color: theme.onPrimary },
  customToast: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  customToastContent: {
    backgroundColor: theme.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customToastText: { color: theme.onPrimary, fontSize: 14, fontWeight: '600' },
});

export default BabyFamilySection;
