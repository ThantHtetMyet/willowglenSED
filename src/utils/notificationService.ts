import PushNotification, { Importance } from 'react-native-push-notification';
import { PermissionsAndroid, Platform } from 'react-native';

export const requestNotificationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message: "SED needs to send you notifications",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.log('Notification permission error:', err);
      return false;
    }
  }
  return true;
};

export const initializeNotifications = async () => {
  try 
  {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.log('Notification permission denied');
        return;
      }

      // Create the notification channel first
      PushNotification.createChannel(
        {
          channelId: 'school-zone',
          channelName: 'School Zone Alerts',
          channelDescription: 'Notifications for school zone alerts',
          playSound: true,
          soundName: 'default',
          importance: Importance.HIGH,
          vibrate: true,
        },
        (created) => console.log(`createChannel returned '${created}'`)
      );

      // Configure push notifications for the app
      PushNotification.configure({
        // (Optional) Called when the notification is received
        onNotification: function(notification) {
          console.log("NOTIFICATION:", notification);
        },
        // (Optional) iOS only, if you need background notifications
        onAction: function(notification) {
          console.log("ACTION:", notification.action);
          console.log("NOTIFICATION:", notification);
        },
        // iOS only - Required for permissions
        onRegistrationError: function(err) {
          console.error(err);
        },
        // iOS only - Register for remote notifications
        requestPermissions: Platform.OS === 'ios'
      });
      
    } 
    catch (error) 
    {
      console.log('Notification initialization error:', error);
    }
};

export const showBackgroundNotification = () => {
  PushNotification.localNotification({
    channelId: 'school-zone',
    title: '🚸 SCHOOL ZONE ALERT!',
    message: 'Please drive carefully - Speed limit 40km/h',
    playSound: true,
    soundName: 'default',
    importance: "high",  // Changed from Importance.HIGH to "high"
    vibrate: true,
    priority: 'high',
  });
};

export const showNotification = (title: string, message: string) => {
  PushNotification.localNotification({
    channelId: 'school-zone',
    title: title,
    message: message,
    playSound: true,
    soundName: 'default',
    importance: "high",  // Changed from Importance.HIGH to "high"
    vibrate: true,
    priority: 'high',
  });
};