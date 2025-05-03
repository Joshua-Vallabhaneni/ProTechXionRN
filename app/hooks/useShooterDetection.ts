import { useState, useEffect, useCallback } from 'react';
import { 
  fetchShooterImage, 
  updateVerificationStatus,
  fetchShooterCoordinates,
  startPolling,
  ShooterCoordinates
} from '../utils/dbCommunication';

interface UseShooterDetectionProps {
  pollingInterval?: number;
  onImageReceived?: (imagePath: string) => void;
  onCoordinatesReceived?: (coordinates: ShooterCoordinates) => void;
}

export function useShooterDetection({
  pollingInterval = 1000,
  onImageReceived,
  onCoordinatesReceived
}: UseShooterDetectionProps = {}) {
  const [shooterImage, setShooterImage] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<ShooterCoordinates | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  
  // Fetch the initial image
  const loadInitialImage = useCallback(async () => {
    const imagePath = await fetchShooterImage();
    if (imagePath) {
      setShooterImage(imagePath);
      if (onImageReceived) {
        onImageReceived(imagePath);
      }
    }
  }, [onImageReceived]);
  
  // Fetch the initial coordinates
  const loadInitialCoordinates = useCallback(async () => {
    const coords = await fetchShooterCoordinates();
    if (coords) {
      setCoordinates(coords);
      if (onCoordinatesReceived) {
        onCoordinatesReceived(coords);
      }
    }
  }, [onCoordinatesReceived]);
  
  // Handle image updates
  const handleImageUpdate = useCallback((imagePath: string) => {
    setShooterImage(imagePath);
    if (onImageReceived) {
      onImageReceived(imagePath);
    }
  }, [onImageReceived]);
  
  // Handle coordinates updates
  const handleCoordinatesUpdate = useCallback((coords: ShooterCoordinates) => {
    setCoordinates(coords);
    if (onCoordinatesReceived) {
      onCoordinatesReceived(coords);
    }
  }, [onCoordinatesReceived]);
  
  // Start/stop polling
  useEffect(() => {
    // Load initial data
    loadInitialImage();
    loadInitialCoordinates();
    
    // Start polling for updates
    const stopPolling = startPolling(
      handleImageUpdate,
      handleCoordinatesUpdate,
      pollingInterval
    );
    
    setIsPolling(true);
    
    // Clean up when unmounting
    return () => {
      stopPolling();
      setIsPolling(false);
    };
  }, [
    pollingInterval, 
    handleImageUpdate, 
    handleCoordinatesUpdate, 
    loadInitialImage, 
    loadInitialCoordinates
  ]);
  
  // Function to verify the shooter detection
  const verifyShooterDetection = useCallback(async (verified: boolean) => {
    try {
      await updateVerificationStatus(verified);
      setIsVerified(verified);
    } catch (error) {
      console.error('Error verifying shooter detection:', error);
    }
  }, []);
  
  return {
    shooterImage,
    coordinates,
    isVerified,
    isPolling,
    verifyShooterDetection
  };
} 