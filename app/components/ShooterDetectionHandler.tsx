import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button, StyleSheet, Alert } from 'react-native';
import { useShooterDetection } from '../hooks/useShooterDetection';

interface ShooterDetectionHandlerProps {
  onVerification?: (isVerified: boolean) => void;
}

const ShooterDetectionHandler: React.FC<ShooterDetectionHandlerProps> = ({ 
  onVerification 
}) => {
  const { 
    shooterImage, 
    coordinates, 
    isVerified,
    verifyShooterDetection 
  } = useShooterDetection({
    pollingInterval: 1000, // Check for updates every second
    onImageReceived: (imagePath) => {
      console.log('New shooter image received:', imagePath);
      // You could trigger an alert or notification here
    },
    onCoordinatesReceived: (coords) => {
      // Removed console.log to reduce terminal spam
      // The coordinates are already being logged in AlertContext when they change
    }
  });

  // Handle verification
  const handleVerify = (verified: boolean) => {
    verifyShooterDetection(verified);
    
    if (onVerification) {
      onVerification(verified);
    }
    
    Alert.alert(
      'Verification Status',
      `Shooter detection has been ${verified ? 'verified' : 'rejected'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shooter Detection</Text>
      
      {/* Display the shooter image if available */}
      {shooterImage ? (
        <View style={styles.imageContainer}>
          <Text style={styles.subtitle}>Detected Person:</Text>
          <Image 
            source={{ uri: shooterImage }} 
            style={styles.image} 
            resizeMode="contain"
          />
        </View>
      ) : (
        <Text style={styles.noData}>No shooter image available</Text>
      )}
      
      {/* Display the coordinates if available */}
      {coordinates ? (
        <View style={styles.coordinatesContainer}>
          <Text style={styles.subtitle}>Shooter Location:</Text>
          <Text style={styles.coordinates}>X: {coordinates.x.toFixed(2)}</Text>
          <Text style={styles.coordinates}>Y: {coordinates.y.toFixed(2)}</Text>
          <Text style={styles.timestamp}>
            Updated: {new Date(coordinates.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      ) : (
        <Text style={styles.noData}>No coordinates available</Text>
      )}
      
      {/* Verification buttons */}
      <View style={styles.verificationContainer}>
        <Text style={styles.subtitle}>Verify Detection:</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Confirm"
            onPress={() => handleVerify(true)}
            color="#4caf50"
          />
          <View style={styles.buttonSpacer} />
          <Button
            title="Reject"
            onPress={() => handleVerify(false)}
            color="#f44336"
          />
        </View>
      </View>
      
      {/* Display verification status */}
      <Text style={[
        styles.verificationStatus,
        { color: isVerified ? '#4caf50' : '#f44336' }
      ]}>
        Status: {isVerified ? 'Verified' : 'Not Verified'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  imageContainer: {
    marginBottom: 16
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#e0e0e0'
  },
  coordinatesContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e8eaf6',
    borderRadius: 8
  },
  coordinates: {
    fontSize: 16,
    marginBottom: 4
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4
  },
  verificationContainer: {
    marginTop: 16,
    marginBottom: 16
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  buttonSpacer: {
    width: 16
  },
  verificationStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8
  },
  noData: {
    fontSize: 16,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20
  }
});

export default ShooterDetectionHandler; 