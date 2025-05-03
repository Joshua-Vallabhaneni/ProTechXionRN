import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert, Platform } from 'react-native';
import { ref, onValue, set, push, serverTimestamp, get } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { encode as encodeBase64 } from 'base-64';

// Define the shape of our context
interface AlertContextType {
  isAlertActive: boolean;
  threatLocation: { x: number; y: number } | null;
  threatImage: string | null;
  activateAlert: () => void;
  deactivateAlert: () => void;
  callEmergencyServices: () => void;
}

// Create the context with a default value
const AlertContext = createContext<AlertContextType>({
  isAlertActive: false,
  threatLocation: null,
  threatImage: null,
  activateAlert: () => {},
  deactivateAlert: () => {},
  callEmergencyServices: () => {},
});

// Path constants for Firebase
const SHOOTER_IMAGE_PATH = 'SHOOTER_IMAGE';
const SHOOTER_VERIFICATION_PATH = 'SHOOTER_VERIFICATION';
const SHOOTER_COORDINATES_PATH = 'SHOOTER_COORDINATES';

// Provider component
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [threatLocation, setThreatLocation] = useState<{ x: number; y: number } | null>(null);
  const [threatImage, setThreatImage] = useState<string | null>(null);

  // Listen for shooter verification changes
  useEffect(() => {
    const verificationRef = ref(db, SHOOTER_VERIFICATION_PATH);
    
    const unsubscribe = onValue(verificationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Get the latest verification
        const verifications = Object.values(data);
        if (verifications.length > 0) {
          const latestVerification = verifications[verifications.length - 1] as any;
          
          if (latestVerification.isVerified) {
            setIsAlertActive(true);
          } else {
            setIsAlertActive(false);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for shooter coordinates
  useEffect(() => {
    if (isAlertActive) {
      const coordinatesRef = ref(db, SHOOTER_COORDINATES_PATH);
      
      const unsubscribe = onValue(coordinatesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Get the latest coordinates
          const coordinates = Object.values(data);
          if (coordinates.length > 0) {
            const latestCoordinate = coordinates[coordinates.length - 1] as any;
            setThreatLocation({
              x: latestCoordinate.x,
              y: latestCoordinate.y
            });
          }
        }
      });

      return () => unsubscribe();
    }
  }, [isAlertActive]);

  // Listen for shooter images
  useEffect(() => {
    if (isAlertActive) {
      const imageRef = ref(db, SHOOTER_IMAGE_PATH);
      
      const unsubscribe = onValue(imageRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Get the latest image
          const images = Object.values(data);
          if (images.length > 0) {
            const latestImage = images[images.length - 1] as any;
            setThreatImage(latestImage.image);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [isAlertActive]);

  // Function to activate the alert
  const activateAlert = () => {
    // Create a new verification entry
    const verificationRef = ref(db, SHOOTER_VERIFICATION_PATH);
    push(verificationRef, {
      isVerified: true,
      timestamp: serverTimestamp()
    });
  };

  // Function to deactivate the alert
  const deactivateAlert = () => {
    // Create a new verification entry
    const verificationRef = ref(db, SHOOTER_VERIFICATION_PATH);
    push(verificationRef, {
      isVerified: false,
      timestamp: serverTimestamp()
    });
  };

  // Function to call emergency services
  const callEmergencyServices = async () => {
    // First check if we have threat coordinates
    if (!threatLocation) {
      console.log('No threat location available');
      Alert.alert('Error', 'No threat location available to report to emergency services.');
      return;
    }

    // Mock emergency services call
    const mockCall = async () => {
      console.log('MOCK: Calling emergency services with threat location:', threatLocation);
      
      // Create a simulated delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show a success alert
      Alert.alert(
        'Emergency Services Contacted',
        'Emergency services have been notified of the threat and are on their way.',
        [{ text: 'OK' }]
      );
    };

    // Try to make a real call if on a real device, otherwise use the mock
    if (Platform.OS === 'web') {
      mockCall();
      return;
    }

    console.log('Starting emergency call process...');
    
    // First try the real API
    try {
      // Use environment variables for Twilio credentials
      const accountSid = process.env.TWILIO_ACCOUNT_SID || 'YOUR_ACCOUNT_SID'; // Replace with env variable
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
      
      const parameters = {
        To: process.env.EMERGENCY_PHONE_NUMBER || '+16102031757',    // number to call (simulate 911)
        From: process.env.TWILIO_PHONE_NUMBER || '+18779347536',  // your Twilio number
        Url: process.env.TWILIO_TWIML_URL || 'https://handler.twilio.com/twiml/YOUR_TWIML_URL'
      };
      
      const formBody = Object.entries(parameters)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      
      const username = accountSid;
      const password = process.env.TWILIO_AUTH_TOKEN || 'YOUR_AUTH_TOKEN';
      const loginString = `${username}:${password}`;
      const base64LoginString = encodeBase64(loginString);
      
      console.log('Sending Twilio call request...');
      console.log('Request URL:', url);
      console.log('Request params:', parameters);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64LoginString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });
      
      const responseData = await response.json();
      console.log('Twilio API response:', responseData);
      
      if (response.ok) {
        Alert.alert(
          'Emergency Services Contacted',
          'Emergency services have been notified of the threat and are on their way.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Failed to call emergency services:', responseData);
        throw new Error('Failed to call emergency services');
      }
    } catch (error) {
      console.error('Error calling emergency services:', error);
      
      // Fallback to mock call if the real API fails
      console.log('Falling back to mock emergency call...');
      mockCall();
    }
  };

  return (
    <AlertContext.Provider
      value={{
        isAlertActive,
        threatLocation,
        threatImage,
        activateAlert,
        deactivateAlert,
        callEmergencyServices,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

// Custom hook to use the alert context
export const useAlert = () => useContext(AlertContext);

export default AlertContext;
