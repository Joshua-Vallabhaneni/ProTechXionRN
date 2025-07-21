/**
 * AlertContext.tsx
 * React Context that manages threat alerts and notifications
 */

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  EMERGENCY_PHONE_NUMBER,
  TWILIO_TWIML_URL
} from '../config/env';
import { Platform } from 'react-native';
import * as Base64 from 'base-64';
import * as FileSystem from 'expo-file-system';
import { mockEmergencyCall, mockEmergencyText } from '../utils/mockEmergencyServices';
import { 
  fetchShooterImage, 
  fetchShooterCoordinates,
  updateVerificationStatus,
  startPolling
} from '../utils/dbCommunication';

// Import Firebase config and functions
import { COLLECTIONS, getLatestDocument } from '../config/firebaseConfig';

// Define the ShooterImageDocument interface to match dbCommunication.ts
interface ShooterImageDocument {
  id: string;
  base64Data: string;
  timestamp: number;
}

// Define the ShooterCoordinates type here with optional lastUpdated for timeout tracking
type ShooterCoordinates = {
  x: number;
  y: number;
  timestamp: number;
  lastUpdated?: number; // Added for timeout tracking
};

// At the top of the file, add this declaration
declare global {
  namespace NodeJS {
    interface Global {
      reportThreatFromTerminal?: boolean;
    }
  }
}

