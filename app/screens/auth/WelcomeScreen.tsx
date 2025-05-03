/**
 * WelcomeScreen.tsx
 * Initial welcome screen with login and register options
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { COLORS, FONT, SIZES, SPACING, BORDER_RADIUS } from '../../theme/theme';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Stay safe with</Text>
        <Text style={styles.appName}>PROTECHXION</Text>
        
        <Text style={styles.description}>
          Be prepared and protected in case of an emergency. Stay informed, alert, and safe.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={() => navigation.navigate('RoleSelection', { flow: 'login' })}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => navigation.navigate('RoleSelection', { flow: 'register' })}
        >
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
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
  },
  title: {
    fontFamily: FONT.family,
    fontSize: SIZES.xl,
    fontWeight: '400',
    color: COLORS.black,
  },
  appName: {
    fontFamily: FONT.family,
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  description: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.gray,
    marginTop: SPACING.md,
  },
  buttonContainer: {
    marginBottom: SPACING.xl,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  loginButtonText: {
    fontFamily: FONT.family,
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  registerButtonText: {
    fontFamily: FONT.family,
    color: COLORS.black,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
});

export default WelcomeScreen; 