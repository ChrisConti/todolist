import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

const Sommeil = ({ navigation, tasks }) => {
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
    if (tasks && tasks.length > 0) {
      processTasks();
    }
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
      const duration = parseInt(task.label, 10); // Assuming duration is in minutes

      if (!isNaN(duration)) {
        if (taskDate.isSame(moment(), 'day')) {
          todaySum += duration;
        }
        if (taskDate.isSame(moment().subtract(1, 'day'), 'day')) {
          yesterdaySum += duration;
        }
        if (taskDate.isAfter(moment().subtract(7, 'days'))) {
          lastSevenDaysSum += duration;
        }

        for (let i = 0; i < 7; i++) {
          if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
            lastSevenDaysData[i] += duration;
          }
        }

        if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
          mostRecentTask = task;
        }
      }
    });

    setTodaySum(todaySum);
    setYesterdaySum(yesterdaySum);
    setLastSevenDaysSum(lastSevenDaysSum);
    setLastTask(mostRecentTask);
    setData({
      labels: labels.map(label => moment(label).format('DD')).reverse(),
      datasets: [{ data: lastSevenDaysData.reverse() }],
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderBar = (value, maxValue, color, isMax) => {
    if (value === 0) return null;
    const barHeight = (value / maxValue) * 200; // Adjust the height scale as needed
    return (
      <View style={[styles.bar, { height: barHeight, backgroundColor: color, opacity: isMax ? 1 : 0.5 }]} />
    );
  };

  const renderChart = () => {
    const maxValue = Math.max(...data.datasets[0].data);
    const yAxisLabels = [maxValue, maxValue / 2, 0].map(formatDuration);
    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, index) => (
            <Text key={index} style={styles.yAxisLabel}>{label}</Text>
          ))}
        </View>
        <View style={styles.chartContent}>
          {data.labels.map((label, index) => (
            <View key={index} style={styles.chartColumn}>
              {renderBar(data.datasets[0].data[index], maxValue, '#E29656', data.datasets[0].data[index] === maxValue)}
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {lastTask ? 
        <View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('sommeil.lastTask')}</Text>
            <Card key={lastTask.id} task={lastTask} navigation={navigation} editable={false} /> 
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('sommeil.someFigures')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View>
                <Text>{t('sommeil.today')}</Text>
                <Text>{t('sommeil.yesterday')}</Text>
                <Text>{t('sommeil.last7Days')}</Text>
              </View>
              <View>
                <Text>{formatDuration(todaySum)}</Text>
                <Text>{formatDuration(yesterdaySum)}</Text>
                <Text>{formatDuration(lastSevenDaysSum)}</Text>
              </View>
            </View>
          </View>
          <View style={{}}>
            <Text style={styles.titleParameter}>{t('sommeil.evolutionLast7Days')}</Text>
            {renderChart()}
          </View>
        </View>
      : 
      <Text>{t('sommeil.noTaskFound')}</Text>}
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
    flexDirection: 'row',
    height: 220,
    marginVertical: 28,
    borderRadius: 16,
    backgroundColor: '#FDF1E7',
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: 8,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#7A8889',
  },
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flex: 1,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartLabel: {
    marginTop: 5,
  },
  bar: {
    width: 35,
    justifyContent: 'flex-end',
    alignItems: 'center',

  },
});

export default Sommeil;