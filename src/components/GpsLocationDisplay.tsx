import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StyleSheet, Alert, Text, Animated, Dimensions, View, AppState, AppStateStatus, ToastAndroid, PermissionsAndroid, TouchableOpacity, Modal }  from 'react-native';
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import schoolZoneAreas from '../data/schoolZoneAreas.json'; // Assuming the JSON file is placed in the 'data' folder.
import { showNotification,initializeNotifications,showBackgroundNotification } from '../utils/notificationService';
import BackgroundService from 'react-native-background-actions';
import { Image } from 'react-native';
import { magnetometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';
import silverZoneAreas from '../data/silverZoneAreas.json';

const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

const GpsLocationDisplay = () => {
  const [showInfo, setShowInfo] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  // Add new state for controlling About button visibility
  const [showAboutButton, setShowAboutButton] = useState(false);

  const [isViewingAllZones, setIsViewingAllZones] = useState(false);

  const [showTraffic, setShowTraffic] = useState(false);
  const [orientation, setOrientation] = useState(0); // Store device orientation (in degrees)
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [compassHeading, setCompassHeading] = useState(0); // Add this line
  const [speed, setSpeed] = useState(0); // Add near other state declarations

  // Add ref to MapView
  // Update the ref declaration with proper typing
  const mapRef = useRef<MapView | null>(null);

  // Increase buffer size and add low-pass filter
  const MAX_HISTORY_LENGTH = 50; // Increased buffer size
  let headingHistory = [];
  const [lastPosition, setLastPosition] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);

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
      taskTitle: 'ExampleTask title',
      taskDesc: 'ExampleTask description',
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
  // Add helper function to calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const SendNotificationStart = async (taskDataArguments) => 
  {
    ToastAndroid.show('Background Notification Start!!!', ToastAndroid.SHORT);
    
    // Example of an infinite loop task
    const { delay } = taskDataArguments;
    await new Promise( async (resolve) => {
        for (let i = 0; BackgroundService.isRunning(); i++) 
        {
          Geolocation.getCurrentPosition(
            (position) => {
              const isRestricted = schoolZoneAreas.features.some((feature) => {
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
            });
            if (!isInsideRestrictedArea) {
              
            showNotification('✅ Safe Zone', 
              'You are not in a school zone area');
            console.log(i); }
            else{
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
        await BackgroundService.updateNotification({taskDesc: 'New ExampleTask description'});
        console.log('Background task started');
        ToastAndroid.show('HELLO', ToastAndroid.SHORT);
      } 
      else if (nextAppState === 'active') 
        {
          ToastAndroid.show('BackgroundService stop', ToastAndroid.SHORT);
          await BackgroundService.stop();
          // Reset notification flag when app is active again
          setNotificationSent(false);
  
          // Add helper function to calculate distance
          const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          };
          // Increase buffer size and reduce update rate
          const MAX_HISTORY_LENGTH = 50; // Increased buffer size
          let headingHistory = [];
          
          const smoothHeading = (newHeading: number): number => {
            newHeading = newHeading < 0 ? newHeading + 360 : newHeading % 360;
            headingHistory.push(newHeading);
            if (headingHistory.length > MAX_HISTORY_LENGTH) {
              headingHistory.shift();
            }
            const alpha = 0.05; // Reduced alpha for much slower smoothing
            let filteredHeading = headingHistory[0];
            
            for (let i = 1; i < headingHistory.length; i++) {
              const diff = headingHistory[i] - filteredHeading;
              const adjustedDiff = diff > 180 ? diff - 360 : (diff < -180 ? diff + 360 : diff);
              filteredHeading += alpha * adjustedDiff;
              filteredHeading = filteredHeading < 0 ? filteredHeading + 360 : filteredHeading % 360;
            }
            return filteredHeading;
          };
          
          // In the magnetometer subscription, increase threshold
          const magSubscription = magnetometer.subscribe(({ x, y, z }) => {
            let heading = Math.atan2(y, x) * (180 / Math.PI);
            heading = (heading < 0) ? heading + 360 : heading;
            heading = (heading + 90) % 360;
            
            const smoothedHeading = smoothHeading(heading);
            // Only update if change is significant (increased threshold)
            if (Math.abs(smoothedHeading - compassHeading) > 10) {
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
          };
  
          // Start orientation updates
          updateOrientation();
        }
    });
     // Initialize notifications with permission check
     initializeNotifications().catch(console.error);
    
    // Request Location Permission
    const requestPermission = async () => {
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
      setShowAboutButton(true);
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
          setRegion({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });

          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCoordinates(newCoords);
          
          // Animate to new location
          if (mapRef.current && !isViewingAllZones) {
            mapRef.current.animateToRegion({
              ...newCoords,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 1000);
          }

          // Calculate speed using current and previous positions
          if (lastPosition && lastTimestamp) {
            const distance = calculateDistance(
              lastPosition.latitude,
              lastPosition.longitude,
              position.coords.latitude,
              position.coords.longitude
            );
            const timeElapsed = (position.timestamp - lastTimestamp) / 1000; // Convert to seconds
            const speedKmH = (distance / timeElapsed) * 3600; // Convert to km/h
            setSpeed(Math.round(speedKmH));
          }

          // Update last position and timestamp
          setLastPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLastTimestamp(position.timestamp);
         
          // Check if in restricted area only after map is ready
          if (mapReady) {
            const isRestricted = schoolZoneAreas.features.some((feature) => {
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

            if (!isRestricted) {
              setIsInsideRestrictedArea(false); // Stop flashing if not inside restricted area
            }
          }
        },
        (error) => {
          console.log(error.code, error.message);
          ToastAndroid.show('Failed to update GPS location', ToastAndroid.SHORT);
        },
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    };

    // Set interval for periodic updates
    const intervalId = setInterval(updateCoordinates, 10000);
    return () => 
    {
      subscription.remove();
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
    
    if (showInfo) {
      // First shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  
    // Slide animation
    Animated.timing(slideAnim, {
      toValue: showInfo ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();

  }, [isInsideRestrictedArea,showInfo]);

  const interpolatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#FFFF00'], // Flash between transparent and yellow
  });

  const yPosition = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(Dimensions.get('window').height / 2 - 50)],
  });

  // Add this function after the other const declarations
const showAllZones = () => {
    if (mapRef.current) {
      setIsViewingAllZones(true);
      // Calculate bounds for all zones
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      // Include school zones
      schoolZoneAreas.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach(coord => {
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
          });
        }
      });

      // Include silver zones
      silverZoneAreas.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach(coord => {
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
          });
        }
      });

      // Add padding to the bounds
      const padding = 0.02;
      mapRef.current.animateToRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + padding,
        longitudeDelta: (maxLng - minLng) + padding,
      }, 5000);

      // Reset the flag after animation completes
      setTimeout(() => setIsViewingAllZones(false), 5000);
    }
  };

  interface AboutModalProps {
    visible: boolean;
    onClose: () => void;
  }

  const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose }) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>About Willowglen SED</Text>
            <Text style={styles.modalText}>
              School Zone Enhancement Device (SED) is designed to enhance road safety around school zones.
            </Text>
            <Text style={styles.modalSubtitle}>Features:</Text>
            <Text style={styles.modalText}>• Real-time GPS tracking{'\n'}• School zone & Silver zone alerts{'\n'}• Speed monitoring{'\n'}• Background notifications</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            </View>
            </View>
          </TouchableOpacity>
        </Modal>
      );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {showAboutButton && (
        <TouchableOpacity 
          style={styles.aboutButton}
          onPress={() => setShowInfo(!showInfo)}
        >
          <Image 
              source={require('../assets/about.png')} 
              style={styles.aboutIcon}
              resizeMode="contain"
            />
        </TouchableOpacity>
      )}

    <Animated.View style={[
      styles.infoPanel,
      {
        transform: [
          { translateX: slideAnim },
          { translateX: shakeAnim }  // Add shake transform
        ]
      }
    ]}>
      <View style={styles.infoPanelContent}>
        <Text style={styles.modalTitle}>About Willowglen SED</Text>
        <Text style={styles.modalText}>
          School Zone Enhancement Device (SED) is designed to enhance road safety around school zones.
        </Text>
        <Text style={styles.modalSubtitle}>Features:</Text>
        <Text style={styles.modalText}>• Real-time GPS tracking{'\n'}• School zone & Silver zone alerts{'\n'}• Speed monitoring{'\n'}• Background notifications {'\n'}•Monitor Traffic</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowInfo(false)}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>


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
              ref={mapRef as React.RefObject<MapView>}
              style={styles.mapStyle}
              region={region}
              showsUserLocation={false}
              showsCompass={true}
              showsScale={true}
              showsTraffic={showTraffic}
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
                      { transform: [{ rotate: `${(orientation + 60) % 360}deg` }] }
                    ]}
                  />
                </Marker>
              {schoolZoneAreas.features.map((feature, index) => {
                if (feature.geometry.type === 'Polygon') {
                  return (
                    <Polygon
                      key={index}
                      coordinates={feature.geometry.coordinates[0].map(coord => ({
                        latitude: coord[1],
                        longitude: coord[0],
                      }))}
                      strokeColor="#FFFF00"
                      fillColor="rgba(238, 255, 7, 0.84)"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              })}
                            {/* Silver Zones */}
                            {silverZoneAreas.features.map((feature, index) => {
                if (feature.geometry.type === 'Polygon') {
                  return (
                    <Polygon
                      key={`silver-${index}`}
                      coordinates={feature.geometry.coordinates[0].map(coord => ({
                        latitude: coord[1],
                        longitude: coord[0],
                      }))}
                      strokeColor="#FF69B4"
                      fillColor="rgba(255, 105, 180, 0.4)"
                      strokeWidth={3}
                    />
                  );
                }
                return null;
              })}
            </MapView>
            {/* Speed Display */}
            <View style={styles.speedContainer}>
              <Text style={styles.speedText}>{speed}</Text>
              <Text style={styles.speedUnit}>km/h</Text>
            </View>

            {/* Map Legend */}
            <View style={styles.legendContainer}>
              <TouchableOpacity onPress={showAllZones}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(238, 255, 7, 0.84)' }]} />
                  <Text style={styles.legendText}>School Zone</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 105, 180, 0.4)' }]} />
                  <Text style={styles.legendText}>Silver Zone</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.legendItem, styles.trafficToggle]} 
                onPress={() => setShowTraffic(!showTraffic)}
              >
                <View style={[styles.legendColor, { 
                  backgroundColor: showTraffic ? '#4CAF50' : '#757575',
                  borderRadius: 10
                }]} />
                <Text style={styles.legendText}>Traffic</Text>
              </TouchableOpacity>
            </View>
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