// Check for the threat flag
const checkThreatFlag = async () => {
  try {
    // We're no longer using this method for detection since we're auto-triggering
    // Keeping it minimal to avoid false positives
    console.log('Running threat check, global value:', (global as any).reportThreatFromTerminal);
    
    // Only check the global variable
    if ((global as any).reportThreatFromTerminal === true) {
      console.log('Detected global threat flag variable (boolean)');
      // Reset the global variable so we don't trigger multiple times
      (global as any).reportThreatFromTerminal = false;
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('Error checking threat flag:', error);
    return false;
  }
};

// Alert state interface
interface AlertState {
  threatDetected: boolean;
  threatConfirmed: boolean;
  threatImageURL: string | null;
  shooterImage: string | null; // Base64 image from Firebase
  callbotEnabled: boolean;
  textAlertEnabled: boolean;
  shooterCoordinates: ShooterCoordinates | null;
  lastDetectedLocations: Array<{x: number, y: number, timestamp: number, firstSeenInApp?: number}>;
  expiredLocationIds: Set<string>; // Track orange dots that have already expired
  showCoordinates: boolean;
}

// Alert context interface
interface AlertContextType extends AlertState {
  confirmThreat: () => void;
  denyThreat: () => void;
  setCallbotEnabled: (enabled: boolean) => void;
  setTextAlertEnabled: (enabled: boolean) => void;
  setThreatDetected: (detected: boolean) => void;
  setShooterImage: (imageUri: string) => void;
  toggleCoordinates: () => void;
}

// Creating the context with default values
const AlertContext = createContext<AlertContextType>({
  threatDetected: false,
  threatConfirmed: false,
  threatImageURL: null,
  shooterImage: null,
  callbotEnabled: false,
  textAlertEnabled: false,
  shooterCoordinates: null,
  lastDetectedLocations: [],
  expiredLocationIds: new Set(),
  showCoordinates: false,
  confirmThreat: () => {},
  denyThreat: () => {},
  setCallbotEnabled: () => {},
  setTextAlertEnabled: () => {},
  setThreatDetected: () => {},
  setShooterImage: () => {},
  toggleCoordinates: () => {},
});

// Custom hook to use the alert context
export const useAlert = () => useContext(AlertContext);

// Alert Provider component
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AlertState>({
    threatDetected: false,
    threatConfirmed: false,
    threatImageURL: null,
    shooterImage: null,
    callbotEnabled: false,
    textAlertEnabled: false,
    shooterCoordinates: null,
    lastDetectedLocations: [],
    expiredLocationIds: new Set(),
    showCoordinates: false,
  });

  // Reference to the stop polling function
  const stopPollingRef = useRef<(() => void) | null>(null);

  // Check for shooter images and coordinates from the database
  useEffect(() => {
    console.log('AlertContext: Starting database monitoring');
    
    // Store the last processed image timestamp to detect only new images
    let lastProcessedImageTimestamp = 0;
    
    // Check for initial image but don't auto-trigger threat
    const checkInitialImage = async () => {
      try {
        const latestImage = await getLatestDocument(COLLECTIONS.SHOOTER_IMAGE) as ShooterImageDocument;
        if (latestImage) {
          console.log('Initial shooter image found, storing timestamp:', latestImage.timestamp);
          // Store the timestamp but don't trigger threat
          lastProcessedImageTimestamp = latestImage.timestamp;
          // Store the image for later use with proper data URI format
          const imageUri = latestImage.base64Data.startsWith('data:') 
            ? latestImage.base64Data 
            : `data:image/png;base64,${latestImage.base64Data}`;
            
          setState(prev => ({
            ...prev,
            shooterImage: imageUri
          }));
        }
      } catch (error) {
        console.error('Error checking initial image:', error);
      }
    };
    
    checkInitialImage();
    
    // Set up continuous polling for new images and coordinates
    stopPollingRef.current = startPolling(
      // New image callback - Auto-trigger threat for NEW images only
      (imagePath: string, imageData: any) => {
        console.log('New shooter image received:', imageData?.timestamp);
        
        // Only trigger threat if this is a new image (after app started)
        if (imageData && imageData.timestamp > lastProcessedImageTimestamp) {
          console.log('New image detected after app start, triggering threat alert');
          lastProcessedImageTimestamp = imageData.timestamp;
          
          // Auto-trigger threat detection for new images
          // Make sure the image has the proper data URI format
          const imageUri = typeof imageData.base64Data === 'string' && imageData.base64Data.length > 0
            ? (imageData.base64Data.startsWith('data:') 
              ? imageData.base64Data 
              : `data:image/png;base64,${imageData.base64Data}`)
            : imagePath;
            
          setState(prev => ({
            ...prev,
            threatDetected: true,
            threatImageURL: imageUri,
            shooterImage: imageUri
          }));
        } else {
          // Just update the image without triggering threat
          // Make sure the image has the proper data URI format
          const imageUri = typeof imageData?.base64Data === 'string' && imageData?.base64Data?.length > 0
            ? (imageData.base64Data.startsWith('data:') 
              ? imageData.base64Data 
              : `data:image/png;base64,${imageData.base64Data}`)
            : imagePath;
            
          setState(prev => ({
            ...prev,
            shooterImage: imageUri
          }));
        }
      },
      // New coordinates callback
      (coordinates: ShooterCoordinates | null) => {
        setState(prev => {
          // Handle null coordinates (database cleared)
          if (!coordinates) {
            if (prev.shooterCoordinates) {
              console.log('Database cleared - removing shooter coordinates');
            }
            return {
              ...prev,
              shooterCoordinates: null
            };
          }
          
          // Check if coordinates are different from previous ones
          const hasChanged = !prev.shooterCoordinates ||
            prev.shooterCoordinates.x !== coordinates.x ||
            prev.shooterCoordinates.y !== coordinates.y;
          
          // Only log if coordinates have changed
          if (hasChanged) {
            console.log('New shooter coordinates received:', coordinates);
          }
          
          // Add current timestamp to coordinates for timeout checking
          const coordinatesWithTimestamp = {
            ...coordinates,
            lastUpdated: Date.now()
          };
          
          return {
            ...prev,
            shooterCoordinates: coordinatesWithTimestamp
          };
        });
      },
      // NEW: Last detected locations callback
      (locations: Array<{x: number, y: number, timestamp: number}>) => {
        setState(prev => {
          const now = Date.now();
          
          // Create unique IDs for locations and filter out already expired ones
          const newLocationsFiltered = locations.filter(loc => {
            const locationId = `${loc.x}_${loc.y}_${loc.timestamp}`;
            return !prev.expiredLocationIds.has(locationId);
          });
          
          // Add firstSeenInApp timestamp for new locations and preserve existing ones
          const locationsWithFirstSeen = newLocationsFiltered.map(newLoc => {
            // Check if this location already exists in our state
            const existing = prev.lastDetectedLocations.find(existingLoc => 
              existingLoc.x === newLoc.x && 
              existingLoc.y === newLoc.y && 
              existingLoc.timestamp === newLoc.timestamp
            );
            
            return {
              ...newLoc,
              firstSeenInApp: existing?.firstSeenInApp || now // Use existing or set new timestamp
            };
          });
          
          // Separate locations into current (still showing) and expired
          const currentLocations: Array<{x: number, y: number, timestamp: number, firstSeenInApp?: number}> = [];
          const newExpiredIds = new Set(prev.expiredLocationIds);
          
          locationsWithFirstSeen.forEach(loc => {
            const locationId = `${loc.x}_${loc.y}_${loc.timestamp}`;
            if (loc.firstSeenInApp && (now - loc.firstSeenInApp) < 5000) {
              // Still within 5-second window
              currentLocations.push(loc);
            } else if (loc.firstSeenInApp && (now - loc.firstSeenInApp) >= 5000) {
              // Just expired - add to expired tracking
              newExpiredIds.add(locationId);
              console.log(`Orange dot expired and will never show again: ${locationId}`);
            }
          });
          
          // Only clear red dot if we have VISIBLE orange dots (within 5-second window)
          const hasVisibleOrangeDots = currentLocations.length > 0;
          
          // Only log if there are actual current locations
          if (currentLocations.length > 0) {
            console.log('Last detected locations updated:', currentLocations);
          }
          
          if (hasVisibleOrangeDots && prev.shooterCoordinates) {
            console.log('Visible orange dots found, clearing active shooter coordinates to prevent overlay');
          }
          
          return {
            ...prev,
            lastDetectedLocations: currentLocations,
            expiredLocationIds: newExpiredIds,
            // Clear shooter coordinates if we have visible orange dots
            shooterCoordinates: hasVisibleOrangeDots ? null : prev.shooterCoordinates
          };
        });
      },
      1000 // Check every second
    );
    
    // Set up coordinate timeout checker
    const coordinateTimeoutChecker = setInterval(() => {
      setState(prev => {
        // Check if shooter coordinates are stale (older than 5 seconds)
        if (prev.shooterCoordinates && prev.shooterCoordinates.lastUpdated) {
          const now = Date.now();
          const timeSinceUpdate = now - prev.shooterCoordinates.lastUpdated;
          
          if (timeSinceUpdate > 5000) { // 5 seconds
            console.log('Clearing stale shooter coordinates (no updates for 5+ seconds)');
            return {
              ...prev,
              shooterCoordinates: null
            };
          }
        }
        return prev;
      });
    }, 1000); // Check every second

    // Clean up on unmount
    return () => {
      if (stopPollingRef.current) {
        stopPollingRef.current();
      }
      clearInterval(coordinateTimeoutChecker);
    };
  }, []);

  // Ensure threat state is reset on app start/restart
  useEffect(() => {
    console.log('AlertContext: INIT - Resetting all threat flags');
    
    // Initialize the global variable to explicitly false if it doesn't exist
    if (global) {
      // Force it to false, not just reset if it exists
      (global as any).reportThreatFromTerminal = false;
      console.log('AlertContext: Reset global variable to:', (global as any).reportThreatFromTerminal);
    }
    
    // We don't fully reset the threat state here anymore since we're checking the database
    console.log('AlertContext: Initial state set on app initialization');
  }, []);

  // Set threat detected state (will be triggered by the app when a threat is detected)
  const setThreatDetected = (detected: boolean) => {
    console.log('AlertContext: setThreatDetected called with', detected);
    setState(prev => ({
      ...prev,
      threatDetected: detected,
      threatConfirmed: false,
      threatImageURL: detected ? prev.threatImageURL : null
    }));
  };

  const toggleCoordinates = () => {
    setState(prev => ({
      ...prev,
      showCoordinates: !prev.showCoordinates
    }));
  };

  const confirmThreat = async () => {
    console.log('AlertContext: confirmThreat called');
    // Get current state values before updating state
    const shouldPlaceCall = state.callbotEnabled;
    const shouldSendText = state.textAlertEnabled;
    
    // Update state first - ensure both threatDetected and threatConfirmed are set to true
    setState(prev => ({
      ...prev,
      threatDetected: true,
      threatConfirmed: true
    }));
    
    // Update verification status in the database
    try {
      await updateVerificationStatus(true);
      console.log('Verification status updated in database: isDetected = true');
    } catch (error) {
      console.error('Failed to update verification status:', error);
    }
    
    // Then initiate the emergency actions based on the captured values
    if (shouldPlaceCall) {
      try {
        await placeCallBot();
      } catch (error) {
        console.error("Failed to place emergency call:", error);
      }
    }
    
    if (shouldSendText) {
      try {
        await placeTextTo911();
      } catch (error) {
        console.error("Failed to send emergency text:", error);
      }
    }
  };

  const denyThreat = () => {
    console.log('AlertContext: denyThreat called');
    setState(prev => ({
      ...prev,
      threatDetected: false,
      threatConfirmed: false,
    }));
    
    // Update verification status in the database
    try {
      updateVerificationStatus(false);
      console.log('Verification status updated in database: isDetected = false');
    } catch (error) {
      console.error('Failed to update verification status:', error);
    }
  };

  const setCallbotEnabled = (enabled: boolean) => {
    setState(prev => ({
      ...prev,
      callbotEnabled: enabled
    }));
  };

  const setTextAlertEnabled = (enabled: boolean) => {
    setState(prev => ({
      ...prev,
      textAlertEnabled: enabled
    }));
  };

  // Base64 encode using the correct method based on platform
  const encodeBase64 = (str: string) => {
    return Base64.encode(str);
  };


  
  // Twilio API integration for phone calls
  const placeCallBot = async () => {
    try {
      console.log('Starting emergency call process...');
      
      // First try the real API
      try {
        // Construct the URL using the account SID from environment variables
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
        
        const parameters = {
          To: EMERGENCY_PHONE_NUMBER,    // number to call (simulate 911)
          From: TWILIO_PHONE_NUMBER,     // your Twilio number
          Url: TWILIO_TWIML_URL
        };
        
        const formBody = Object.entries(parameters)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        
        const loginString = `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`;
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
          body: formBody
        });
        
        const responseData = await response.text();
        console.log('Call API response status:', response.status);
        console.log('Call API response:', responseData);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseData}`);
        }
        
        console.log('Emergency call successfully initiated through Twilio');
        return true;
      } catch (apiError) {
        console.error('Error with Twilio API:', apiError);
        console.log('Falling back to mock emergency call...');
        
        // Fall back to mock if API fails
        await mockEmergencyCall();
        console.log('Mock emergency call completed');
        return true;
      }
    } catch (error) {
      console.error('Error placing call bot:', error);
      throw error;
    }
  };

  const placeTextTo911 = async () => {
    try {
      console.log('Starting emergency text process...');
      
      try {
        // Try the real API first (not implemented yet)
        throw new Error('Real text API not implemented');
      } catch (apiError) {
        console.error('Error with text API:', apiError);
        console.log('Falling back to mock emergency text...');
        
        // Fall back to mock if API fails
        await mockEmergencyText();
        console.log('Mock emergency text completed');
        return true;
      }
    } catch (error) {
      console.error('Error sending text to 911:', error);
      throw error;
    }
  };

  // Add the setShooterImage function
  const setShooterImage = (imageUri: string) => {
    console.log('AlertContext: setShooterImage called with image URI');
    setState(prevState => ({
      ...prevState,
      shooterImage: imageUri
    }));
  };

  return (
    <AlertContext.Provider
      value={{
        ...state,
        confirmThreat,
        denyThreat,
        setCallbotEnabled,
        setTextAlertEnabled,
        setThreatDetected,
        setShooterImage,
        toggleCoordinates,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export default AlertContext; 