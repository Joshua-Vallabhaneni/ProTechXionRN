/**
 * firebaseConfig.js
 * Firebase configuration for the simulator
 */

const firebase = require('firebase/app');
require('firebase/database');
const fs = require('fs');
const path = require('path');

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
const COLLECTIONS = {
  SHOOTER_IMAGE: 'ShooterImage',
  SHOOTER_VERIFICATION: 'ShooterVerification',
  SHOOTER_COORDINATES: 'ShooterCoordinates'
};

// Initialize Firebase (only if not already initialized)
let app;
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}
const database = firebase.database();

/**
 * Add a document to a collection
 */
const addDocument = async (collection, document) => {
  try {
    // Add timestamp if not present
    if (!document.timestamp) {
      document.timestamp = Date.now();
    }

    // Get a reference to the collection
    const collectionRef = database.ref(collection);
    
    // Push the document to create a new entry with a unique key
    const newDocRef = await collectionRef.push(document);
    
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
    const snapshot = await database.ref(collection)
      .orderByChild('timestamp')
      .limitToLast(1)
      .once('value');
    
    if (snapshot.exists()) {
      // Convert to object (there should be only one)
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
 * Compatibility layer for Realm operations
 * This allows the existing code to work with Firebase with minimal changes
 */
const getRealm = async () => {
  // Return a Firebase adapter with a Realm-like interface
  return {
    objects: (collectionName) => {
      // Return an array-like interface
      return {
        sorted: async (field, ascending = false) => {
          // Get the documents ordered by the specified field
          const dir = ascending ? 'asc' : 'desc';
          const snapshot = await database.ref(collectionName)
            .orderByChild(field)
            .once('value');
          
          // Convert to array
          const array = [];
          snapshot.forEach(child => {
            array.push({
              id: child.key,
              ...child.val()
            });
          });
          
          // Sort as needed (Firebase sometimes returns in wrong order)
          if (dir === 'desc') {
            array.reverse();
          }
          
          return array;
        },
        length: 0 // Will be populated when accessed
      };
    },
    write: async (callback) => {
      // Execute the callback function
      await callback();
    },
    create: async (collectionName, document) => {
      // Create a new document
      return await addDocument(collectionName, document);
    },
    path: firebaseConfig.databaseURL // For compatibility
  };
};

/**
 * Close the connection (no-op for Firebase)
 */
const closeRealm = async () => {
  console.log('Firebase connections are managed automatically');
};

module.exports = { getRealm, closeRealm, COLLECTIONS }; 