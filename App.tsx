import React, { useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { initializeNotifications } from './src/utils/notificationService';
import GpsLocationDisplay from './src/components/GpsLocationDisplay';
import { initializeFirebase } from './src/utils/firebaseConfig';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize Firebase at app startup
    initializeFirebase();
    initializeNotifications();
  }, []);

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
