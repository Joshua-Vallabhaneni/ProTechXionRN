import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Switch, 
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAlert } from '../../context/AlertContext';
import { COLORS, FONT, SIZES, SPACING, BORDER_RADIUS } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';

// Extended colors
const EXTENDED_COLORS = {
  ...COLORS,
  danger: COLORS.error,
  darkGray: '#555555'
};

type ThreatAlertScreenProps = {
  navigation: StackNavigationProp<any>;
};

const ThreatAlertScreen: React.FC<ThreatAlertScreenProps> = ({ navigation }) => {
  const {
    threatDetected,
    threatConfirmed,
    threatImageURL,
    callbotEnabled,
    textAlertEnabled,
    shooterCoordinates,
    showCoordinates,
    confirmThreat,
    denyThreat,
    setCallbotEnabled,
    setTextAlertEnabled,
    toggleCoordinates
  } = useAlert();

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const handleConfirmThreat = () => {
    // Removed requirement for alert methods to be enabled
    
    Alert.alert(
      "Confirm Emergency",
      "Are you sure you want to confirm this threat? This will trigger emergency alerts.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Confirm Emergency",
          onPress: async () => {
            try {
              setIsProcessing(true);
              setProcessingStatus('Initiating emergency protocols...');
              
              // Small delay to show the initial message
              await new Promise(resolve => setTimeout(resolve, 500));
              
              if (callbotEnabled) {
                setProcessingStatus('Placing emergency call...');
              }
              
              // Trigger the confirm threat action
              await confirmThreat();
              
              if (textAlertEnabled) {
                setProcessingStatus('Sending emergency text message...');
                // Small delay to show this message
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
              setProcessingStatus('Alert successfully activated');
              
              // Keep the processing screen visible a bit longer
              await new Promise(resolve => setTimeout(resolve, 1500));
              
            } catch (error) {
              console.error('Error during emergency action:', error);
              Alert.alert(
                "Error",
                "Failed to complete some emergency actions. Please try again or contact support."
              );
            } finally {
              setIsProcessing(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleDenyThreat = () => {
    denyThreat();
  };

  const renderCoordinatesView = () => {
    if (!showCoordinates || !shooterCoordinates) return null;
    
    return (
      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinatesTitle}>Shooter Location</Text>
        <Text style={styles.coordinatesText}>X: {shooterCoordinates.x}</Text>
        <Text style={styles.coordinatesText}>Y: {shooterCoordinates.y}</Text>
        <Text style={styles.coordinatesTimestamp}>
          Updated: {new Date(shooterCoordinates.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  const renderThreatContent = () => {
    if (isProcessing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{processingStatus}</Text>
        </View>
      );
    }

    if (threatConfirmed) {
      return (
        <View style={styles.confirmedContainer}>
          <Text style={styles.alertTitle}>Emergency Alert Activated</Text>
          <Text style={styles.alertDescription}>
            Emergency services have been notified. Please stay safe and follow safety protocols.
          </Text>
          
          <View style={styles.alertStatusContainer}>
            {callbotEnabled && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Emergency Call:</Text>
                <Text style={styles.statusValue}>Initiated</Text>
              </View>
            )}
            
            {textAlertEnabled && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Emergency Text:</Text>
                <Text style={styles.statusValue}>Sent</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.disableButton}
            onPress={handleDenyThreat}
          >
            <Text style={styles.disableButtonText}>Disable Alert</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (threatDetected) {
      return (
        <View style={styles.threatContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.alertTitle}>Potential Threat Detected</Text>
            <TouchableOpacity 
              style={styles.coordsButton}
              onPress={toggleCoordinates}
            >
              <Ionicons 
                name={showCoordinates ? "location" : "location-outline"} 
                size={24} 
                color={COLORS.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {renderCoordinatesView()}
          
          {threatImageURL ? (
            <View>
              <Text style={styles.debugText}>Image URL: {threatImageURL}</Text>
              <Image 
                source={{ uri: threatImageURL }} 
                style={styles.threatImage}
                resizeMode="cover"
                onError={(error) => console.error('Image loading error:', error.nativeEvent.error)}
                onLoad={() => console.log('Image loaded successfully')}
              />
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
          
          <Text style={styles.alertDescription}>
            Our system has detected a potential security threat. Please confirm or deny this alert.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.denyButton}
              onPress={handleDenyThreat}
            >
              <Text style={styles.denyButtonText}>Deny</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirmThreat}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.configContainer}>
        <Text style={styles.configTitle}>Emergency Alert Settings</Text>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Enable Emergency Calls</Text>
          <Switch
            value={callbotEnabled}
            onValueChange={setCallbotEnabled}
            trackColor={{ false: "#767577", true: COLORS.primary }}
            thumbColor={callbotEnabled ? COLORS.primary : "#f4f3f4"}
          />
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Enable Emergency Texts</Text>
          <Switch
            value={textAlertEnabled}
            onValueChange={setTextAlertEnabled}
            trackColor={{ false: "#767577", true: COLORS.primary }}
            thumbColor={textAlertEnabled ? COLORS.primary : "#f4f3f4"}
          />
        </View>
        
        <Text style={styles.settingHelpText}>
          Enable at least one emergency alert method above. When a threat is confirmed, the system will automatically:
        </Text>
        
        <View style={styles.helpItem}>
          <Text style={styles.helpBullet}>•</Text>
          <Text style={styles.helpText}>Place an emergency call to authorities if calls are enabled</Text>
        </View>
        
        <View style={styles.helpItem}>
          <Text style={styles.helpBullet}>•</Text>
          <Text style={styles.helpText}>Send an emergency text with location details if texts are enabled</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderThreatContent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: SIZES.md,
    color: COLORS.black,
    fontFamily: FONT.family,
    textAlign: 'center',
  },
  threatContainer: {
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  coordsButton: {
    padding: 8,
  },
  coordinatesContainer: {
    backgroundColor: COLORS.lightGray,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  coordinatesTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    color: COLORS.primary,
  },
  coordinatesText: {
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  coordinatesTimestamp: {
    fontSize: SIZES.xs,
    color: EXTENDED_COLORS.darkGray,
    marginTop: 4,
  },
  alertTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  threatImage: {
    width: '100%',
    height: 300,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: SIZES.md,
    color: EXTENDED_COLORS.darkGray,
  },
  alertDescription: {
    fontSize: SIZES.md,
    color: COLORS.black,
    marginBottom: SPACING.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    backgroundColor: EXTENDED_COLORS.danger,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
    marginLeft: SPACING.sm,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  denyButton: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
    marginRight: SPACING.sm,
    alignItems: 'center',
  },
  denyButtonText: {
    color: COLORS.black,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  confirmedContainer: {
    padding: SPACING.lg,
    backgroundColor: '#f8d7da',
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.md,
  },
  alertStatusContainer: {
    marginVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: SIZES.md,
    color: COLORS.black,
  },
  statusValue: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  disableButton: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  disableButtonText: {
    color: EXTENDED_COLORS.danger,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  configContainer: {
    padding: SPACING.lg,
  },
  configTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.lg,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  switchLabel: {
    fontSize: SIZES.md,
    color: COLORS.black,
  },
  settingHelpText: {
    fontSize: SIZES.sm,
    color: EXTENDED_COLORS.darkGray,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  helpItem: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  helpBullet: {
    fontSize: SIZES.md,
    color: EXTENDED_COLORS.darkGray,
    marginRight: SPACING.sm,
  },
  helpText: {
    fontSize: SIZES.sm,
    color: EXTENDED_COLORS.darkGray,
    flex: 1,
  },
  debugText: {
    fontSize: SIZES.xs,
    color: EXTENDED_COLORS.darkGray,
    marginBottom: SPACING.sm,
  },
});

export default ThreatAlertScreen; 