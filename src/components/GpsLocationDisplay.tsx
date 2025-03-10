import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { NativeModules } from 'react-native';

const GpsLocationDisplay = () => {
  const [coordinates, setCoordinates] = useState({
    longitude: 1.359485,
    latitude: 104.394
  });
  const appState = useRef(AppState.currentState);
  const flashAnimation = useRef(null);

  const titleAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.2)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const phoneBorderAnim = useRef(new Animated.Value(0)).current;

  const interpolatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#FF6600']
  });

  const interpolatedPhoneBorder = phoneBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#FF6600']
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && nextAppState === 'background') {
        // Show system overlay when app goes to background
        NativeModules.BorderOverlay.showBorderOverlay();
      } else if (appState.current === 'background' && nextAppState === 'active') {
        // Hide system overlay when app comes to foreground
        NativeModules.BorderOverlay.hideBorderOverlay();
      }
      appState.current = nextAppState;
    });

    // Initial animation sequence
    Animated.sequence([
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    });

    const updateCoordinates = () => {
      // Flash both borders simultaneously
      Animated.sequence([
        Animated.parallel([
          Animated.timing(phoneBorderAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(borderColorAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          })
        ]),
        Animated.parallel([
          Animated.timing(phoneBorderAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(borderColorAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          })
        ])
      ]).start();

      Geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log(error.code, error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    const interval = setInterval(updateCoordinates, 5000);

    return () => {
      subscription.remove();
      clearInterval(interval);
      if (flashAnimation.current) {
        flashAnimation.current.stop();
      }
    };
  }, []);

  const yPosition = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(Dimensions.get('window').height / 2 - 50)]
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.phoneBorder, {
        borderColor: interpolatedPhoneBorder
      }]}>
        <Animated.View style={[
          styles.titleWrapper,
          {
            opacity: titleAnim,
            transform: [
              { translateY: yPosition },
              { scale: scaleAnim }
            ]
          }
        ]}>
          <Text style={styles.title}>Willowglen SED</Text>
        </Animated.View>

        <Animated.View style={[styles.contentContainer, { opacity: contentOpacity }]}>
          <Animated.View style={[
            styles.coordinatesContainer,
            { borderColor: interpolatedBorderColor }
          ]}>
            <View style={styles.coordinateRow}>
              <Text style={styles.label}>Longititude:</Text>
              <Text style={styles.value}>{coordinates.longitude}</Text>
            </View>
            <View style={styles.coordinateRow}>
              <Text style={styles.label}>Latitude:</Text>
              <Text style={styles.value}>{coordinates.latitude}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  phoneBorder: {
    flex: 1,
    borderWidth: 8,  // Increased from 3 to 8 for thicker border
    margin: 5,
    borderRadius: 20,
  },
  titleWrapper: {
    position: 'absolute',
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    top: Dimensions.get('window').height / 2 - 30, // Adjusted starting position
  },
  title: {
    fontSize: 28,  // Changed from 32 to 28
    fontWeight: 'bold',
    color: '#FF6600',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 80, // Adjusted to prevent overlap
  },
  coordinatesContainer: {
    padding: 20,
    borderWidth: 2,
    borderRadius: 10,
    margin: 20,
    marginTop: 80, // Adjusted spacing
    borderColor: '#000000',
  },
  flashingBorder: {
    borderColor: '#FF6600',
  },
  coordinateRow: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  value: {
    fontSize: 16,
  },
});

export default GpsLocationDisplay;