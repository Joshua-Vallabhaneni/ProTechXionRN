/**
 * ThreatDetectedMapView.tsx
 * A version of the EvacuationMapView that supports showing threat detected state
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Get screen dimensions for responsive sizing
const { width, height } = Dimensions.get('window');
const screenHeight = height;

interface Props {
  initialThreatState?: boolean;
}

export const EvacuationMapView: React.FC<Props> = ({ initialThreatState = false }) => {
  const [threatDetected, setThreatDetected] = useState(initialThreatState);
  const [currentFloor, setCurrentFloor] = useState<'first' | 'third'>('first');
  
  // Toggle threat status for demonstration purposes
  const toggleThreatStatus = () => {
    setThreatDetected(!threatDetected);
  };
  
  // For demonstration - this would come from a real-time system
  const shooterPosition = { x: 140, y: 780 };
  
  return (
    <View style={styles.container}>
      {/* Header with title and share button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Evacuation Plan</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>
      
      {/* Live indicator */}
      <View style={styles.liveContainer}>
        <Ionicons name="radio-outline" size={20} color="white" />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      
      {/* Threat status */}
      <View style={styles.threatContainer}>
        <Text style={[
          styles.threatText,
          threatDetected ? styles.threatDetectedText : styles.noThreatText
        ]}>
          {threatDetected ? 'Threat Detected' : 'No Threat Detected'}
        </Text>
        
        {/* Instructions (only shown when threat detected) */}
        {threatDetected && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Follow the evacuation route and wait for instructions.
            </Text>
          </View>
        )}
      </View>
      
      {/* Floor heading */}
      <View style={styles.floorHeadingContainer}>
        <Text style={styles.floorHeading}>
          {currentFloor === 'first' ? 'First Floor' : 'Third Floor'}
        </Text>
        <TouchableOpacity style={styles.fullscreenButton}>
          <Ionicons name="expand-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
      
      {/* Floor plan */}
      <View style={styles.mapContainer}>
        <Image
          source={
            currentFloor === 'first' 
              ? require('../../assets/images/FirstFloor.png')
              : require('../../assets/images/ThirdFloor.png')
          }
          style={styles.floorPlan}
          resizeMode="contain"
        />
        
        {/* Shooter position (only shown when threat detected) */}
        {threatDetected && currentFloor === 'first' && (
          <View
            style={[
              styles.shooterMarker,
              { left: shooterPosition.x, top: shooterPosition.y }
            ]}
          >
            <Text style={styles.shooterText}>!</Text>
          </View>
        )}
        
        {/* Evacuation routes (only shown during threat) */}
        {threatDetected && (
          <View style={styles.routesContainer}>
            {/* This would be actual evacuation routes */}
            {currentFloor === 'first' && (
              <View style={styles.evacuationRoute} />
            )}
          </View>
        )}
      </View>
      
      {/* Floor selector section */}
      <View style={styles.floorSelectorContainer}>
        <Text style={styles.floorHeading}>
          {currentFloor === 'first' ? 'Third Floor' : 'First Floor'}
        </Text>
        <TouchableOpacity 
          style={styles.fullscreenButton}
          onPress={() => setCurrentFloor(currentFloor === 'first' ? 'third' : 'first')}
        >
          <Ionicons name="expand-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
      
      {/* Secondary floor plan (smaller) */}
      <View style={styles.secondaryMapContainer}>
        <Image
          source={
            currentFloor === 'first' 
              ? require('../../assets/images/ThirdFloor.png')
              : require('../../assets/images/FirstFloor.png')
          }
          style={styles.secondaryFloorPlan}
          resizeMode="contain"
        />
      </View>
      
      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavButton}>
          <Ionicons name="warning-outline" size={24} color={threatDetected ? "#e53935" : "black"} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavButton}>
          <Ionicons name="map-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '500',
  },
  shareButton: {
    position: 'absolute',
    right: 16,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#344abd',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  liveText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  threatContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  threatText: {
    fontSize: 24,
    fontWeight: '500',
  },
  noThreatText: {
    color: '#4caf50',
  },
  threatDetectedText: {
    color: '#e53935',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 5,
  },
  instructionsText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
    color: '#e53935',
  },
  cautionText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#e53935',
  },
  floorHeadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    position: 'relative',
  },
  floorHeading: {
    fontSize: 18,
    fontWeight: '500',
  },
  fullscreenButton: {
    position: 'absolute',
    right: 16,
  },
  mapContainer: {
    width: '100%',
    height: screenHeight * 0.28,
    position: 'relative',
    marginBottom: 5,
  },
  floorPlan: {
    width: '100%',
    height: '100%',
  },
  shooterMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e53935',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  shooterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floorSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    position: 'relative',
  },
  secondaryMapContainer: {
    width: '100%',
    height: screenHeight * 0.28,
    position: 'relative',
  },
  secondaryFloorPlan: {
    width: '100%',
    height: '100%',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    marginTop: 'auto',
  },
  bottomNavButton: {
    padding: 8,
  },
  routesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  evacuationRoute: {
    position: 'absolute',
    width: 150,
    height: 4,
    backgroundColor: '#4285F4',
    top: 100,
    left: 100,
    transform: [{ rotate: '45deg' }],
  }
});

export default { EvacuationMapView }; 