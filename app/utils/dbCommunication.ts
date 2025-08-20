import * as FileSystem from 'expo-file-system';
import { decode as base64Decode, encode as base64Encode } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Firebase functions
import firebaseConfig, { COLLECTIONS, getLatestDocument, addDocument } from '../config/firebaseConfig';
import { getDatabase, ref, get } from 'firebase/database';

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

interface BatchCoordinateDocument {
  id?: string;
  timestamp?: number;
  [shooterId: string]: any; // Flexible to handle any shooter data structure
}

interface ParsedCoordinate {
  shooterId: string;
  x: number;
  y: number;
  timestamp: number;
  camera_id: number;
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
  onNewCoordinates?: (coordinates: {x: number, y: number, timestamp: number} | null) => void,
  onLastDetectedLocations?: (locations: Array<{x: number, y: number, timestamp: number}>) => void,
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
        } else {
          // Database is empty - notify to clear coordinates
          onNewCoordinates(null as any);
        }
      }
      
      // NEW: Check for last detected locations
      if (onLastDetectedLocations) {
        const locations = await fetchLastDetectedLocations();
        if (locations && locations.length > 0) {
          onLastDetectedLocations(locations);
        } else {
          // Database is empty - notify to clear last detected locations
          onLastDetectedLocations([]);
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

/**
 * Fetch all last detected locations (now using lost shooter coordinates)
 * @returns Promise with array of last detected locations
 */
export async function fetchLastDetectedLocations(): Promise<Array<{x: number, y: number, timestamp: number}> | null> {
  try {
    // Use lost shooter coordinates as the source for last detected locations
    const lostShooters = await fetchLostShooterCoordinates();
    
    // Convert to the expected format
    const locations = lostShooters.map(shooter => ({
      x: shooter.x,
      y: shooter.y, 
      timestamp: shooter.timestamp
    }));
    
    console.log(`Fetched ${locations.length} last detected locations from lost shooters:`, locations.map(l => `(${l.x}, ${l.y}) at ${new Date(l.timestamp).toLocaleTimeString()}`));
    
    return locations;
  } catch (error) {
    console.error('Error fetching last detected locations:', error);
    return null;
  }
}

/**
 * Parse batch coordinate format from backend into individual coordinates
 * @param batchData - The batch document from Firebase  
 * @returns Array of individual coordinates
 */
export function parseBatchCoordinates(batchData: any): ParsedCoordinate[] {
  const coordinates: ParsedCoordinate[] = [];
  
  // Debug: Log the raw data structure
  console.log('parseBatchCoordinates: Raw data:', JSON.stringify(batchData, null, 2));
  
  if (!batchData || typeof batchData !== 'object') {
    console.log('parseBatchCoordinates: Invalid batchData');
    return coordinates;
  }
  
  const { timestamp } = batchData;
  
  // Iterate through all properties except timestamp and id
  for (const [key, value] of Object.entries(batchData)) {
    if (key === 'timestamp' || key === 'id') continue;
    
    // Each key should be a shooter ID, value should be shooter data
    if (typeof value === 'object' && value !== null) {
      const shooterData = value as any;
      console.log(`Processing shooter ${key}:`, shooterData);
      
      if (shooterData.coordinate_history && Array.isArray(shooterData.coordinate_history)) {
        // Get most recent coordinate from history array
        const history = shooterData.coordinate_history;
        if (history.length > 0) {
          const [real_x, real_y, cam_id] = history[history.length - 1];
          console.log(`Shooter ${key} most recent coord:`, real_x, real_y, cam_id);
          
          coordinates.push({
            shooterId: key,
            x: real_x,
            y: real_y,
            timestamp: timestamp || Date.now(),
            camera_id: cam_id || shooterData.camera_id || 0
          });
        }
      }
    }
  }
  
  console.log('parseBatchCoordinates: Extracted coordinates:', coordinates);
  return coordinates;
}

/**
 * Fetch and parse current shooter coordinates
 * @returns Promise with array of current shooter coordinates
 */
export async function fetchCurrentShooterCoordinates(): Promise<ParsedCoordinate[]> {
  try {
    const latestDoc = await getLatestDocument(COLLECTIONS.SHOOTER_COORDINATES) as BatchCoordinateDocument | null;
    if (!latestDoc) return [];
    
    return parseBatchCoordinates(latestDoc);
  } catch (error) {
    console.error('Error fetching current shooter coordinates:', error);
    return [];
  }
}

/**
 * Fetch and parse lost shooter coordinates  
 * @returns Promise with array of lost shooter coordinates
 */
export async function fetchLostShooterCoordinates(): Promise<ParsedCoordinate[]> {
  try {
    const latestDoc = await getLatestDocument(COLLECTIONS.LOST_SHOOTER_COORDINATES) as BatchCoordinateDocument | null;
    if (!latestDoc) return [];
    
    return parseBatchCoordinates(latestDoc);
  } catch (error) {
    console.error('Error fetching lost shooter coordinates:', error);
    return [];
  }
}

