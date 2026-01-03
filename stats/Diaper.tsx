import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

const Diaper = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const { babyID } = useContext(AuthentificationUserContext);
  const [todaySum, setTodaySum] = useState({ 0: 0, 1: 0, 2: 0 });
  const [yesterdaySum, setYesterdaySum] = useState({ 0: 0, 1: 0, 2: 0 });
  const [lastSevenDaysSum, setLastSevenDaysSum] = useState({ 0: 0, 1: 0, 2: 0 });
  const [lastTask, setLastTask] = useState(null);
  const [selectedItem, setSelectedItem] = useState(0);
  const [data, setData] = useState({
    0: { labels: [], datasets: [{ data: [] }] },
    1: { labels: [], datasets: [{ data: [] }] },
    2: { labels: [], datasets: [{ data: [] }] },
  });
  const [stackedData, setStackedData] = useState({
    labels: [],
    legend: [t('diapers.dur'), t('diapers.mou'), t('diapers.liquide')],
    data: [],
    barColors: ["#34777B", "#C75B4A", "#4F469F"]
  });

  useEffect(() => {
    processTasks();
    console.log(babyID);
  }, [tasks]);

  const imagesDiapers = [
    { id: 0, name: t('diapers.dur'), nameTrad: 0 },
    { id: 1, name: t('diapers.mou'), nameTrad: 1 },
    { id: 2, name: t('diapers.liquide'), nameTrad: 2 },
  ];

  const processTasks = () => {
    console.log("diaper");

    let todaySum = { 0: 0, 1: 0, 2: 0 };
    let yesterdaySum = { 0: 0, 1: 0, 2: 0 };
    let lastSevenDaysSum = { 0: 0, 1: 0, 2: 0 };
    let mostRecentTask = null;
    let lastSevenDaysData = {
      0: Array(7).fill(0),
      1: Array(7).fill(0),
      2: Array(7).fill(0),
    };
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }
    labels.reverse();

    tasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      const taskIdCaca = task.idCaca; // Assuming idCaca is 0, 1, or 2

      if (taskDate.isSame(moment(), 'day')) {
        todaySum[taskIdCaca] += 1;
      }
      if (taskDate.isSame(moment().subtract(1, 'day'), 'day')) {
        yesterdaySum[taskIdCaca] += 1;
      }
      if (taskDate.isAfter(moment().subtract(7, 'days'))) {
        lastSevenDaysSum[taskIdCaca] += 1;
      }

      for (let i = 0; i < 7; i++) {
        if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData[taskIdCaca][6 - i] += 1;
        }
      }

      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    setTodaySum(todaySum);
    setYesterdaySum(yesterdaySum);
    setLastSevenDaysSum(lastSevenDaysSum);
    setLastTask(mostRecentTask);
    setData({
      0: {
        labels: labels.map(label => moment(label).format('DD MMM')),
        datasets: [{ data: lastSevenDaysData[0] }],
      },
      1: {
        labels: labels.map(label => moment(label).format('DD MMM')),
        datasets: [{ data: lastSevenDaysData[1] }],
      },
      2: {
        labels: labels.map(label => moment(label).format('DD MMM')),
        datasets: [{ data: lastSevenDaysData[2] }],
      },
    });

    setStackedData({
      labels: labels.map(label => moment(label).format('DD')),
      legend: [],
      data: labels.map((label, index) => [
        lastSevenDaysData[0][index] > 0 ? lastSevenDaysData[0][index] : '',
        lastSevenDaysData[1][index] > 0 ? lastSevenDaysData[1][index] : '',
        lastSevenDaysData[2][index] > 0 ? lastSevenDaysData[2][index] : '',
      ]),
      barColors: ["#A8A8A8", "#C75B4A", "#E29656"]
    });
  };

  const handleCategoryCaca = (selectedItem) => {
    const idCaca = imagesDiapers[selectedItem].id;
    const selectedData = data[idCaca] || { labels: [], datasets: [{ data: [] }] };
    return (
      <View key={idCaca}>
        <Text style={styles.titleParameter}>{t('diapers.someFigures')}</Text>
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ }}>
            <Text>{t('diapers.today')}</Text>
            <Text>{t('diapers.yesterday')}</Text>
            <Text>{t('diapers.last7Days')}</Text>
          </View>
          <View style={{ }}>
            <Text>{todaySum[idCaca]}</Text>
            <Text>{yesterdaySum[idCaca]}</Text>
            <Text>{lastSevenDaysSum[idCaca]}</Text>
          </View>
        </View>

      </View>
    );
  };

  const renderBar = (value, maxValue, color) => {
    const barHeight = (value / maxValue) * 120; // Adjust the height scale as needed
    return (
      <View style={[styles.bar, { height: barHeight, backgroundColor: color,  }]}>
        <Text style={styles.barText}>{value}</Text>
      </View>
    );
  };

  const renderChart = () => {
    const maxValue = Math.max(...stackedData.data.flat());
    return (
      <View style={styles.chartContainer}>
        {stackedData.labels.map((label, index) => {
          const dayTotal = stackedData.data[index].reduce((acc, val) => acc + (val || 0), 0);
          return (
            <View key={index} style={styles.chartColumn}>
              <Text style={styles.totalLabel}>{dayTotal ? dayTotal : ''}</Text>
              {stackedData.data[index].map((value, idx) => (
                renderBar(value, maxValue, stackedData.barColors[idx])
              ))}
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {lastTask ? 
      <View>
        <View style={{ }}>
          <Text style={styles.titleParameter}>{t('diapers.lastTask')}</Text>
          <View>
            <Card key={lastTask.id} task={lastTask} navigation={navigation} editable={false} />
          </View>
        </View>

        

        <View>
          {handleCategoryCaca(selectedItem)}
        </View>

        <View style={{ marginTop: 20, }}>
          <Text style={styles.titleParameter}>{t('diapers.last7DaysStacked')}</Text>
          {renderChart()}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            {imagesDiapers.map((image, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
                <View style={{ width: 10, height: 10, backgroundColor: stackedData.barColors[index], marginRight: 5 }} />
                <Text>{image.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View> 
      : 
      <Text>{t('diapers.noTaskFound')}</Text>}      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  titleParameter: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 3,
  },
  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    width: 65,
    height: 65,
    resizeMode: 'cover',
    borderColor: '#C75B4A',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNonSelected: {
    width: 65,
    height: 65,
    resizeMode: 'cover',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'transparent',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderRadius: 16,
    backgroundColor: '#FDF1E7',
    paddingVertical: 10, // Add padding to avoid shrinking
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1, // Allow columns to expand
  },
  chartLabel: {
    marginBottom: 5,
  },
  bar: {
    width: 30,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalLabel: {
    marginTop: 5,
    fontWeight: 'bold',
  },
});

export default Diaper;