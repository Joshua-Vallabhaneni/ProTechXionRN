/**
 * clear-database.js
 * Utility script to clear all entries in the Firebase database
 */

const { COLLECTIONS } = require('./firebaseConfig');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, remove } = require('firebase/database');

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Clear all entries in a specific collection
 */
const clearCollection = async (collection) => {
  try {
    console.log(`Clearing all entries in ${collection}...`);
    const collectionRef = ref(database, collection);
    await remove(collectionRef);
    console.log(`✅ Successfully cleared all entries in ${collection}`);
  } catch (error) {
    console.error(`❌ Error clearing entries in ${collection}:`, error);
  }
};

/**
 * Clear all entries in all collections
 */
const clearAllCollections = async () => {
  console.log('🔄 Starting database cleanup...');
  
  // Clear each collection
  await clearCollection(COLLECTIONS.SHOOTER_IMAGE);
  await clearCollection(COLLECTIONS.SHOOTER_VERIFICATION);
  await clearCollection(COLLECTIONS.SHOOTER_COORDINATES);
  
  console.log('✅ Database cleanup complete! All collections have been cleared.');
  console.log('You can now start testing with a fresh database.');
};

// Run the cleanup
clearAllCollections().catch(error => {
  console.error('❌ Error during database cleanup:', error);
});
