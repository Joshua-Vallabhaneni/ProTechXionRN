/**
 * firebaseConfig.ts
 * Firebase configuration for React Native app
 */

import * as FileSystem from 'expo-file-system';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, onValue, query, orderByChild, limitToLast, get } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXh5K6nXDTLBtG1li9WnTYWfubYMVg7gs",
  authDomain: "protechxion-app.firebaseapp.com",
  databaseURL: "https://protechxion-app-default-rtdb.firebaseio.com",
  projectId: "protechxion-app",
  storageBucket: "protechxion-app.appspot.com",
  messagingSenderId: "176581472218",
  appId: "1:176581472218:web:21c1b935a9d9f1972bee40"
};

// Collection names (now Firebase paths)
export const COLLECTIONS = {
  SHOOTER_IMAGE: 'ShooterImage',
  SHOOTER_VERIFICATION: 'ShooterVerification',
  SHOOTER_COORDINATES: 'ShooterCoordinates'
};

// Types for our data
export interface ShooterCoordinates {
  x: number;
  y: number;
  timestamp: number;
}

export interface VerificationStatus {
  isDetected: boolean;
  timestamp: number;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Add a document to a specific collection
 */
export const addDocument = async (collection: string, document: any) => {
  try {
    // Add timestamp if not present
    if (!document.timestamp) {
      document.timestamp = Date.now();
    }
    
    // Get a reference to the collection
    const collectionRef = ref(database, collection);
    
    // Create a new entry with a unique key
    const newDocRef = push(collectionRef);
    
    // Set the data
    await set(newDocRef, document);
    
    // Return the created document with its ID
    return {
      ...document,
      id: newDocRef.key
    };
  } catch (error) {
    console.error(`[ERROR] Failed to add document to ${collection}:`, error);
    throw error;
  }
};

/**
 * Get the most recent document from a collection
 */
export const getLatestDocument = async (collection: string) => {
  try {
    // Create a query to get the most recent document
    const recentQuery = query(
      ref(database, collection),
      orderByChild('timestamp'),
      limitToLast(1)
    );
    
    // Get the data
    const snapshot = await get(recentQuery);
    
    if (snapshot.exists()) {
      // Convert to array and get the first item
      let result = null;
      snapshot.forEach((childSnapshot) => {
        result = {
          id: childSnapshot.key,
          ...childSnapshot.val()
        };
      });
      return result;
    }
    
    return null;
  } catch (error) {
    console.error(`[ERROR] Failed to get latest document from ${collection}:`, error);
    return null;
  }
};

/**
 * Listen for changes to a specific collection
 */
export const listenForChanges = (collection: string, callback: (data: any[]) => void) => {
  const collectionRef = ref(database, collection);
  
  // Set up the listener
  const unsubscribe = onValue(collectionRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
      // Convert object to array
      const documents = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      
      // Sort by timestamp (newest first)
      documents.sort((a, b) => b.timestamp - a.timestamp);
      
      callback(documents);
    } else {
      callback([]);
    }
  });
  
  // Return function to unsubscribe
  return unsubscribe;
};

/**
 * Legacy compatibility layer for old code
 */
export const getRealm = async () => {
  // Return a Firebase-based interface with similar methods to maintain compatibility
  return {
    objects: (collectionName: string) => {
      // Return a collection with similar API
      return {
        sorted: async () => {
          const latestDoc = await getLatestDocument(collectionName);
          return latestDoc ? [latestDoc] : [];
        },
        length: async () => {
          const snapshot = await get(ref(database, collectionName));
          return snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        }
      };
    },
    write: async (callback: () => Promise<void>) => {
      // Execute the callback
      await callback();
    },
    create: async (collectionName: string, document: any) => {
      // Insert the document
      return await addDocument(collectionName, document);
    },
    path: firebaseConfig.databaseURL // For compatibility
  };
};

/**
 * Close connection - not really needed for Firebase, but kept for compatibility
 */
export const closeRealm = async () => {
  console.log('[DEBUG] Firebase connections automatically managed');
}; 