/**
 * RoleSelectionScreen.tsx
 * Screen for selecting user role (Student or Faculty)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import UserRole from '../../models/UserRole';
import { COLORS, FONT, SIZES, SPACING, BORDER_RADIUS } from '../../theme/theme';

type RoleSelectionScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'RoleSelection'>;
type RoleSelectionScreenRouteProp = RouteProp<AuthStackParamList, 'RoleSelection'>;

interface RoleSelectionScreenProps {
  navigation: RoleSelectionScreenNavigationProp;
  route: RoleSelectionScreenRouteProp;
}

const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ navigation, route }) => {
  const { flow } = route.params;
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      if (flow === 'login') {
        navigation.navigate('Login', { role: selectedRole });
      } else {
        navigation.navigate('Register', { role: selectedRole });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Please select your role to continue</Text>

        <TouchableOpacity 
          style={[
            styles.roleButton,
            selectedRole === UserRole.Student && styles.selectedRoleButton
          ]}
          onPress={() => setSelectedRole(UserRole.Student)}
        >
          <View style={styles.roleButtonContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>👨‍🎓</Text>
            </View>
            <Text style={styles.roleButtonText}>I am a Student</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.roleButton,
            selectedRole === UserRole.Faculty && styles.selectedRoleButton
          ]}
          onPress={() => setSelectedRole(UserRole.Faculty)}
        >
          <View style={styles.roleButtonContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>👨‍🏫</Text>
            </View>
            <Text style={styles.roleButtonText}>I am a Faculty Member</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[
          styles.continueButton,
          !selectedRole && styles.disabledButton
        ]}
        onPress={handleContinue}
        disabled={!selectedRole}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT.family,
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.black,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  roleButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectedRoleButton: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(31, 65, 187, 0.05)',
  },
  roleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  icon: {
    fontSize: SIZES.xl,
  },
  roleButtonText: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.black,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  continueButtonText: {
    fontFamily: FONT.family,
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default RoleSelectionScreen; 