import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { BarChart } from 'react-native-chart-kit';
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
  };

  function handleCategoryCaca(selectedItem) {
    const idCaca = imagesDiapers[selectedItem].id;
    return (
      <View key={idCaca}>
        <Text style={styles.titleParameter}>Quelques chiffres  </Text>
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ }}>
            <Text>Aujourd'hui  </Text>
            <Text>Hier  </Text>
            <Text>Les 7 derniers jours  </Text>
          </View>
          <View style={{ }}>
            <Text>{todaySum[idCaca]}</Text>
            <Text>{yesterdaySum[idCaca]}</Text>
            <Text>{lastSevenDaysSum[idCaca]}</Text>
          </View>
        </View>
        <View style={{ }}>
          <Text style={styles.titleParameter}>Les 7 derniers jours </Text>
          <BarChart
            data={data[idCaca]}
            width={Dimensions.get('window').width - 40}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
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
              marginHorizontal: 0,
            }}
          />
        </View>
      </View>
    );
  }

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
          {imagesDiapers.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setSelectedItem(index);
              }}
              style={[selectedItem == image.id ? styles.imageSelected : styles.imageNonSelected]}
            >
              <Text>{image.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View>
          {handleCategoryCaca(selectedItem)}
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
   // justifyContent: 'center',
   // alignItems: 'center',
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

export default Diaper;