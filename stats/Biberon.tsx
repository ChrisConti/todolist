import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBiberonStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import { STATS_CONFIG } from '../constants/statsConfig';
import TimelineComparison from '../components/stats/timeline/TimelineComparison';
import Timeline7Days from '../components/stats/timeline/Timeline7Days';
import Timeline30Days from '../components/stats/timeline/Timeline30Days';

interface BiberonProps {
  navigation: any;
  tasks: Task[];
}

type TabView = 'detail' | '7days' | '30days';

const Biberon: React.FC<BiberonProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabView>('detail');

  const { lastTask, isLoading, error } = useBiberonStats(tasks);

  return (
    <StatsContainer
      loading={isLoading}
      error={error}
      hasData={!!lastTask}
      emptyMessage={t('biberon.noTaskFound')}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('BiberonInsights')}
        style={styles.insightsButton}
      >
        <Text style={styles.insightsButtonText}>📊 Analyse détaillée</Text>
      </TouchableOpacity>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('detail')}
          style={[styles.tabButton, activeTab === 'detail' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'detail' && styles.tabTextActive]}>
            {t('biberon.viewDetail')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('7days')}
          style={[styles.tabButton, activeTab === '7days' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === '7days' && styles.tabTextActive]}>
            {t('biberon.view7Days')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('30days')}
          style={[styles.tabButton, activeTab === '30days' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === '30days' && styles.tabTextActive]}>
            {t('biberon.view30Days')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'detail' && (
        <TimelineComparison tasks={tasks} viewMode="quantity" />
      )}

      {activeTab === '7days' && (
        <Timeline7Days tasks={tasks} viewMode="quantity" />
      )}

      {activeTab === '30days' && (
        <Timeline30Days tasks={tasks} viewMode="quantity" />
      )}
    </StatsContainer>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 12,
    padding: 4,
    marginTop: STATS_CONFIG.SPACING.MEDIUM,
    marginBottom: STATS_CONFIG.SPACING.LARGE,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: STATS_CONFIG.COLORS.BIBERON,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A8889',
  },
  tabTextActive: {
    color: '#FFF',
  },
  insightsButton: {
    backgroundColor: STATS_CONFIG.COLORS.BIBERON,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: STATS_CONFIG.SPACING.MEDIUM,
    marginBottom: STATS_CONFIG.SPACING.SMALL,
  },
  insightsButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default Biberon;
