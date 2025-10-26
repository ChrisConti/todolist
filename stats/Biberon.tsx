import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

const Biberon = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const { babyID } = useContext(AuthentificationUserContext);
  const [todaySum, setTodaySum] = useState(0);
  const [yesterdaySum, setYesterdaySum] = useState(0);
  const [lastSevenDaysSum, setLastSevenDaysSum] = useState(0);
  const [lastTask, setLastTask] = useState(null);
  const [data, setData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });

  useEffect(() => {
    processTasks();
  }, [tasks]);

  const processTasks = () => {
    let todaySum = 0;
    let yesterdaySum = 0;
    let lastSevenDaysSum = 0;
    let mostRecentTask = null;
    let lastSevenDaysData = Array(7).fill(0);
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }

    tasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');

      if (taskDate.isSame(moment(), 'day')) {
        todaySum += parseFloat(task.label);
      }
      if (taskDate.isSame(moment().subtract(1, 'day'), 'day')) {
        yesterdaySum += parseFloat(task.label);
      }
      if (taskDate.isAfter(moment().subtract(7, 'days'))) {
        lastSevenDaysSum += parseFloat(task.label);
      }

      for (let i = 0; i < 7; i++) {
        if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData[i] += parseFloat(task.label);
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
      labels: labels.map(label => moment(label).format('DD')),
      datasets: [{ data: lastSevenDaysData }],
    });
  };

  const renderBar = (value, maxValue, color, isMax) => {
    const barWidth = (value / maxValue) * 200; // Adjust the width scale as needed
    return (
      <View style={[styles.barContainer]}>
        <View style={[styles.bar, { width: barWidth, backgroundColor: color, opacity: isMax ? 1 : 0.5 }]}>
          <Text style={styles.barText}>{value ? value : ''}</Text>
        </View>
        {value ? 
        <View style={[styles.arrow, { opacity: isMax ? 1 : 0.5 }]} />
        : ''}
      </View>
    );
  };

  const renderChart = () => {
    const maxValue = Math.max(...data.datasets[0].data);
    return (
      <View style={styles.chartContainer}>
        {data.labels.map((label, index) => (
          <View key={index} style={styles.chartRow}>
            <Text style={styles.chartLabel}>{label}</Text>
            {renderBar(data.datasets[0].data[index], maxValue, '#34777B', data.datasets[0].data[index] === maxValue)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {lastTask ? 
        <View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('biberon.lastTask')}</Text>
            <Card key={lastTask.id} task={lastTask} navigation={navigation} editable={false} /> 
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('biberon.someFigures')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View>
                <Text>{t('biberon.today')}</Text>
                <Text>{t('biberon.yesterday')}</Text>
                <Text>{t('biberon.last7Days')}</Text>
              </View>
              <View>
                <Text>{todaySum} ml</Text>
                <Text>{yesterdaySum} ml</Text>
                <Text>{lastSevenDaysSum} ml</Text>
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>{t('biberon.evolutionLast7Days')}</Text>
            {renderChart()}
          </View>
        </View>
      : 
      <Text>{t('biberon.noTaskFound')}</Text>}
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
  chartContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    height: 220,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FDF1E7',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  chartLabel: {
    width: 50,
    marginRight: 10,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderTopColor: 'transparent',
    borderBottomWidth: 15,
    borderBottomColor: 'transparent',
    borderLeftWidth: 15,
    borderLeftColor: '#34777B',
  },
  barText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
});

export default Biberon;