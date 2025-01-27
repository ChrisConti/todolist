import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { BarChart } from 'react-native-chart-kit';
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
    boobLeft: { labels: [], datasets: [{ data: [] }] },
    boobRight: { labels: [], datasets: [{ data: [] }] },
    total: { labels: [], datasets: [{ data: [] }] },
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
        boobLeft: {
          labels: labels.map(label => moment(label).format('DD MMM')),
          datasets: [{ data: lastSevenDaysData.boobLeft }],
        },
        boobRight: {
          labels: labels.map(label => moment(label).format('DD MMM')),
          datasets: [{ data: lastSevenDaysData.boobRight }],
        },
        total: {
          labels: labels.map(label => moment(label).format('DD MMM')),
          datasets: [{ data: lastSevenDaysData.total }],
        },
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

  const chartConfig = {
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
  };

  const boobSide = [
    { id: 0, side: 'left', name: t('diapers.dur'), nameTrad: 0 },
    { id: 1, side: 'right', name: t('diapers.mou'), nameTrad: 1 },
    { id: 2, side: 'both', name: t('diapers.liquide'), nameTrad: 2 },
  ];

  const handleSideBoob = (side) => {
    if (side == 0) {
      return (
        <View>
          <Text style={styles.titleParameter}>Quelques chiffres  </Text>
          <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ }}>
              <Text>Aujourd'hui : </Text>
              <Text>Hier : </Text>
              <Text>Les 7 derniers jours : </Text>
            </View>
            <View>
              <Text>{todaySum.boobLeft.toFixed(2)} minutes</Text>
              <Text>{yesterdaySum.boobLeft.toFixed(2)} minutes</Text>
              <Text>{lastSevenDaysSum.boobLeft.toFixed(2)} minutes</Text>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>Evolution des Boob Left sur les 7 derniers jours </Text>
            <BarChart
              data={data.boobLeft}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisLabel=""
              
            yAxisSuffix=" min"
              chartConfig={chartConfig}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                backgroundColor: 'transparent',
                marginHorizontal:0,
              }}
            />
          </View>
        </View>
      );
    } else if (side == 1) {
      return (
        <View>
          <Text style={styles.titleParameter}>Quelques chiffres  </Text>
          <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ }}>
              <Text>Aujourd'hui : </Text>
              <Text>Hier : </Text>
              <Text>Les 7 derniers jours : </Text>
            </View>
            <View>
              <Text>{todaySum.boobRight.toFixed(2)} minutes</Text>
              <Text>{yesterdaySum.boobRight.toFixed(2)} minutes</Text>
              <Text>{lastSevenDaysSum.boobRight.toFixed(2)} minutes</Text>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>Evolution des Boob Right sur les 7 derniers jours </Text>
            <BarChart
              data={data.boobRight}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisLabel=""
              chartConfig={chartConfig}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                backgroundColor: 'transparent',
              }}
            />
          </View>
        </View>
      );
    } else {
      return (
        <View>
          <Text style={styles.titleParameter}>Quelques chiffres  </Text>
          <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ }}>
              <Text>Aujourd'hui : </Text>
              <Text>Hier : </Text>
              <Text>Les 7 derniers jours : </Text>
            </View>
            <View>
              <Text>{todaySum.total.toFixed(2)} minutes</Text>
              <Text>{yesterdaySum.total.toFixed(2)} minutes</Text>
              <Text>{lastSevenDaysSum.total.toFixed(2)} minutes</Text>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>Evolution du Total sur les 7 derniers jours </Text>
            <BarChart
              data={data.total}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisLabel=""
              chartConfig={chartConfig}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                backgroundColor: 'transparent',
                marginHorizontal:0,
              }}
            />
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {lastTask ? 
        <View>
          <View style={{ }}>
            <Text style={styles.titleParameter}>Dernière tâche effectuée </Text>
            <View>
              <Card key={lastTask.id} task={lastTask} navigation={navigation} editable={false} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignSelf: 'center', marginBottom: 20 }}>
            {boobSide.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setSelectedItem(index);
                }}
                style={[selectedItem == image.id ? styles.imageSelected : styles.imageNonSelected]}
              >
                <Text>{image.side}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View>
            {handleSideBoob(selectedItem)}
          </View>
        </View> 
      : 
        <Text>No task found</Text>}      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    //flex: 1,
    padding: 20,
    //justifyContent: 'center',
   // alignItems: 'center',
    backgroundColor: 'transparent',
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
    width: 55,
    height: 55,
    resizeMode: 'cover',
    borderColor: '#C75B4A',
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