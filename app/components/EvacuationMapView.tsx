/**
 * EvacuationMapView.tsx
 * Interactive evacuation map that shows floor plans and threat locations
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { getLatestDocument, listenForChanges } from '../config/firebaseConfig';
import { useAlert } from '../context/AlertContext';

// Get screen dimensions for responsive sizing
const { width, height } = Dimensions.get('window');
const screenHeight = height;

interface Props {
  initialThreatState?: boolean; // Add prop to initialize threat state
}

interface CoordinateData {
  x: number;
  y: number;
  timestamp?: number;
}

// Define the path coordinates - commented out as requested
// const PATH_POSITIONS = [
//   { x: 151, y: 225 },  // Starting position
//   { x: 151, y: 254 },  // Move down
//   { x: 151, y: 200 },  // Move up
//   { x: 140, y: 203 }   // Move left and slightly down
// ];

const EvacuationMapView: React.FC<Props> = ({ initialThreatState = false }) => {
  const alert = useAlert();
  // Always show threat
  const [currentFloor, setCurrentFloor] = useState<'first' | 'third'>('first');
  const [fullscreenMap, setFullscreenMap] = useState<'first' | 'third' | null>(null);
  
  // Path movement state - commented out as requested
  // const [currentPathIndex, setCurrentPathIndex] = useState(0);
  
  // Keep shooter position state
  const [shooterPosition, setShooterPosition] = useState({ x: 151, y: 225 });
  
  // Camera coordinate system to map coordinate system transformation
  const transformCameraToMapCoordinates = (cameraX: number, cameraY: number): {x: number, y: number} => {
    // Using the newly provided mapping points to create a transformation function
    // Camera coordinates: (0,15) → Map coordinates: (161.33, 416)
    // Camera coordinates: (0,0) → Map coordinates: (156, 266.67)
    // Camera coordinates: (2,-25) → Map coordinates: (110.67, 17)
    
    // Map bounds for clamping (rectangle corners)
    // Top-left: (25.67, 441)
    // Top-right: (330.67, 440.67)
    // Bottom-right: (330.33, 16.33)
    // Bottom-left: (21.33, 16)
    const MIN_X = 21;
    const MAX_X = 331;
    const MIN_Y = 16;
    const MAX_Y = 441;
    
    // Calculate x transformation
    // For x-coordinate, comparing points:
    // Camera X from 0 to 2 maps to map X from 156 to 110.67
    // This suggests a negative correlation for X
    const xScale = -22.67; // (110.67 - 156) / (2 - 0) = -22.67
    const xOffset = 151; // When camera X is 0, map X is 151 (shifted 5 pixels left from original 156)
    
    // Calculate y transformation
    // When camera Y changes from 0 to 15, map Y changes from 266.67 to 416
    // When camera Y changes from 0 to -25, map Y changes from 266.67 to 17
    // Different scale factor for positive vs negative Y values
    let mapY;
    if (cameraY >= 0) {
      // For positive Y values (upper part of the map)
      const yScalePositive = 9.96; // (416 - 266.67) / (15 - 0) = 9.96
      mapY = 266.67 + (cameraY * yScalePositive);
    } else {
      // For negative Y values (lower part of the map)
      const yScaleNegative = 9.99; // (266.67 - 17) / (0 - -25) = 9.99
      mapY = 266.67 + (cameraY * yScaleNegative);
    }
    
    // Calculate map X with the linear transformation
    let mapX = xOffset + (cameraX * xScale);
    
    // Fine-tune adjustment for specific coordinate ranges to avoid walls
    // For camera coordinates around (-2, 10-11) that map to the wall area
    if (cameraX >= -2.5 && cameraX <= -1.5 && cameraY >= 8 && cameraY <= 12) {
      mapX = mapX - 15; // Shift 15 pixels to the left to move into hallway
    }
    
    // Ensure the coordinates are within the bounds of the rectangle
    const boundedX = Math.max(MIN_X, Math.min(mapX, MAX_X));
    const boundedY = Math.max(MIN_Y, Math.min(mapY, MAX_Y));
    
    return { x: boundedX, y: boundedY };
  };
  
  // Animated values for position
  const animatedX = useRef(new Animated.Value(151)).current;
  const animatedY = useRef(new Animated.Value(225)).current;

  // Keep track of the starting position for each drag
  const startPosition = useRef({ x: 0, y: 0 }).current;
  
  // Timer reference
  const movementTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch the latest shooter coordinates from Firebase (regardless of map state)
  useEffect(() => {
    // Fetch the latest coordinates immediately when component mounts
    console.log('Fetching latest shooter coordinates from Firebase...');
    getLatestDocument('ShooterCoordinates')
      .then((data: any) => {
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          const mapPosition = transformCameraToMapCoordinates(data.x, data.y);
          console.log('Latest Firebase coordinates:', data.x, data.y);
          console.log('Transformed to map coordinates:', mapPosition.x, mapPosition.y);
          animatedX.setValue(mapPosition.x);
          animatedY.setValue(mapPosition.y);
          setShooterPosition(mapPosition);
        } else {
          console.log('No valid coordinates found in latest document');
        }
      })
      .catch(error => console.error('Error fetching shooter coordinates:', error));
    
    // Start listening for shooter coordinates from Firebase (always active)
    // Per the memory info, the app uses three main paths:
    // - SHOOTER_IMAGE - Stores shooter images as base64 data
    // - SHOOTER_VERIFICATION - Stores verification status 
    // - SHOOTER_COORDINATES - Stores shooter coordinates (x,y)
    // But rules were set up for:
    // - ShooterCoordinates
    
    // Try both potential path names to ensure we catch the coordinates
    console.log('EvacuationMapView: Setting up Firebase listeners for coordinates');
    
    // Listen on ShooterCoordinates (matches Firebase rules)
    const unsubscribe1 = listenForChanges('ShooterCoordinates', (data: any) => {
      console.log('EvacuationMapView: Received data from ShooterCoordinates:', data);
      
      // Check if data is an array (most likely case based on logs)
      if (Array.isArray(data) && data.length > 0) {
        // Find the most recent coordinate by timestamp
        let mostRecent = data[0];
        data.forEach((item: any) => {
          if (item && item.timestamp && item.timestamp > (mostRecent.timestamp || 0)) {
            mostRecent = item;
          }
        });
        
        if (mostRecent && typeof mostRecent.x === 'number' && typeof mostRecent.y === 'number') {
          // Transform camera coordinates to map coordinates
          const mapPosition = transformCameraToMapCoordinates(mostRecent.x, mostRecent.y);
          console.log('EvacuationMapView: Using most recent coordinates:', mostRecent.x, mostRecent.y);
          console.log('EvacuationMapView: Transformed to map coordinates:', mapPosition.x, mapPosition.y);
          
          // Update the shooter position on the map
          animatedX.setValue(mapPosition.x);
          animatedY.setValue(mapPosition.y);
          setShooterPosition(mapPosition);
          return; // Exit early after processing
        }
      }
      
      // Fallback for single object format
      if (data && typeof data.x === 'number' && typeof data.y === 'number') {
        // Transform camera coordinates to map coordinates
        const mapPosition = transformCameraToMapCoordinates(data.x, data.y);
        console.log('EvacuationMapView: New Firebase coordinates:', data.x, data.y);
        console.log('EvacuationMapView: Transformed to map coordinates:', mapPosition.x, mapPosition.y);
        
        // Update the shooter position on the map
        animatedX.setValue(mapPosition.x);
        animatedY.setValue(mapPosition.y);
        setShooterPosition(mapPosition);
      } else {
        console.log('EvacuationMapView: Invalid data format received from Firebase:', data);
      }
    });
    
    // Also listen on SHOOTER_COORDINATES (all caps, from memory info)
    const unsubscribe2 = listenForChanges('SHOOTER_COORDINATES', (data: any) => {
      console.log('EvacuationMapView: Received data from SHOOTER_COORDINATES:', data);
      
      // Check if data is an array (most likely case based on logs)
      if (Array.isArray(data) && data.length > 0) {
        // Find the most recent coordinate by timestamp
        let mostRecent = data[0];
        data.forEach((item: any) => {
          if (item && item.timestamp && item.timestamp > (mostRecent.timestamp || 0)) {
            mostRecent = item;
          }
        });
        
        if (mostRecent && typeof mostRecent.x === 'number' && typeof mostRecent.y === 'number') {
          // Transform camera coordinates to map coordinates
          const mapPosition = transformCameraToMapCoordinates(mostRecent.x, mostRecent.y);
          console.log('EvacuationMapView: Using most recent coordinates (UPPERCASE):', mostRecent.x, mostRecent.y);
          console.log('EvacuationMapView: Transformed to map coordinates:', mapPosition.x, mapPosition.y);
          
          // Update the shooter position on the map
          animatedX.setValue(mapPosition.x);
          animatedY.setValue(mapPosition.y);
          setShooterPosition(mapPosition);
          return; // Exit early after processing
        }
      }
      
      // Fallback for single object format
      if (data && typeof data.x === 'number' && typeof data.y === 'number') {
        // Transform camera coordinates to map coordinates
        const mapPosition = transformCameraToMapCoordinates(data.x, data.y);
        console.log('EvacuationMapView: New Firebase coordinates (UPPERCASE):', data.x, data.y);
        console.log('EvacuationMapView: Transformed to map coordinates:', mapPosition.x, mapPosition.y);
        
        // Update the shooter position on the map
        animatedX.setValue(mapPosition.x);
        animatedY.setValue(mapPosition.y);
        setShooterPosition(mapPosition);
      } else {
        console.log('EvacuationMapView: Invalid data format received from Firebase (UPPERCASE):', data);
      }
    });
    
    // Clean up listeners when component unmounts
    return () => {
      if (unsubscribe1) unsubscribe1();
      if (unsubscribe2) unsubscribe2();
    };
  }, []); // Empty dependency array means this runs once when component mounts
  
  // Note: 3-second centering functionality removed as requested

  // Function to start the path movement sequence - commented out as requested
  /*
  const startPathMovement = () => {
    // Clear any existing timer
    if (movementTimer.current) {
      clearTimeout(movementTimer.current);
      movementTimer.current = null;
    }
    
    console.log('Starting path movement sequence');
    
    // Reset to first position
    setCurrentPathIndex(0);
    animatedX.setValue(PATH_POSITIONS[0].x);
    animatedY.setValue(PATH_POSITIONS[0].y);
    
    // Schedule the sequence of movements
    moveSequence(0);
  };
  */

  // Placeholder for moveSequence to avoid errors
  const moveSequence = (currentStep: number) => {
    console.log('Movement sequence disabled');
  };

  // Placeholder for performAnimation to avoid errors
  const performAnimation = (targetPosition: any, duration: number, callback: () => void) => {
    console.log('Animation disabled');
    if (callback) callback();
  };

  // Simple pan responder for direct dragging (keep for manual positioning if needed)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Stop the automated movement
        if (movementTimer.current) {
          clearTimeout(movementTimer.current);
          movementTimer.current = null;
        }
        
        // Remember the current position when starting to drag
        startPosition.x = shooterPosition.x;
        startPosition.y = shooterPosition.y;
      },
      onPanResponderMove: (_, gestureState) => {
        // Use the drag distance (dx, dy) from the gesture state
        const newX = startPosition.x + gestureState.dx;
        const newY = startPosition.y + gestureState.dy;
        
        // Update the animated values
        animatedX.setValue(newX);
        animatedY.setValue(newY);
        
        // Update the shooter position state
        setShooterPosition({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        console.log('Drag ended, final position:', shooterPosition);
      },
    })
  ).current;

  // Toggle fullscreen mode for the selected floor
  const toggleFullscreen = (floor: 'first' | 'third') => {
    if (fullscreenMap === floor) {
      setFullscreenMap(null); // Exit fullscreen if already viewing this floor
    } else {
      setFullscreenMap(floor); // Enter fullscreen for the selected floor
    }
  };

  // Effect to monitor animated values and update shooter position
  useEffect(() => {
    const xListener = animatedX.addListener(({value}) => {
      setShooterPosition(prev => ({...prev, x: value}));
    });
    
    const yListener = animatedY.addListener(({value}) => {
      setShooterPosition(prev => ({...prev, y: value}));
    });
    
    return () => {
      animatedX.removeListener(xListener);
      animatedY.removeListener(yListener);
    };
  }, []);

  // Placeholder for resetShooterPosition to avoid errors
  const resetShooterPosition = () => {
    console.log('Reset shooter position disabled');
    if (movementTimer.current) {
      clearTimeout(movementTimer.current);
      movementTimer.current = null;
    }
  };

  // Fullscreen Map Modal
  const renderFullscreenMap = () => {
    if (!fullscreenMap) return null;

    const floorName = fullscreenMap === 'first' ? 'FIRST FLOOR' : 'THIRD FLOOR';
    const mapSource =
      fullscreenMap === 'first'
        ? require('../../assets/images/FirstFloor.png')
        : require('../../assets/images/ThirdFloor.png');

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={!!fullscreenMap}
        onRequestClose={() => setFullscreenMap(null)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          {/* Legend at top */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={styles.dangerDot} />
              <Text style={styles.legendText}>Detected Threat</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={styles.lastSeenDot}>
                <Text style={{color: 'white', fontSize: 8, fontWeight: 'bold'}}>L</Text>
              </View>
              <Text style={styles.legendText}>Last Known Location</Text>
            </View>
            
            {/* Reset position button - commented out as requested */}
            {/* 
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={resetShooterPosition}
            >
              <Ionicons name="refresh" size={22} color="#4285F4" />
              <Text style={styles.resetButtonText}>Reset Position</Text>
            </TouchableOpacity>
            */}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFullscreenMap(null)}
            >
              <MaterialIcons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          {/* Map with vertical label */}
          <View style={styles.fullMapContainer}>
            {/* Map container */}
            <View style={styles.mapWithGridContainer}>
              {/* Touch handler for logging tap positions */}
              <View 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1
                }}
                onTouchStart={(e) => {
                  if (fullscreenMap === 'first') {
                    // Get the touch position relative to the container
                    const { locationX, locationY } = e.nativeEvent;
                    console.log('Tapped position:', locationX, locationY);
                    // No longer moving the marker on tap - it's controlled by Firebase coordinates only
                  }
                }}
              />
              
              {/* Floor plan image */}
              <Image
                source={mapSource}
                style={styles.fullMapImage}
                resizeMode="contain"
              />
            </View>
            
            {/* The shooter marker in a separate container to ensure it's on top */}
            {fullscreenMap === 'first' && (
              <Animated.View 
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: animatedX, 
                  top: animatedY,
                  width: 15,
                  height: 15,
                  borderRadius: 7.5,
                  backgroundColor: '#FF0000',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.8,
                  shadowRadius: 3,
                  elevation: 10,
                  transform: [{ translateX: -7.5 }, { translateY: -7.5 }],
                  zIndex: 9999
                }}
              >
              </Animated.View>
            )}

            {/* Last detected locations (orange dots) in fullscreen */}
            {fullscreenMap === 'first' && alert.lastDetectedLocations.map((location, index) => {
              const mapPosition = transformCameraToMapCoordinates(location.x, location.y);
              return (
                <View
                  key={`fullscreen-last-location-${index}-${location.timestamp}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: mapPosition.x - 8,
                    top: mapPosition.y - 8,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: 'orange',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: 'white',
                    zIndex: 998,
                    elevation: 8,
                  }}
                >
                  <Text style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: 10,
                    textAlign: 'center',
                  }}>L</Text>
                </View>
              );
            })}

            {/* Green vertical floor label */}
            <View style={styles.verticalLabelStrip}>
              <Text style={styles.verticalLabelText}>
                {floorName.split('').join('\n')}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

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
      
      {/* Floor heading - moved to be right above the map */}
      <View style={styles.floorHeadingContainer}>
        <Text style={styles.floorHeading}>
          {currentFloor === 'first' ? 'First Floor' : 'Third Floor'}
        </Text>
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => toggleFullscreen(currentFloor)}
        >
          <View style={styles.expandButtonContainer}>
            <Ionicons name="expand-outline" size={24} color="#4285F4" />
            <Text style={styles.expandButtonText}>Expand</Text>
          </View>
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
        
        {/* Current threat position (red dot) */}
        {alert.shooterCoordinates && (
          <Animated.View
            style={[
              styles.threatDot,
              {
                left: animatedX,
                top: animatedY,
                transform: [
                  { translateX: -15 },
                  { translateY: -15 }
                ]
              }
            ]}
          >
            <Text style={styles.threatText}>!</Text>
          </Animated.View>
        )}
        
        {/* Last detected locations (orange dots) */}
        {alert.lastDetectedLocations.map((location, index) => {
          const mapPosition = transformCameraToMapCoordinates(location.x, location.y);
          return (
            <View
              key={`last-location-${index}-${location.timestamp}`}
              style={[
                styles.lastDetectedMarker,
                {
                  left: mapPosition.x - 8,
                  top: mapPosition.y - 8,
                  position: 'absolute'
                }
              ]}
            >
              <Text style={styles.lastDetectedText}>L</Text>
            </View>
          );
        })}
        
        {/* Debug: Show total count of last detected locations */}
        {alert.lastDetectedLocations.length > 0 && (
          <View style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'orange',
            padding: 5,
            borderRadius: 5,
            zIndex: 1001
          }}>
            <Text style={{color: 'white', fontSize: 12}}>
              Orange dots: {alert.lastDetectedLocations.length}
            </Text>
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
          onPress={() =>
            toggleFullscreen(currentFloor === 'first' ? 'third' : 'first')
          }
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
        {/* Empty bottom nav - removed both buttons */}
      </View>

      {/* Fullscreen map modal */}
      {renderFullscreenMap()}
    </View>
  );
};

const styles = StyleSheet.create({
  /* ---------- MAIN SCREEN ---------- */
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
  floorHeadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,      // nudge it down
    paddingBottom: 0,
    marginBottom: 0,
    position: 'relative',
  },
  floorHeading: {
    fontSize: 18,
    fontWeight: '500',
  },
  fullscreenButton: {
    position: 'absolute',
    right: 10,
  },
  expandButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  expandButtonText: {
    fontSize: 12,
    color: '#4285F4',
    marginLeft: 4,
    fontWeight: '500',
  },
  mapContainer: {
    width: '100%',
    height: screenHeight * 0.28,
    position: 'relative',
    marginTop: 4,      // small gap if you like
    marginBottom: 0,
    overflow: 'hidden',      // keep overflow hidden to prevent any bleed-out
  },
  floorPlan: {
    width: '120%',
    height: '120%',
    alignSelf: 'center',
    transform: [{ scale: 1.2 }],
  },
  shooterMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e53935',
    borderWidth: 2,
    borderColor: 'white',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    zIndex: 1000, // Ensure it's above other elements
    elevation: 10, // For Android
  },
  shooterText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  coordinateContainer: {
    position: 'absolute',
    top: -40,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 5,
    borderRadius: 5,
    width: 120,
    borderWidth: 1,
    borderColor: 'white',
  },
  coordinateText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  floorSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    marginBottom: 0,
    position: 'relative',
  },
  secondaryMapContainer: {
    width: '100%',
    height: screenHeight * 0.28,
    position: 'relative',
    marginTop: 0,
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

  /* ---------- FULLSCREEN MODAL ---------- */
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  youDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'gold',
    marginRight: 5,
  },
  dangerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e53935',
    marginRight: 5,
  },
  lastSeenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'orange',
    marginRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 14,
  },
  closeButton: {
    marginLeft: 'auto',
  },
  fullMapContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mapWithGridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  fullMapImage: {
  /* big enough to fill the white space, but not so huge that
     the blueprint gets clipped on most phones */
  width: '230%',
  height: '220%',

  /* shift the image back toward the centre after enlarging and move it down */
  top: '-43%',
  left: '-65%',

  position: 'absolute',
  transform: [
    { rotate: '90deg' },
    { scale: 1.1 }  /* Added scale transform to increase size while maintaining position */
  ],
},
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  threatDot: {
    width: 30, // More appropriate size
    height: 30, // More appropriate size
    borderRadius: 15, // Half of width/height
    backgroundColor: '#FF0000', // Pure red
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -15 }, { translateY: -15 }], // Adjusted for new size
    zIndex: 9999, // Maximum z-index
    elevation: 20, // Higher elevation for Android
  },
  verticalLabelStrip: {
    width: 50,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalLabelText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#4285F4',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
  },
  resetButtonText: {
    fontSize: 12,
    marginLeft: 5,
    color: '#4285F4',
  },
  buttonText: {
    fontSize: 12,
    marginTop: 4,
    color: '#4285F4',
  },
  youDotStatic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'gold',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    zIndex: 999, // Just below the threat dot
    elevation: 9, // For Android
  },
  debugDotsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9000,
    pointerEvents: 'none',
  },
  debugDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 9000,
  },
  dotText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  lastDetectedMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'orange',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 998,
    elevation: 8,
  },
  lastDetectedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default EvacuationMapView;