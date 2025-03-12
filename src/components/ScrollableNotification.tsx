import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
class Notifications {
  scheduleNotification(date: Date) {
    PushNotification.localNotificationSchedule({
      channelId: 'reminders',
      title: 'Your booking is confirmed.',
      message: 'Enjoy your stay! Have a lovely time.',
      date,
      repeatTime:4,
    });
  }
}

export default new Notifications();
