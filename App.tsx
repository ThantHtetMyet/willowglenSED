import React from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import GpsLocationDisplay from './src/components/GpsLocationDisplay';

function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <GpsLocationDisplay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
