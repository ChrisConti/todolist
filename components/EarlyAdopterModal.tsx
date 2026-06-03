import React from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Logo from '../assets/logo.svg';
import Lolipop from '../assets/lolipop.svg';
import BiberonIcon from '../assets/biberon-color.svg';
import DodoIcon from '../assets/dodo-color.svg';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function EarlyAdopterModal({ visible, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium badge */}
          <View style={styles.premiumBadge}>
            <MaterialCommunityIcons name="star" size={14} color="#E8960A" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>

          {/* Title with babies on each side */}
          <View style={styles.titleRow}>
            <Logo width={56} height={56} />
            <Text style={styles.title}>{t('earlyAdopter.title')}</Text>
            <Lolipop width={56} height={56} />
          </View>

          {/* Intro */}
          <Text style={styles.intro}>{t('earlyAdopter.intro')}</Text>

          {/* Feature bullets */}
          <View style={styles.featList}>
            <View style={styles.featRow}>
              <View style={styles.featIcon}>
                <BiberonIcon width={18} height={18} />
              </View>
              <Text style={styles.featText}>{t('earlyAdopter.feat1')}</Text>
            </View>
            <View style={styles.featRow}>
              <View style={styles.featIcon}>
                <DodoIcon width={18} height={18} />
              </View>
              <Text style={styles.featText}>{t('earlyAdopter.feat2')}</Text>
            </View>
            <View style={styles.featRow}>
              <View style={styles.featIcon}>
                <MaterialCommunityIcons name="view-dashboard-outline" size={16} color="#C75B4A" />
              </View>
              <Text style={styles.featText}>{t('earlyAdopter.feat3')}</Text>
            </View>
            <View style={styles.featRow}>
              <View style={styles.featIcon}>
                <MaterialCommunityIcons name="file-export" size={16} color="#C75B4A" />
              </View>
              <Text style={styles.featText}>{t('earlyAdopter.feat4')}</Text>
            </View>
          </View>

          {/* Message */}
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{t('earlyAdopter.message')}</Text>
          </View>

          {/* Signature */}
          <Text style={styles.signature}>{t('earlyAdopter.signature')}</Text>
          <Text style={styles.thanks}>{t('earlyAdopter.thanks')}</Text>
        </ScrollView>

        {/* Bouton fixe — toujours visible */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity style={styles.cta} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{t('earlyAdopter.cta')}</Text>
            <View style={styles.ctaNoteRow}>
              <Text style={styles.ctaNote}>{t('earlyAdopter.ctaNote')}</Text>
              <MaterialCommunityIcons name="heart" size={13} color="rgba(255,255,255,0.8)" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FDF1E7' },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },

  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF8E7',
    borderRadius: 20, borderWidth: 1, borderColor: '#F0D080',
    paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 20,
  },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', color: '#B8860B' },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#C75B4A',
    textAlign: 'center',
    lineHeight: 32,
    flex: 1,
  },

  intro: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },

  featList: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  featRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  featIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FBE9E7',
    alignItems: 'center', justifyContent: 'center',
  },
  featText: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },

  messageCard: {
    backgroundColor: '#FFF',
    borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#E8960A',
    marginBottom: 16, width: '100%',
  },
  messageText: {
    fontSize: 14, color: '#333', lineHeight: 22, fontStyle: 'italic',
  },

  signature: {
    fontSize: 16, fontWeight: '800', color: '#C75B4A',
    textAlign: 'center', marginBottom: 4,
  },
  thanks: {
    fontSize: 13, color: '#7A8889',
    textAlign: 'center', lineHeight: 19,
  },

  ctaWrap: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FDF1E7',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    gap: 8,
  },
  cta: {
    backgroundColor: '#C75B4A',
    borderRadius: 14, paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 4,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  ctaNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaNote: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
});
