import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import moment from 'moment';
import 'moment/locale/en-gb'; // Ensure moment uses English locale
import 'moment/locale/fr'; // Ensure moment uses French locale
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

const Thermo = ({ navigation, tasks }) => {
  const { t, i18n } = useTranslation();
  const { babyID } = useContext(AuthentificationUserContext);
  const [todaySum, setTodaySum] = useState(0);
  const [yesterdaySum, setYesterdaySum] = useState(0);
  const [last24HoursSum, setLast24HoursSum] = useState(0);
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
    let last24HoursSum = 0;
    let mostRecentTask = null;
    let last24HoursData = Array(12).fill(null); // 12 slots for 24 hours with 2-hour intervals
    let labels = [];

    const isFrench = i18n.language === 'fr';

    for (let i = 0; i < 24; i += 2) {
      labels.push(moment().subtract(i, 'hours').locale(isFrench ? 'fr' : 'en-gb').format(isFrench ? 'HH' : 'h ')); // Format to display hours in 24-hour format for French and 12-hour format with AM/PM for English
    }
    labels.reverse();

    tasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      const taskTemperature = parseFloat(task.label);

      if (isNaN(taskTemperature)) {
        console.warn(`Invalid task temperature for task ID ${task.id}: ${task.label}`);
        return;
      }

      if (taskDate.isSame(moment(), 'day')) {
        todaySum += taskTemperature;
      }
      if (taskDate.isSame(moment().subtract(1, 'day'), 'day')) {
        yesterdaySum += taskTemperature;
      }
      if (taskDate.isAfter(moment().subtract(24, 'hours'))) {
        last24HoursSum += taskTemperature;
      }

      for (let i = 0; i < 24; i += 2) {
        if (taskDate.isBetween(moment().subtract(i + 2, 'hours'), moment().subtract(i, 'hours'))) {
          last24HoursData[11 - i / 2] = taskTemperature;
        }
      }

      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    setTodaySum(todaySum);
    setYesterdaySum(yesterdaySum);
    setLast24HoursSum(last24HoursSum);
    setLastTask(mostRecentTask);
    setData({
      labels: labels,
      datasets: [{ data: last24HoursData }],
    });
  };

  const renderCircle = (value, maxValue, color, isMax) => {
    if (value === null) return null;
    const circleSize = 40; // Adjust the size of the circle as needed
    const circlePosition = (value / maxValue) * 200; // Adjust the position scale as needed
    return (
      <View style={[styles.circleContainer, { bottom: circlePosition }]}>
        <View style={[styles.circle, { backgroundColor: color, opacity: isMax ? 1 : 0.5 }]}>
          <Text style={styles.circleText}>{value.toFixed(1)}°</Text>
        </View>
      </View>
    );
  };

  const renderChart = () => {
    const maxValue = Math.max(...data.datasets[0].data.filter(value => value !== null));
    const yAxisLabels = [maxValue, maxValue / 2, 0].map(value => `${value.toFixed(1)}°`);
    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {yAxisLabels.reverse().map((label, index) => (
            <View key={index} style={[styles.yAxisLabelContainer, { bottom: (index / (yAxisLabels.length - 1)) * 200 }]}>
              <Text style={styles.yAxisLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chartContent}>
          {data.labels.map((label, index) => (
            <View key={index} style={styles.chartColumn}>
              {renderCircle(data.datasets[0].data[index], maxValue, '#4F469F', data.datasets[0].data[index] === maxValue)}
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
            <Text style={styles.titleParameter}>{t('thermo.lastTask')}</Text>
            <Card key={lastTask.id} task={lastTask} navigation={navigation} editable={false}/> 
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('thermo.someFigures')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around'  }}>
              <View style={{  }}>
                <Text>{t('thermo.today')}</Text>
                <Text>{t('thermo.yesterday')}</Text>
                <Text>{t('thermo.last24Hours')}</Text>
              </View>
              <View style={{  }}>
                <Text>{todaySum.toFixed(1)} °C</Text>
                <Text>{yesterdaySum.toFixed(1)} °C</Text>
                <Text>{last24HoursSum.toFixed(1)} °C </Text>
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>{t('thermo.evolutionLast24Hours')}</Text>
            {renderChart()}
          </View>
        </View>
      : 
      <Text>{t('thermo.noTaskFound')}</Text>}
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
    alignItems: 'flex-end',
    position: 'relative',
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: 35,
    position: 'relative',
    height: '100%',
  },
  yAxisLabelContainer: {
    position: 'absolute',
    left: 0,
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
    position: 'relative',
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  chartLabel: {
    marginTop: 5,
  },
  circleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Thermo;