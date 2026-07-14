import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SectionList, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { babiesRef, userRef } from '../config';
import { useTranslation } from 'react-i18next';
import Card from "../Card.js";
import Stork from '../assets/parachute2.svg';
import analytics from '../services/analytics';
import Biberon from '../assets/biberon-color.svg';
import Couche from '../assets/couche-color.svg';
import Sante from '../assets/sante-color.svg';
import Dodo from '../assets/dodo-color.svg';
import Thermo from '../assets/thermo-color.svg';
import Allaitement from '../assets/allaitement-color.svg';

// Force Metro rebuild - fix ReviewModal bug
const BabyList = ({ navigation }) => {
  const { user, babyID, setBabyID, userInfo, setUserInfo, setUsersList } = useContext(AuthentificationUserContext);
  const snapshotListener = useRef<(() => void) | null>(null);
  const [tasks, setTasks] = useState([]);
  const [totalTaskCount, setTotalTaskCount] = useState(0);
  const [babyName, setBabyName] = useState('');
  const [babyExist, setBabyExist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null); // null = All, 0-5 = category

  const handleFilterChange = useCallback((id: number | null) => {
    setSelectedFilter(id);
    analytics.logEvent('category_filter_selected', { filter: id === null ? 'all' : id });
  }, []);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Track screen view
    analytics.logScreenView('Home');
    
    if (!user) return;

    setLoading(true);
    setSelectedFilter(null); // Reset filter when baby changes

    // Fetch user info if not already available
    if (!userInfo) fetchUserInfo();

    // Unsubscribe from previous listener if it exists
    if (snapshotListener.current) snapshotListener.current();

    // Set up a new listener for baby data
    snapshotListener.current = fetchBabyData();

    return () => {
      if (snapshotListener.current) snapshotListener.current(); // Cleanup listener
    };
  }, [babyID, user]);

  const fetchBabyData = () => {
    const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));

    return onSnapshot(
      babyQuery,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          handleNoBabyFound();
        } else {
          handleBabyFound(querySnapshot);
        }
        setLoading(false); // Ensure loading stops after fetching data
      },
      (error) => {
        console.error('Error fetching baby data:', error);
        setLoading(false); // Ensure loading stops even if there's an error
      }
    );
  };

  const handleNoBabyFound = () => {
    setBabyID(null);
    setBabyExist(false);
    setBabyName(t('title.following'));
    setTasks([]);
    setTotalTaskCount(0);
    navigation.setOptions({ headerTitle: t('title.following') });
  };

  const handleBabyFound = (querySnapshot) => {
    const babyData = querySnapshot.docs[0]?.data();

    if (babyData) {
      setBabyExist(true);
      setBabyName(babyData.name);
      setBabyID(babyData.id);
      setUsersList(babyData.user);

      // Filter tasks from the last 7 days
      const recentTasks = babyData.tasks?.filter((task) => {
        const taskDate = new Date(task.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return taskDate >= sevenDaysAgo;
      }) || [];

      setTasks(recentTasks);
      setTotalTaskCount(babyData.tasks?.length || 0);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const userQuery = query(userRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(userQuery);

      querySnapshot.forEach((doc) => {
        setUserInfo(doc.data());
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };



  const groupTasksByDay = (tasks) => {
    const daysOfWeek = [t('days.sunday'), t('days.monday'), t('days.tuesday'), t('days.wednesday'), t('days.thursday'), t('days.friday'), t('days.saturday')];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
  
    const groupedTasks = tasks.reduce((acc, task) => {
      const taskDate = new Date(task.date);
      let dayLabel = daysOfWeek[taskDate.getDay()];
  
      if (taskDate.toDateString() === today.toDateString()) {
        dayLabel = t('days.today');
      } else if (taskDate.toDateString() === yesterday.toDateString()) {
        dayLabel = t('days.yesterday');
      }
  
      if (!acc[dayLabel]) acc[dayLabel] = [];
      acc[dayLabel].push(task);
      return acc;
    }, {});
  
    // Sort tasks within each day by time in descending order
    Object.keys(groupedTasks).forEach((key) => {
      groupedTasks[key].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  
    return Object.keys(groupedTasks)
      .sort((a, b) => new Date(groupedTasks[b][0].date) - new Date(groupedTasks[a][0].date))
      .map((key) => ({ title: key, data: groupedTasks[key] }));
  };

  const filteredTasks = useMemo(
    () => selectedFilter === null ? tasks : tasks.filter(task => task.id === selectedFilter),
    [tasks, selectedFilter]
  );

  const sections = useMemo(() => groupTasksByDay(filteredTasks), [filteredTasks]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>{babyName || t('title.following')}</Text>
      </View>

      {/* Filter Bar - only show when baby exists and has tasks */}
      {babyExist && tasks.length > 0 && (
        <FilterBar
          selectedFilter={selectedFilter}
          onFilterChange={handleFilterChange}
          t={t}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C75B4A" />
        </View>
      ) : !babyExist ? (
        <EmptyState
          icon={<Stork height={180} width={180} />}
          actions={[
            { label: t('title.addBaby'), onPress: () => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.navigate('CreateBaby');
              }
            }, primary: true },
            { label: t('settings.joinBaby'), onPress: () => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.navigate('JoinBaby');
              }
            }, primary: false },
          ]}
        />
      ) : tasks.length === 0 ? (
        <EmptyTasksGrid
          title={totalTaskCount === 0
            ? t('home.emptyState.firstTaskTitle')
            : t('home.emptyState.noRecentTitle')}
          babyName={babyName}
          subtitle={t('home.emptyState.subtitle')}
          onSelectCategory={(categoryId: number) => {
            analytics.logEvent('empty_state_category_tapped', {
              category: categoryId,
              first_task: totalTaskCount === 0,
            });
            navigation.navigate('CreateTask', { babyID, initialCategory: categoryId });
          }}
        />
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyFilterContainer}>
          <Text style={styles.emptyFilterText}>{t('noTasksForFilter')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => <Card task={item} navigation={navigation} editable />}
          renderSectionHeader={({ section: { title } }) => (
            <View>
              <Text style={styles.sectionHeader}>{title}</Text>
            </View>
          )}
        />
      )}

      {babyExist && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateTask', { babyID, initialCategory: selectedFilter })} style={styles.floatingButton}>
            <Text style={styles.floatingButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Static — defined once, not recreated on every FilterBar render
const FILTER_CATEGORIES = [
  { id: 0, icon: <Biberon height={30} width={30} />, color: '#34777B' },
  { id: 5, icon: <Allaitement height={30} width={30} />, color: '#1AAAAA' },
  { id: 3, icon: <Dodo height={30} width={30} />, color: '#E29656' },
  { id: 1, icon: <Couche height={30} width={30} />, color: '#C75B4A' },
  { id: 4, icon: <Thermo height={30} width={30} />, color: '#4F469F' },
  { id: 2, icon: <Sante height={30} width={30} />, color: '#6B8DEA' },
];

const FilterBar = React.memo(({ selectedFilter, onFilterChange, t }: { selectedFilter: number | null; onFilterChange: (id: number | null) => void; t: any }) => {
  return (
    <View style={styles.filterContainer}>
      {/* All button */}
      <TouchableOpacity
        onPress={() => onFilterChange(null)}
        style={[
          styles.filterButton,
          selectedFilter === null && styles.filterButtonSelected
        ]}
      >
        <MaterialCommunityIcons
          name="chart-box-multiple-outline"
          size={26}
          color={selectedFilter === null ? '#C75B4A' : '#7A8889'}
        />
      </TouchableOpacity>

      {/* Category buttons */}
      {FILTER_CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.id}
          onPress={() => onFilterChange(category.id)}
          style={[
            styles.filterButton,
            selectedFilter === category.id && styles.filterButtonSelected
          ]}
        >
          {category.icon}
        </TouchableOpacity>
      ))}
    </View>
  );
});

// Tuile carrée : (largeur écran − padding 24×2 − 2 gaps de 14) / 3 colonnes
const TILE_SIZE = Math.floor((Dimensions.get('window').width - 48 - 28) / 3);

// Mêmes couleurs / ordre que la FilterBar et la grille de la page Stats
const EMPTY_GRID_CATEGORIES = [
  { id: 0, Icon: Biberon, color: '#34777B' },
  { id: 5, Icon: Allaitement, color: '#1AAAAA' },
  { id: 3, Icon: Dodo, color: '#E29656' },
  { id: 1, Icon: Couche, color: '#C75B4A' },
  { id: 4, Icon: Thermo, color: '#4F469F' },
  { id: 2, Icon: Sante, color: '#6B8DEA' },
];

const EmptyTasksGrid = ({ title, babyName, subtitle, onSelectCategory }: {
  title: string;
  babyName: string;
  subtitle: string;
  onSelectCategory: (categoryId: number) => void;
}) => (
  <ScrollView contentContainerStyle={styles.emptyTasksContainer} showsVerticalScrollIndicator={false}>
    <Text style={styles.emptyTasksTitle}>{title}</Text>
    <Text style={styles.emptyTasksName}>{babyName}</Text>
    <Text style={styles.emptyTasksSubtitle}>{subtitle}</Text>
    <View style={styles.tilesWrap}>
      {EMPTY_GRID_CATEGORIES.map(({ id, Icon, color }) => (
        <TouchableOpacity
          key={id}
          style={[styles.tile, { backgroundColor: color }]}
          activeOpacity={0.8}
          onPress={() => onSelectCategory(id)}
        >
          <View style={styles.tileIconBadge}>
            <Icon height={34} width={34} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  </ScrollView>
);

const EmptyState = ({ icon, message, actions }) => (
  <View style={{ alignSelf: 'center', paddingTop: 50 }}>
    <View style={{ alignItems: 'center' }}>{icon}</View>
    {message && <Text style={styles.emptyStateText}>{message}</Text>}
    {!message && <View style={{ height: 30 }} />}
    {actions.map((action, index) => (
      <TouchableOpacity key={index} onPress={action.onPress}>
        <View style={[
          styles.button,
          action.primary === false && styles.secondaryButton
        ]}>
          <Text style={[
            styles.buttonText,
            action.primary === false && styles.secondaryButtonText
          ]}>{action.label}</Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF1E7' },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#C75B4A',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F6F0EB',
    fontFamily: 'Pacifico',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FDF1E7',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonSelected: {
    borderColor: '#C75B4A',
    borderWidth: 2.5,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { color: '#7A8889', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, marginTop: 3 },
  footer: { position: 'absolute', bottom: 40, right: 30 },
  floatingButton: { backgroundColor: '#C75B4A', width: 70, height: 70, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  floatingButtonText: { color: '#F6F0EB', fontWeight: 'bold', fontSize: 35 },
  button: { backgroundColor: '#C75B4A', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30, alignItems: 'center', marginBottom: 15, width: 250 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#C75B4A',
  },
  secondaryButtonText: {
    color: '#C75B4A',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7A8889',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyTasksContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyTasksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5A5A5A',
    textAlign: 'center',
  },
  emptyTasksName: {
    fontFamily: 'Pacifico',
    fontSize: 34,
    color: '#C75B4A',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  emptyTasksSubtitle: {
    fontSize: 14,
    color: '#7A8889',
    textAlign: 'center',
    marginBottom: 28,
  },
  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  tileIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFilterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyFilterText: {
    fontSize: 16,
    color: '#7A8889',
    textAlign: 'center',
  },
});

export default BabyList;
