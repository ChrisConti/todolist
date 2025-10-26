import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

const Allaitement = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const { babyID } = useContext(AuthentificationUserContext);
  const [todaySum, setTodaySum] = useState({ boobLeft: 0, boobRight: 0, total: 0 });
  const [yesterdaySum, setYesterdaySum] = useState({ boobLeft: 0, boobRight: 0, total: 0 });
  const [lastSevenDaysSum, setLastSevenDaysSum] = useState({ boobLeft: 0, boobRight: 0, total: 0 });
  const [lastTask, setLastTask] = useState(null);
  const [selectedItem, setSelectedItem] = useState(0);
  const [data, setData] = useState({
    labels: [],
    boobLeft: [],
    boobRight: [],
    total: [],
  });

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      console.log('Tasks available:', tasks);
      processTasks();
    } else {
      console.log('No tasks available');
    }
    console.log('babyID:', babyID);
  }, [tasks]);

  const boobSide = [
    { id: 0, side: t('allaitement.left'), name: t('allaitement.left'), nameTrad: 0 },
    { id: 1, side: t('allaitement.right'), name: t('allaitement.right'), nameTrad: 1 },
    { id: 2, side: t('allaitement.both'), name: t('allaitement.both'), nameTrad: 2 },
  ];

  const processTasks = () => {
    try {
      console.log("Processing tasks for allaitement");

      let todaySum = { boobLeft: 0, boobRight: 0, total: 0 };
      let yesterdaySum = { boobLeft: 0, boobRight: 0, total: 0 };
      let lastSevenDaysSum = { boobLeft: 0, boobRight: 0, total: 0 };
      let mostRecentTask = null;
      let lastSevenDaysData = {
        boobLeft: Array(7).fill(0),
        boobRight: Array(7).fill(0),
        total: Array(7).fill(0),
      };
      let labels = [];

      for (let i = 0; i < 7; i++) {
        labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
      }
      labels.reverse();

      tasks.forEach((task) => {
        if (task.id === 5) {
          const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
          const boobLeft = (parseFloat(task.boobLeft) || 0) / 60; // Convert seconds to minutes
          const boobRight = (parseFloat(task.boobRight) || 0) / 60; // Convert seconds to minutes
          const total = boobLeft + boobRight;

          if (taskDate.isSame(moment(), 'day')) {
            todaySum.boobLeft += boobLeft;
            todaySum.boobRight += boobRight;
            todaySum.total += total;
          }
          if (taskDate.isSame(moment().subtract(1, 'day'), 'day')) {
            yesterdaySum.boobLeft += boobLeft;
            yesterdaySum.boobRight += boobRight;
            yesterdaySum.total += total;
          }
          if (taskDate.isAfter(moment().subtract(7, 'days'))) {
            lastSevenDaysSum.boobLeft += boobLeft;
            lastSevenDaysSum.boobRight += boobRight;
            lastSevenDaysSum.total += total;
          }

          for (let i = 0; i < 7; i++) {
            if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
              lastSevenDaysData.boobLeft[6 - i] += boobLeft;
              lastSevenDaysData.boobRight[6 - i] += boobRight;
              lastSevenDaysData.total[6 - i] += total;
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
        labels: labels.map(label => moment(label).format('DD')),
        boobLeft: lastSevenDaysData.boobLeft,
        boobRight: lastSevenDaysData.boobRight,
        total: lastSevenDaysData.total,
      });

      console.log('Processed tasks:', {
        todaySum,
        yesterdaySum,
        lastSevenDaysSum,
        mostRecentTask,
        lastSevenDaysData,
        labels,
      });
    } catch (error) {
      console.error('Error processing tasks:', error);
    }
  };

  const renderBarChart = () => {
    const maxValue = Math.max(...data.total);
    const chartHeight = 220;
    const barWidth = 20;
    const barSpacing = 10;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {[maxValue, maxValue / 2, 0].map((value, index) => (
            <Text key={index} style={styles.yAxisLabel}>
              {value > 60 ? `${(value / 60).toFixed(1)} h` : `${value.toFixed(0)} min`}
            </Text>
          ))}
        </View>
        <View style={styles.chartContent}>
          {data.labels.map((label, index) => (
            <View key={index} style={styles.chartColumn}>
              <Text style={styles.totalText}>
                {data.total[index] > 60
                  ? `${(data.total[index] / 60).toFixed(1)} h`
                  : `${data.total[index].toFixed(0)}`}
              </Text>
              <View style={styles.barContainer}>
                
                <View
                  style={[
                    styles.bar,
                    {
                      height: (data.boobLeft[index] / maxValue) * chartHeight,
                      backgroundColor: '#1AAAAA',
                      width: barWidth,
                    },
                  ]}
                >
                  <Text style={styles.barText}>{data.boobLeft[index].toFixed(0)}</Text>
                  <Text style={styles.barText}>m</Text>
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (data.boobRight[index] / maxValue) * chartHeight,
                      backgroundColor: '#E29656',
                      
                      width: barWidth,
                      //marginLeft: barSpacing,
                    },
                  ]}
                >
                  <Text style={styles.barText}>{data.boobRight[index].toFixed(0)}</Text>
                  <Text style={styles.barText}>m</Text>
                </View>
              </View>
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
          <View style={{ }}>
            <Text style={styles.titleParameter}>{t('allaitement.lastTask')}</Text>
            <View style={{ marginTop: 20 }}>
              <Card key={lastTask.id} task={lastTask} navigation={navigation} editable={false} />
            </View>
          </View>

          <View style={{ marginTop : 20}}>
            <Text style={styles.titleParameter}>{t('diapers.last7DaysStacked')}</Text>
            {renderBarChart()}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                     
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
                          <View style={{ width: 10, height: 10, backgroundColor: '#1AAAAA', marginRight: 5 }} />
                          <Text>{t('breast.left')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
                          <View style={{ width: 10, height: 10, backgroundColor: "#E29656", marginRight: 5 }} />
                          <Text>{t('breast.right')}</Text>
                        </View>
                      
                    </View>
        </View> 
      : 
        <Text>{t('allaitement.noTaskFound')}</Text>}      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'transparent',
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
    marginRight: 10,
    position: 'relative',
    height: '100%',
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
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  bar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  barText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartLabel: {
    marginTop: 5,
  },
  totalText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    width: 55,
    height: 55,
    resizeMode: 'cover',
    borderColor: '#1AAAAA',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNonSelected: {
    width: 50,
    height: 50,
    resizeMode: 'cover',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'transparent',
  },
});

export default Allaitement;