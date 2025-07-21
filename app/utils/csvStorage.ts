/**
 * csvStorage.ts
 * Utility functions for storing and retrieving user data in a CSV file
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = '@user_emails_csv';

/**
 * Save an email to the local CSV storage
 */
export const saveEmail = async (email: string): Promise<void> => {
  try {
    // Get existing emails
    const existingData = await AsyncStorage.getItem(USER_STORAGE_KEY) || '';
    
    // Split into array of emails, filter out empty strings
    const emails = existingData.split(',').filter(Boolean);
    
    // Check if email already exists
    if (!emails.includes(email)) {
      emails.push(email);
      
      // Join back into CSV and save
      await AsyncStorage.setItem(USER_STORAGE_KEY, emails.join(','));
    }
  } catch (error) {
    console.error('Error saving email to CSV storage:', error);
    throw error;
  }
};

/**
 * Check if an email exists in the CSV storage
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const existingData = await AsyncStorage.getItem(USER_STORAGE_KEY) || '';
    const emails = existingData.split(',').filter(Boolean);
    return emails.includes(email);
  } catch (error) {
    console.error('Error checking email in CSV storage:', error);
    throw error;
  }
};

/**
 * Get all stored emails
 */
export const getAllEmails = async (): Promise<string[]> => {
  try {
    const existingData = await AsyncStorage.getItem(USER_STORAGE_KEY) || '';
    return existingData.split(',').filter(Boolean);
  } catch (error) {
    console.error('Error getting emails from CSV storage:', error);
    throw error;
  }
};

/**
 * Clear all stored emails
 */
export const clearAllEmails = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing email storage:', error);
    throw error;
  }
}; 