/**
 * firebaseConfig.js
 * Firebase configuration for the simulator
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, onValue, query, orderByChild, limitToLast, get, remove } = require('firebase/database');
const fs = require('fs');
const path = require('path');

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
const COLLECTIONS = {
  SHOOTER_IMAGE: 'ShooterImage',
  SHOOTER_VERIFICATION: 'ShooterVerification',
  SHOOTER_COORDINATES: 'ShooterCoordinates'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Add a document to a collection and clean up old entries
 */
const addDocument = async (collection, document) => {
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
    
    // Return the document with its ID
    return {
      ...document,
      id: newDocRef.key
    };
  } catch (error) {
    console.error(`Error adding document to ${collection}:`, error);
    throw error;
  }
};

/**
 * Get the most recent document from a collection
 */
const getLatestDocument = async (collection) => {
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
    console.error(`Error getting latest document from ${collection}:`, error);
    return null;
  }
};

/**
 * Get documents from a collection sorted by a field
 */
const getDocumentsSorted = async (collection, field, ascending = false) => {
  try {
    const sortQuery = query(
      ref(database, collection),
      orderByChild(field)
    );
    
    const snapshot = await get(sortQuery);
    
    // Convert to array
    const array = [];
    snapshot.forEach(child => {
      array.push({
        id: child.key,
        ...child.val()
      });
    });
    
    // Sort as needed (Firebase sometimes returns in wrong order)
    if (!ascending) {
      array.reverse();
    }
    
    return array;
  } catch (error) {
    console.error(`Error getting sorted documents from ${collection}:`, error);
    return [];
  }
};

/**
 * Clean up old entries in a collection based on collection type
 */
const cleanupOldEntries = async (collection) => {
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
    console.error(`Error cleaning up old entries in ${collection}:`, error);
  }
};

module.exports = { 
  COLLECTIONS, 
  addDocument, 
  getLatestDocument,
  getDocumentsSorted,
  cleanupOldEntries
};
