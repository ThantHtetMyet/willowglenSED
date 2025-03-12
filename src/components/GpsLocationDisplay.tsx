import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Modal,
  Dimensions,
  AppState,
  AppStateStatus,
  PermissionsAndroid,
  Platform,
  ToastAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { NativeModules } from 'react-native';
import restrictedAreas from '../data/restrictedAreas.json';
import { initializeNotifications } from '../utils/notificationService';
import { showBackgroundNotification } from '../utils/notificationService';
import { showNotification } from '../utils/notificationService';

const GpsLocationDisplay = () => {
  // Add new states
  const [modalVisible, setModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // States
  const [coordinates, setCoordinates] = useState({
    longitude: 103.394,
    latitude: 1.359485
  });
  const [hasPlayedInitialAnimation, setHasPlayedInitialAnimation] = useState(false);

  // Refs
  const appState = useRef(AppState.currentState);
  const flashAnimation = useRef(null);
  const titleAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.2)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const phoneBorderAnim = useRef(new Animated.Value(0)).current;

  // Interpolations
  const interpolatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#FF6600']
  });

  const interpolatedPhoneBorder = phoneBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#FF6600']
  });

  const yPosition = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(Dimensions.get('window').height / 2 - 50)]
  });

  // Location permission request
  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "SED needs access to your location",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        updateCoordinates();
      }
    } catch (err) {
      console.log('Location permission error:', err);
    }
  };

  // Update coordinates with animation
  const isPointInPolygon = (point: [number, number], polygon: number[][]) => {
    const [x, y] = point;
    let inside = false;
  
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
  
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  
    return inside;
  };


// Update showAlert function
const showAlert = (message: string) => {
  setAlertMessage(message);
  setModalVisible(true);
  
  showNotification('🚸 SCHOOL ZONE ALERT!', message);

  setTimeout(() => {
    setModalVisible(false);
  }, 3000);
};

  // Modify updateCoordinates function
  const updateCoordinates = () => {
      Geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
  
          // Check if in restricted area
          const isRestricted = restrictedAreas.features.some((feature: RestrictedArea) => {
            if (feature.geometry.type === "Polygon") {
              const coordinates = feature.geometry.coordinates[0];
              if (isPointInPolygon([newCoords.longitude, newCoords.latitude], coordinates)) {
                if (isPointInPolygon([newCoords.longitude, newCoords.latitude], coordinates)) {
                  showAlert(`${feature.properties.Name}\n\nPlease drive carefully - Speed limit 40km/h`);
                  return true;
                }
              }
            }
            return false;
          });
  
          // Existing animation sequence
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
          ]).start(() => {
            setCoordinates(newCoords);
            
            if (!isRestricted) {
              ToastAndroid.showWithGravity(
                'Synchronized GPS Data',
                ToastAndroid.SHORT,
                ToastAndroid.BOTTOM
              );
            }
          });
        },
        (error) => {
          console.log(error.code, error.message);
          ToastAndroid.showWithGravity(
            'GPS Sync Failed',
            ToastAndroid.SHORT,
            ToastAndroid.BOTTOM
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

  // Update the background state handler in useEffect
  useEffect(() => {
    // Initialize notifications with permission check
    initializeNotifications().catch(console.error);
    
    // Initial animation
    if (!hasPlayedInitialAnimation) {
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
        }).start(() => {
          setHasPlayedInitialAnimation(true);
        });
      });
    } else {
      titleAnim.setValue(1);
      moveAnim.setValue(1);
      scaleAnim.setValue(1);
      contentOpacity.setValue(1);
    }

    // App state subscription
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // In the AppState change handler within useEffect
      if (appState.current === 'active' && nextAppState === 'background') {
        try {
          if (NativeModules.BorderOverlay) {
            NativeModules.BorderOverlay.showBorderOverlay();
            const backgroundInterval = setInterval(() => {
              updateCoordinates();
              // Refresh background notification periodically
              showBackgroundNotification();
              
              ToastAndroid.showWithGravity(
                'TEST Warning 1',
                ToastAndroid.SHORT,
                ToastAndroid.BOTTOM
              );

            }, 5000);
            
            showBackgroundNotification(); // Initial background notification
            
            flashAnimation.current = backgroundInterval;
            ToastAndroid.showWithGravity(
              'GPS tracking in background',
              ToastAndroid.SHORT,
              ToastAndroid.BOTTOM
            );
          }
        } catch (error) {
          console.log('Error showing border overlay:', error);
        }
      }
      else if (appState.current === 'background' && nextAppState === 'active') {
        try {
          NativeModules.BorderOverlay?.hideBorderOverlay();
          ToastAndroid.showWithGravity(
            'TEST Warning 2',
            ToastAndroid.SHORT,
            ToastAndroid.BOTTOM
          );
          if (flashAnimation.current) {
            clearInterval(flashAnimation.current);
            flashAnimation.current = null;
          }
          ToastAndroid.showWithGravity(
            'GPS tracking resumed',
            ToastAndroid.SHORT,
            ToastAndroid.BOTTOM
          );
        } catch (error) {
          console.log('Error hiding border overlay:', error);
        }
      }
      appState.current = nextAppState;
    });

    // Location updates
    requestLocationPermission();
    const interval = setInterval(updateCoordinates, 5000);

    // Cleanup
    return () => {
      subscription.remove();
      clearInterval(interval);
      if (flashAnimation.current) {
        clearInterval(flashAnimation.current);
        flashAnimation.current = null;
      }
    };
  }, [hasPlayedInitialAnimation]);

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
              <Text style={styles.label}>Longitude:</Text>
              <Text style={styles.value}>{coordinates.longitude}</Text>
            </View>
            <View style={styles.coordinateRow}>
              <Text style={styles.label}>Latitude:</Text>
              <Text style={styles.value}>{coordinates.latitude}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
      >
          <View style={styles.modalContainer}>
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>{alertMessage}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Add these styles to the StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  phoneBorder: {
    flex: 1,
    borderWidth: 8,
    margin: 5,
    borderRadius: 20,
  },
  titleWrapper: {
    position: 'absolute',
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    top: Dimensions.get('window').height / 2 - 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6600',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 80,
  },
  coordinatesContainer: {
    padding: 20,
    borderWidth: 2,
    borderRadius: 10,
    margin: 20,
    marginTop: 80,
    borderColor: '#000000',
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
  
  modalContainer: {
    position: 'absolute',
    bottom: 100, // Position from bottom
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FF6600',
  },
  alertText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#000',
    fontWeight: 'bold',
  },
});

export default GpsLocationDisplay;
