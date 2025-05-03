/**
 * StudentAlertScreen.tsx
 * Screen for students to view confirmed threat alerts
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { COLORS, FONT, SIZES, SPACING } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StudentTabParamList } from '../../navigation/StudentDashboardNavigator';

type StudentNavigationProp = BottomTabNavigationProp<StudentTabParamList>;

const StudentAlertScreen: React.FC = () => {
  const alert = useAlert();
  const [showEvacModal, setShowEvacModal] = useState(false);
  const navigation = useNavigation<StudentNavigationProp>();

  const handleEvacuationPress = () => {
    setShowEvacModal(true);
  };

  const handleContinue = () => {
    setShowEvacModal(false);
    // Navigate to the Map tab
    navigation.navigate('Map');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Alert Center</Text>
      
      <View style={styles.contentContainer}>
        {alert.threatConfirmed ? (
          <View style={styles.alertContainer}>
            <Text style={styles.alertText}>Threat{'\n'}Detected!</Text>
            
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={70} color={COLORS.error} />
            </View>
            
            {/* Shooter Image */}
            <View style={styles.shooterImageContainer}>
              <Image 
                source={require('../../context/shooter.png')} 
                style={styles.shooterImage} 
                resizeMode="contain"
              />
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
          </View>
        ) : (
          <View style={styles.noAlertContainer}>
            <Text style={styles.noAlertText}>No Threats{'\n'}Detected!</Text>
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
  shooterImageContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  shooterImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  shooterCaption: {
    fontSize: SIZES.sm,
    fontFamily: FONT.family,
    color: COLORS.error,
    textAlign: 'center',
    fontWeight: 'bold',
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
    // Grid pattern background achieved with a semi-transparent overlay color
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
  }
});

export default StudentAlertScreen; 