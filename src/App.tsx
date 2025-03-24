import React, { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import GpsLocationDisplay from './components/gpslocationdisplay';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handleSplashComplete = () => {
    setIsLoading(false);
  };

  return isLoading ? (
    <SplashScreen onComplete={handleSplashComplete} />
  ) : (
    <GpsLocationDisplay />
  );
};

export default App;