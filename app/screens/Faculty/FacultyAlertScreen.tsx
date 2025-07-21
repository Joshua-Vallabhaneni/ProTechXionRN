/**
 * FacultyAlertScreen.tsx
 * Screen for faculty to manage and confirm threat alerts
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Platform } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, SIZES, SPACING, BORDER_RADIUS } from '../../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { FacultyTabParamList } from '../../navigation/FacultyDashboardNavigator';
import * as FileSystem from 'expo-file-system';
import { fetchShooterImage } from '../../utils/dbCommunication';

type FacultyNavigationProp = BottomTabNavigationProp<FacultyTabParamList>;

// Function to check for threat flag file in project root
const checkRootThreatFlag = async () => {
  // Disable this method - we're using the global variable approach instead
  return false;
};

const FacultyAlertScreen: React.FC = () => {
  const alert = useAlert();
  const [showEvacModal, setShowEvacModal] = useState(false);
  const navigation = useNavigation<FacultyNavigationProp>();

  // Disable the file checking effect - we'll rely on AlertContext instead
  // useEffect(() => {
  //   // Only check when no threat is currently detected
  //   if (!alert.threatDetected) {
  //     const timer = setInterval(async () => {
  //       try {
  //         const flagFound = await checkRootThreatFlag();
  //         if (flagFound) {
  //           console.log('FacultyAlertScreen detected threat flag, triggering report...');
  //           alert.setThreatDetected(true);
  //           
  //           // Try to remove the flag file to avoid duplicate triggers
  //           try {
  //             // Clean up via HTTP request in dev mode
  //             fetch('http://localhost:19000/remove-threat-flag', { method: 'GET' })
  //               .catch(e => console.log('Could not remove flag file:', e));
  //           } catch (e) {
  //             console.log('Error cleaning up flag file:', e);
  //           }
  //         }
  //       } catch (error) {
  //         console.log('Error in threat flag check:', error);
  //       }
  //     }, 2000); // Check every 2 seconds
  //     
  //     return () => clearInterval(timer);
  //   }
  // }, [alert.threatDetected]);

  const handleEvacuationPress = () => {
    setShowEvacModal(true);
  };

  const handleContinue = () => {
    setShowEvacModal(false);
    // Navigate to the Map tab
    navigation.navigate('Map');
  };

  // Add this function inside the component
  const simulateReportThreatClick = () => {
    console.log('Simulating Report Threat button click');
    alert.setThreatDetected(true);
  };

  // Add a function to directly expose the click simulation to the global scope
  // so it can be called from outside React in development mode
  React.useEffect(() => {
    if (__DEV__) {
      // @ts-ignore
      if (global) {
        // Register a function that will be called by our script
        // Use a different approach that won't interfere with our flag-based detection
        // @ts-ignore
        global.reportThreatFunction = simulateReportThreatClick;
        console.log('Terminal threat reporting function registered as reportThreatFunction.');
      }
    }
  }, []);

  // Auto-trigger threat detection code - commented out as requested
  /*
  React.useEffect(() => {
    // Only run when there's no threat detected
    if (!alert.threatDetected) {
      console.log('Starting 10-second auto-trigger countdown...');
      
      // Set a timeout to trigger the threat after 5 seconds
      const autoTriggerTimeout = setTimeout(() => {
        console.log('🚨 Auto-triggering threat detection after 10-second delay');
        simulateReportThreatClick();
      }, 100000);
      
      // Clean up the timeout if component unmounts or threat state changes
      return () => {
        clearTimeout(autoTriggerTimeout);
        console.log('Auto-trigger countdown cancelled');
      };
    }
  }, [alert.threatDetected]); // Re-run if threat detection status changes
  */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Faculty Alert Center</Text>
      
      <View style={styles.contentContainer}>
        {alert.threatDetected ? (
          <View style={styles.alertContainer}>
            {!alert.threatConfirmed ? (
              // Show potential threat and confirm/deny options
              <>
                <Text style={styles.alertText}>Potential Threat Detected!</Text>
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.confirmButton]} 
                    onPress={alert.confirmThreat}
                  >
                    <Text style={styles.buttonText}>Confirm</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.denyButton]} 
                    onPress={alert.denyThreat}
                  >
                    <Text style={styles.buttonText}>Deny</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Shooter Image */}
                <View style={styles.shooterImageContainer}>
                  <Image 
                    source={alert.shooterImage ? { uri: alert.shooterImage } : require('../../context/shooter.png')} 
                    style={styles.shooterImage} 
                    resizeMode="contain"
                  />
                </View>
              </>
            ) : (
              // Show confirmed threat with warning icon
              <>
                <Text style={styles.threatDetectedText}>Threat{'\n'}Detected!</Text>
                
                <View style={styles.warningIconContainer}>
                  <Ionicons name="warning" size={70} color={COLORS.error} />
                </View>
                
                <TouchableOpacity 
                  style={styles.evacuationButton}
                  onPress={handleEvacuationPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.evacuationButtonText}>
                    Follow the Evacuation Protocol
                  </Text>
                  <Ionicons name="arrow-forward-circle" size={24} color={COLORS.white} style={styles.buttonIcon} />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.noAlertContainer}>
            <Text style={styles.noAlertText}>No Threats{'\n'}Detected!</Text>
            
            <TouchableOpacity 
              style={styles.reportButton} 
              onPress={() => alert.setThreatDetected(true)}
              testID="reportThreatButton" // Add testID for easier programmatic access
            >
              <Ionicons name="alert" size={32} color={COLORS.white} />
            </TouchableOpacity>
            
            <Text style={styles.reportButtonLabel}>Report Threat</Text>
          </View>
        )}
      </View>

      {/* Evacuation Protocol Modal */}
      <Modal
        visible={showEvacModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEvacModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Threat Detected!</Text>
            <Text style={styles.modalText}>
              A potential threat has been detected around you. Please follow the evacuation procedures
            </Text>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: SIZES.xl,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  alertContainer: {
    width: '80%',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  alertText: {
    fontSize: SIZES.lg,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  threatDetectedText: {
    fontSize: SIZES.xxl,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  warningIconContainer: {
    marginVertical: SPACING.lg,
  },
  evacuationButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    width: '100%',
  },
  evacuationButtonText: {
    fontSize: SIZES.md,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  buttonIcon: {
    marginLeft: SPACING.sm,
  },
  instructionText: {
    fontSize: SIZES.md,
    fontFamily: FONT.family,
    color: COLORS.black,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.md,
  },
  actionButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#27ae60', // Green
  },
  denyButton: {
    backgroundColor: COLORS.error, // Red
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    fontSize: SIZES.md,
  },
  noAlertContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAlertText: {
    fontSize: SIZES.xxl,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: SIZES.xxl * 1.5,
    marginBottom: SPACING.xl * 2,
  },
  reportButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reportButtonLabel: {
    fontSize: SIZES.md,
    fontFamily: FONT.family,
    color: COLORS.black,
  },
  reportButtonText: {
    fontSize: SIZES.lg,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  reportHelpText: {
    marginTop: 10,
    fontSize: SIZES.md,
    color: COLORS.black,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    borderRadius: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: '#FFE6E6',
  },
  modalTitle: {
    fontSize: SIZES.xl,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalText: {
    fontSize: SIZES.md,
    fontFamily: FONT.family,
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  continueButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  continueButtonText: {
    fontSize: SIZES.md,
    fontFamily: FONT.family,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  shooterImageContainer: {
    width: '100%',
    marginTop: SPACING.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: SPACING.md,
  },
  shooterImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  shooterCaption: {
    fontSize: SIZES.sm,
    fontFamily: FONT.family,
    color: COLORS.error,
    textAlign: 'center',
    fontWeight: 'bold',
  }
});

export default FacultyAlertScreen; 