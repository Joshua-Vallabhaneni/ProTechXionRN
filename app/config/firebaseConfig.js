/**
 * firebaseConfig.js
 * Firebase configuration for React Native app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, onValue, query, orderByChild, limitToLast, get, remove } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtvS-jJZNzn_5T8_y-zkKQazNfONo33SU",
  authDomain: "protechxion-app.firebaseapp.com",
  databaseURL: "https://protechxion-app-default-rtdb.firebaseio.com",
  projectId: "protechxion-app",
  storageBucket: "protechxion-app.firestorage.app",
  messagingSenderId: "1025772388829",
  appId: "1:1025772388829:web:eab2947e46299980d83634",
  measurementId: "G-161S6JPJ38"
};

// Collection names (Firebase paths)
export const COLLECTIONS = {
  SHOOTER_IMAGE: 'ShooterImage',
  SHOOTER_VERIFICATION: 'ShooterVerification',
  SHOOTER_COORDINATES: 'ShooterCoordinates',
  LAST_DETECTED_LOCATION: 'LastDetectedLocation' 

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
 * Add a document to a specific collection and clean up old entries
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
    
    // Clean up old entries based on collection type
    await cleanupOldEntries(collection);
    
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

/**
 * Clean up old entries in a collection based on collection type
 * @param {string} collection - The collection to clean up
 * @returns {Promise<void>}
 */
export const cleanupOldEntries = async (collection) => {
  try {
    let retainCount = 10; // Default number of entries to keep
    
    // Set specific retention counts based on collection
    if (collection === COLLECTIONS.SHOOTER_COORDINATES) {
      retainCount = 10; // Keep the latest 10 coordinates
    } else if (collection === COLLECTIONS.SHOOTER_VERIFICATION) {
      retainCount = 5;  // Keep the latest 5 verification entries
    } else if (collection === COLLECTIONS.SHOOTER_IMAGE) {
      retainCount = 3;  // Keep the latest 3 images
    }
    
    // Get all documents sorted by timestamp (newest first)
    const allItemsQuery = query(
      ref(database, collection),
      orderByChild('timestamp')
    );
    
    const snapshot = await get(allItemsQuery);
    if (!snapshot.exists()) return;
    
    // Convert to array and sort by timestamp (newest first)
    const items = [];
    snapshot.forEach((childSnapshot) => {
      items.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);
    
    // If we have more items than we want to retain, delete the oldest ones
    if (items.length > retainCount) {
      console.log(`Cleaning up ${collection}: ${items.length} items, keeping ${retainCount}`);
      
      // Get the items to delete (oldest ones)
      const itemsToDelete = items.slice(retainCount);
      
      // Delete each item
      for (const item of itemsToDelete) {
        const itemRef = ref(database, `${collection}/${item.id}`);
        await remove(itemRef);
      }
      
      console.log(`Deleted ${itemsToDelete.length} old entries from ${collection}`);
    }
  } catch (error) {
    console.error(`[ERROR] Failed to clean up old entries in ${collection}:`, error);
  }
};

export default { COLLECTIONS, addDocument, getLatestDocument, listenForChanges, cleanupOldEntries };
