/**
 * firebaseConfig.js
 * Firebase configuration for React Native app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Collection names (Firebase paths)
export const COLLECTIONS = {
  SHOOTER_IMAGE: 'ShooterImage',
  SHOOTER_VERIFICATION: 'ShooterVerification',
  SHOOTER_COORDINATES: 'ShooterCoordinates'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * @typedef {Object} ShooterCoordinates
 * @property {number} x
 * @property {number} y
 * @property {number} timestamp
 */

/**
 * @typedef {Object} VerificationStatus
 * @property {boolean} isDetected
 * @property {number} timestamp
 */

/**
 * Add a document to a specific collection
 * @param {string} collection - The collection to add to
 * @param {Object} document - The document to add
 * @returns {Promise<Object>} The document with its ID
 */
export const addDocument = async (collection, document) => {
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
 * @param {string} collection - The collection to query
 * @returns {Promise<Object|null>} The most recent document or null
 */
export const getLatestDocument = async (collection) => {
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
 * @param {string} collection - The collection to listen to
 * @param {Function} callback - The callback to call with the documents
 * @returns {Function} Function to unsubscribe
 */
export const listenForChanges = (collection, callback) => {
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

export default { COLLECTIONS, addDocument, getLatestDocument, listenForChanges };