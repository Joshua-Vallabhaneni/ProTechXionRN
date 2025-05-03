/**
 * FacultyMapScreen.tsx
 * Map screen for faculty users
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import EvacuationMapView from '../../components/EvacuationMapView';
import { useAlert } from '../../context/AlertContext';

const FacultyMapScreen: React.FC = () => {
  const alert = useAlert();
  
  // Log the current threat state for debugging
  useEffect(() => {
    console.log('FacultyMapScreen loaded with threat state:', { 
      threatDetected: alert.threatDetected, 
      threatConfirmed: alert.threatConfirmed 
    });
  }, [alert.threatDetected, alert.threatConfirmed]);
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <EvacuationMapView initialThreatState={alert.threatDetected || alert.threatConfirmed} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default FacultyMapScreen; 