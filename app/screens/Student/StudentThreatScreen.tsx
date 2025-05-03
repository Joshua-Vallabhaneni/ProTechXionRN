/**
 * StudentThreatScreen.tsx
 * Screen that displays the evacuation map with an active threat
 */

import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import EvacuationMapView from '../../components/EvacuationMapView';

const StudentThreatScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <EvacuationMapView initialThreatState={true} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  }
});

export default StudentThreatScreen; 