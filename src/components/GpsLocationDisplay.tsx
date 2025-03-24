import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StyleSheet,Alert, Text, Animated, Dimensions, View, AppState, AppStateStatus, ToastAndroid, PermissionsAndroid } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import restrictedAreas from '../data/restrictedAreas.json'; // Assuming the JSON file is placed in the 'data' folder.
import { showNotification,initializeNotifications,showBackgroundNotification } from '../utils/notificationService';
import BackgroundService from 'react-native-background-actions';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import the car icon library
//import { getDeviceOrientation } from 'react-native-device-info'; // For device orientation (heading)
import { Image } from 'react-native';
// Update imports at the top
import { gyroscope } from 'react-native-sensors';
import { magnetometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';

const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

const GpsLocationDisplay = () => {
  const [orientation, setOrientation] = useState(0); // Store device orientation (in degrees)
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [compassHeading, setCompassHeading] = useState(0); // Add this line

  // Increase buffer size and add low-pass filter
  const MAX_HISTORY_LENGTH = 20; // Increased from 10
  let headingHistory = [];
  
  const smoothHeading = (newHeading: number): number => {
    // Normalize heading to 0-360 range
    newHeading = newHeading < 0 ? newHeading + 360 : newHeading;
    newHeading = newHeading % 360;

    // Add to history
    headingHistory.push(newHeading);
    if (headingHistory.length > MAX_HISTORY_LENGTH) {
      headingHistory.shift();
    }

    // Implement a more aggressive low-pass filter
    const alpha = 0.1; // Lower alpha = more smoothing
    let filteredHeading = headingHistory[0];
    
    for (let i = 1; i < headingHistory.length; i++) {
      const diff = headingHistory[i] - filteredHeading;
      // Handle wraparound at 0/360 degrees
      const adjustedDiff = diff > 180 ? diff - 360 : (diff < -180 ? diff + 360 : diff);
      filteredHeading += alpha * adjustedDiff;
      
      // Normalize result
      filteredHeading = filteredHeading < 0 ? filteredHeading + 360 : filteredHeading % 360;
    }

    return filteredHeading;
  };

  // Update the magnetometer subscription with more stable animation
  // Update the magnetometer subscription
  const magSubscription = magnetometer.subscribe(({ x, y, z }) => {
    let heading = Math.atan2(y, x) * (180 / Math.PI);
    // Adjust heading to match map orientation
    heading = (heading < 0) ? heading + 360 : heading;
    heading = (heading + 90) % 360;  // Add 90 degrees to align with map north
    
    // Apply enhanced smoothing
    const smoothedHeading = smoothHeading(heading);
    
    if (Math.abs(smoothedHeading - compassHeading) > 0.5) {
      setCompassHeading(smoothedHeading);
      setOrientation(smoothedHeading);
    }
  });

  const updateOrientation = async () => {
    Geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.heading !== null) {
          const gpsHeading = position.coords.heading; 
          const combinedHeading = (gpsHeading + deviceHeading) / 2;
          const finalHeading = combinedHeading % 360;
          setOrientation(finalHeading);
        }
      },
      (error) => console.log(error),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    return () => {
      magSubscription.unsubscribe();
    };
  };
  
  const [coordinates, setCoordinates] = useState({
    latitude: 1.359485,
    longitude: 104.394,
  });
  const [region, setRegion] = useState({
    latitude: 1.359485,
    longitude: 104.394,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [mapReady, setMapReady] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isInsideRestrictedArea, setIsInsideRestrictedArea] = useState(false); // Track if inside restricted area
  const [notificationSent, setNotificationSent] = useState(false); // Track if notification has been sent
  
  const appState = useRef(AppState.currentState);
  const titleAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.2)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current; // Animation value for border color flashing

  const titleContainerHeight = 80; // Height of the title container (adjust as needed)
  const options = {
      taskName: 'Example',
      taskTitle: 'SED Notification',
      taskDesc: 'SED Notification',
      taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
      },
      color: '#ff00ff',
      linkingURI: 'yourSchemeHere://chat/jane', // See Deep Linking for more info
      parameters: {
          delay: 3000,
      },
  };

  const SendNotificationStart = async (taskDataArguments) => {
      let temp_currentIsRestricted = false;
      
      const { delay } = taskDataArguments;
      await new Promise(async (resolve) => {
        for (let i = 0; BackgroundService.isRunning(); i++) {
          let currentIsRestricted = false;
  
          Geolocation.getCurrentPosition(
            (position) => {
              currentIsRestricted = restrictedAreas.features.some((feature) => {
                if (feature.geometry.type === "Polygon") {
                  const coordinates = feature.geometry.coordinates[0];
                  return isPointInPolygon([position.coords.longitude, position.coords.latitude], coordinates);
                }
                return false;
              });
              // Send appropriate notification based on location
              if (currentIsRestricted) {
                temp_currentIsRestricted = true;  
              } else {
                temp_currentIsRestricted = currentIsRestricted;  
              }
            },
            (error) => console.log(error),
            { enableHighAccuracy: true }
          );
          // Send appropriate notification based on location
          if (temp_currentIsRestricted) {
            showBackgroundNotification();
          } 
          await sleep(delay);
        }
      });
    };

  useEffect(() => {
    // Handle app state changes (background to foreground)
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      // Check if app is going to background
      if (previousState === 'active' && nextAppState === 'background')
      {
        // Reset notification state when app goes to background
        setNotificationSent(false);
        await BackgroundService.start(SendNotificationStart, options);
        await BackgroundService.updateNotification({taskDesc: 'SED Notification'});
        console.log('Background task started');
      } 
      else if (nextAppState === 'active') 
      {
        ToastAndroid.show('BackgroundService stop', ToastAndroid.SHORT);
        await BackgroundService.stop();
        // Reset notification flag when app is active again
        setNotificationSent(false);
      }
    });
     // Initialize notifications with permission check
     initializeNotifications().catch(console.error);
    
    // Request Location Permission
    const requestPermission = async () => {
        // Request gyroscope permission
        const gyroscopeGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // Using location permission as gyroscope doesn't need explicit permission
          {
            title: 'Sensor Permission',
            message: 'We need access to your device sensors for car orientation',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (gyroscopeGranted === PermissionsAndroid.RESULTS.GRANTED) {
          updateOrientation();
        } else {
          Alert.alert('Sensor Permission Denied - Car orientation may not work correctly');
        }

      // Request location permission
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'We need access to your location to display it on the map',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      // Request notification permission
      const notificationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message: "We need permission to send you alerts when in school zones",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );

      if (locationGranted === PermissionsAndroid.RESULTS.GRANTED) {
        updateCoordinates();
      } else {
        Alert.alert('Location Permission Denied');
      }

      if (notificationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Notification Permission Denied - You may not receive alerts when the app is in background');
      }
    };
    
    // Start animation sequence
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
        }),
      ]),
    ]).start(() => {
      setMapReady(true); // Show the map once the animation finishes
    });

    requestPermission();

    // Fetch current position
    const updateCoordinates = () => {
      Geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          // Update heading if available
          if (position.coords.heading !== null) {
            setOrientation(position.coords.heading); // Save heading info
          }
          
          setRegion({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
         
          // Check if in restricted area only after map is ready
          if (mapReady) {
            const isRestricted = restrictedAreas.features.some((feature) => {
              if (feature.geometry.type === "Polygon") {
                const coordinates = feature.geometry.coordinates[0];
                if (isPointInPolygon([position.coords.longitude, position.coords.latitude], coordinates)) {
                  setIsInsideRestrictedArea(true); // Trigger flashing border
                  showAlert(`${feature.properties.Name}\n\nPlease drive carefully - Speed limit 40km/h`);
                  return true;
                }
              }
              return false;
            });

            if (!isRestricted) 
            {
              setIsInsideRestrictedArea(false); // Stop flashing if not inside restricted area
              // Show toast when coordinates are updated
              ToastAndroid.show('Not Inside Restricted Area!!', ToastAndroid.SHORT);
            }
            else
            {
               // Show toast when coordinates are updated
              ToastAndroid.show('Inside Restricted Area!!', ToastAndroid.SHORT);
            }
          }
        },
        (error) => {
          console.log(error.code, error.message);
          maximumAge: 0 // Get fresh heading data
          ToastAndroid.show('Failed to update GPS location', ToastAndroid.SHORT);
        },
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    };

    // Set interval for periodic updates
    const intervalId = setInterval(updateCoordinates, 10000);
    const orientationInterval = setInterval(updateOrientation, 1000); // Update orientation every 2 seconds

    return () => {
      clearInterval(orientationInterval);
      subscription.remove();
      clearInterval(intervalId); 
    };
  }, [titleAnim, moveAnim, scaleAnim, mapReady]);

  // Check if a point is inside a polygon (used for restricted areas)
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

  // Show alert message
  const showAlert = (message: string) => {
    setAlertMessage(message);
    //showNotification('🚸 SCHOOL ZONE ALERT!', message);
   
    //ToastAndroid.show(message, ToastAndroid.LONG); // Show toast with the alert message
  };

  // Flashes the yellow border when inside the restricted area
  const flashBorder = () => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(borderColorAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(borderColorAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );
  };

  useEffect(() => {
    if (isInsideRestrictedArea) {
      flashBorder().start(); // Start flashing when inside a restricted area
    } else {
      borderColorAnim.setValue(0); // Reset border color if not in restricted area
    }
  }, [isInsideRestrictedArea]);

  const interpolatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#FFFF00'], // Flash between transparent and yellow
  });

  const yPosition = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(Dimensions.get('window').height / 2 - 50)],
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Animated.View
            style={[
              styles.titleWrapper,
              {
                opacity: titleAnim,
                transform: [
                  { translateY: yPosition },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <Text style={styles.title}>Willowglen SED</Text>
          </Animated.View>
        </View>

        {mapReady && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.mapStyle}
              region={region}
              showsUserLocation={false}  // Change this to false to hide the blue dot
              showsMyLocationButton={true}
              customMapStyle={mapStyle}
            >
             <Marker 
                coordinate={coordinates}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Image 
                  source={require('../assets/car.png')} 
                  style={[
                    styles.carImage,
                    { transform: [{ rotate: `${orientation}deg` }] }  // Remove the -270 offset
                  ]}
                />
              </Marker>

              {restrictedAreas.features.map((feature, index) => {
                if (feature.geometry.type === 'Polygon') {
                  return (
                    <Polygon
                      key={index}
                      coordinates={feature.geometry.coordinates[0].map(coord => ({
                        latitude: coord[1],
                        longitude: coord[0],
                      }))}
                      strokeColor="#FFFF00"
                      fillColor="rgba(255, 0, 0, 0.3)"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              })}
            </MapView>
          </View>
        )}
      </View>

      {/* Flashing Border */}
      <View style={styles.phoneBorders}>
        <Animated.View
          style={[
            styles.borderTop,
            {
              top: titleContainerHeight, // Ensure the top border starts below the title
              borderColor: interpolatedBorderColor, // Use animated border color
              zIndex: 10, // Ensure the top border is on top
            },
          ]}
        />
        <Animated.View
          style={[
            styles.borderRight,
            {
              borderColor: interpolatedBorderColor,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.borderBottom,
            {
              borderColor: interpolatedBorderColor,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.borderLeft,
            {
              borderColor: interpolatedBorderColor,
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
};

// In the styles StyleSheet, add these new styles
const styles = StyleSheet.create({
   markerContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: 35,  // Increased container size
    height: 35, // Increased container size
  },
  carImage: {
    width: 35,  // Increased image size
    height: 35, // Increased image size
    resizeMode: 'contain',
  },
  container: {
    flex: 1,
    backgroundColor: '#242f3e',
  },
  headerContainer: {
    height: 80,
    width: '100%',
    backgroundColor: '#242f3e',
    zIndex: 2,
  },
  titleWrapper: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    top: Dimensions.get('window').height / 2 - 45,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#242f3e',
    marginTop: -5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6600',
  },
  mapStyle: {
    width: '100%',
    height: '100%',
  },
  phoneBorders: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
    pointerEvents: 'none', // Add this line to allow touch events to pass through
  },
  borderTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderTopWidth: 8,
  },
  borderRight: {
    position: 'absolute',
    top: 80, // Start from below the title container
    right: 0,
    bottom: 0,
    width: 8,
    borderRightWidth: 8,
  },
  borderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    borderBottomWidth: 8,
  },
  borderLeft: {
    position: 'absolute',
    top: 80, // Start from below the title container
    left: 0,
    bottom: 0,
    width: 8,
    borderLeftWidth: 8,
  },
});


// Map Style
const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

export default GpsLocationDisplay;
