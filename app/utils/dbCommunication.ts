import * as FileSystem from 'expo-file-system';
import { decode as base64Decode, encode as base64Encode } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Firebase functions
import firebaseConfig, { COLLECTIONS, getLatestDocument, addDocument } from '../config/firebaseConfig';

// Define interfaces for our Firebase documents
interface ShooterImageDocument {
  id: string;
  base64Data: string;
  timestamp: number;
}

interface ShooterCoordinatesDocument {
  id: string;
  x: number;
  y: number;
  timestamp: number;
}

interface ShooterVerificationDocument {
  id: string;
  isDetected: boolean;
  timestamp: number;
}

/**
 * Fetch the latest shooter image from Firebase database
 * @returns Promise with the data URI of the image
 */
export async function fetchShooterImage(): Promise<string | null> {
  try {
    console.log('[DEBUG] Attempting to fetch shooter image');
    console.log('[DEBUG] Connecting to Firebase');
    
    // Get the latest image document from Firebase
    const latestImage = await getLatestDocument(COLLECTIONS.SHOOTER_IMAGE) as ShooterImageDocument | null;
    
    if (!latestImage) {
      console.log('[DEBUG] No shooter image found');
      return null;
    }
    
    console.log('[DEBUG] Latest image found with ID:', latestImage.id);
    
    // If we have an image stored as Base64 string
    if (latestImage.base64Data) {
      console.log('[DEBUG] Image has base64Data, length:', latestImage.base64Data.substring(0, 50) + '...');
      
      // Return the base64 data directly with proper data URI format
      const base64Uri = `data:image/png;base64,${latestImage.base64Data}`;
      console.log('[DEBUG] Using direct base64 URI format');
      
      // Store the image ID in AsyncStorage for tracking latest image
      await AsyncStorage.setItem('latestImageId', latestImage.id);
      
      return base64Uri;
    } else {
      console.log('[DEBUG] Image found but has no base64Data');
    }
    
    return null;
  } catch (error) {
    console.error('[DEBUG] Critical error fetching shooter image:', error);
    return null;
  }
}

/**
 * Update the verification status in the database
 * @param isDetected Boolean indicating if the shooter is verified
 */
export async function updateVerificationStatus(isDetected: boolean): Promise<void> {
  try {
    // Create a new verification document using Firebase directly
    await addDocument(COLLECTIONS.SHOOTER_VERIFICATION, {
      isDetected,
      timestamp: Date.now()
    });
    
    console.log(`Verification status updated: isDetected = ${isDetected}`);
  } catch (error) {
    console.error('Error updating verification status:', error);
    throw error;
  }
}

/**
 * Fetch the latest shooter coordinates
 * @returns Promise with the latest coordinates
 */
export async function fetchShooterCoordinates(): Promise<{x: number, y: number, timestamp: number} | null> {
  try {
    const latestCoordinates = await getLatestDocument(COLLECTIONS.SHOOTER_COORDINATES) as ShooterCoordinatesDocument | null;
    
    if (!latestCoordinates) {
      console.log('No shooter coordinates found');
      return null;
    }
    
    return {
      x: latestCoordinates.x,
      y: latestCoordinates.y,
      timestamp: latestCoordinates.timestamp
    };
  } catch (error) {
    console.error('Error fetching shooter coordinates:', error);
    return null;
  }
}

/**
 * Check if there's a new shooter image since the last fetch
 * @returns Promise<boolean> true if there's a new image
 */
export async function hasNewShooterImage(): Promise<boolean> {
  try {
    const latestImage = await getLatestDocument(COLLECTIONS.SHOOTER_IMAGE) as ShooterImageDocument | null;
    
    if (!latestImage) {
      return false;
    }
    
    // Check if this is a new image compared to what we've seen
    const lastImageId = await AsyncStorage.getItem('latestImageId');
    return lastImageId !== latestImage.id;
  } catch (error) {
    console.error('Error checking for new shooter image:', error);
    return false;
  }
}

/**
 * Set up a polling mechanism to continuously check for updates
 * @param onNewImage Callback when a new image is detected
 * @param onNewCoordinates Callback when new coordinates are received
 * @param pollingInterval Interval in milliseconds between checks
 * @returns Function to stop polling
 */
export function startPolling(
  onNewImage?: (imagePath: string, imageData?: ShooterImageDocument) => void,
  onNewCoordinates?: (coordinates: {x: number, y: number, timestamp: number}) => void,
  pollingInterval: number = 1000
): () => void {
  let isPolling = true;
  
  const poll = async () => {
    if (!isPolling) return;
    
    try {
      // Check for new image
      if (onNewImage) {
        // Get the latest image document directly
        const latestImage = await getLatestDocument(COLLECTIONS.SHOOTER_IMAGE) as ShooterImageDocument | null;
        
        if (latestImage && latestImage.base64Data) {
          // Check if this is a new image compared to what we've seen
          const lastImageId = await AsyncStorage.getItem('latestImageId');
          const isNewImage = lastImageId !== latestImage.id;
          
          if (isNewImage) {
            // Update the stored image ID
            await AsyncStorage.setItem('latestImageId', latestImage.id);
            
            // Create the image path
            const imagePath = `data:image/png;base64,${latestImage.base64Data}`;
            
            // Pass both the image path and the full image data to the callback
            onNewImage(imagePath, latestImage);
          }
        }
      }
      
      // Get latest coordinates
      if (onNewCoordinates) {
        const coordinates = await fetchShooterCoordinates();
        if (coordinates) {
          onNewCoordinates(coordinates);
        }
      }
    } catch (error) {
      console.error('Error in polling:', error);
    }
    
    // Schedule next poll
    setTimeout(poll, pollingInterval);
  };
  
  // Start polling
  poll();
  
  // Return function to stop polling
  return () => {
    isPolling = false;
    // Firebase connections are automatically managed
  };
} 