const styles = StyleSheet.create({
  aboutButton: {
    position: 'absolute',
    top: 20,
    left: 10,  // Changed from 20 to 10 to move more to the left
    backgroundColor: 'rgba(36, 47, 62, 0.8)',
    width: 45,
    height: 45,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    borderWidth: 1,
    borderColor: '#ffffff50',
  },
  aboutIcon: {
    width: 30,    // Increased icon size
    height: 30,   // Increased icon size
  },
infoPanel: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 300,
  backgroundColor: 'rgba(36, 47, 62, 0.95)',
  zIndex: 1000,
  borderRightWidth: 1,
  borderColor: '#ffffff50',
  elevation: 5,
},
infoPanelContent: {
  padding: 20,
  paddingTop: 60,
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
    paddingLeft: 35,  // Add padding to move title away from the about button
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
  legendContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(36, 47, 62, 0.8)',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff50',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  trafficToggle: {
    opacity: 0.8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ffffff30',
  },
  legendColor: {
    width: 20,
    height: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ffffff50',
  },
  legendText: {
    color: '#ffffff',
    fontSize: 14,
  },
  speedContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(36, 47, 62, 0.8)',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff50',
    alignItems: 'center',
  },
  speedText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  speedUnit: {
    color: '#ffffff',
    fontSize: 12,
  },
  aboutButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(36, 47, 62, 0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    borderWidth: 1,
    borderColor: '#ffffff50',
  },
  aboutButtonText: {
    fontSize: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#242f3e',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    borderWidth: 1,
    borderColor: '#ffffff50',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6600',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 10,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: '#FF6600',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
