import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import Card from '../Card';
import { BarChart } from 'react-native-chart-kit';

const Thermo = ({ navigation, tasks }) => {
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
      console.log('Tasks available:', tasks);
      processTasks();
    } else {
      console.log('No tasks available');
    }
    console.log('babyID:', babyID);
  }, [tasks]);

  const processTasks = () => {
    try {
      console.log("Processing tasks for thermo");

      let todaySum = 0;
      let yesterdaySum = 0;
      let lastSevenDaysSum = 0;
      let mostRecentTask = null;
      let lastSevenDaysData = Array(7).fill(0);
      let labels = [];

      for (let i = 0; i < 7; i++) {
        labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
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
        if (taskDate.isAfter(moment().subtract(7, 'days'))) {
          lastSevenDaysSum += taskTemperature;
        }

        for (let i = 0; i < 7; i++) {
          if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
            lastSevenDaysData[6 - i] += taskTemperature;
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
        labels: labels.map(label => moment(label).format('DD MMM')),
        datasets: [{ data: lastSevenDaysData }],
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

  return (
    <View style={styles.container}>
      {lastTask ? 
        <View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>Dernière tâche effectuée </Text>
            <Card key={lastTask.id} task={lastTask} navigation={navigation} editable={false}/> 
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>Quelques chiffres </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around'  }}>
              <View style={{  }}>
                <Text>Aujourd'hui </Text>
                <Text>Hier </Text>
                <Text>Les 7 derniers jours </Text>
              </View>
              <View style={{  }}>
                <Text>{todaySum} °C</Text>
                <Text>{yesterdaySum} °C</Text>
                <Text>{lastSevenDaysSum} °C </Text>
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>Evolution sur les 7 derniers jours </Text>
            <BarChart
              data={data}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix="°C"
              chartConfig={{
                backgroundColor: '#FDF1E7',
                backgroundGradientFrom: '#FDF1E7',
                backgroundGradientTo: '#FDF1E7',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(199, 91, 74, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(199, 91, 74, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#C75B4A',
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                marginHorizontal:0,
              }}
            />
          </View>
        </View>
      : 
      <Text>No task found</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    //justifyContent: 'center',
    //alignItems: 'center',
  },
  titleParameter: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 3,
  },
});

export default Thermo;