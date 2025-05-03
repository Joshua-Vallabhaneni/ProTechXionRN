/**
 * RegisterScreen.tsx
 * Screen for user registration
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import UserRole from '../../models/UserRole';
import { COLORS, FONT, SIZES, SPACING, BORDER_RADIUS } from '../../theme/theme';
import { checkEmailExists, saveEmail } from '../../utils/csvStorage';
import GoogleAuthButton from '../../components/GoogleAuthButton';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterScreenRouteProp = RouteProp<AuthStackParamList, 'Register'>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
  route: RegisterScreenRouteProp;
  onAuthenticate?: (role: UserRole) => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route, onAuthenticate }) => {
  const { role } = route.params;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthButton, setShowAuthButton] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailCheck = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Check if the email already exists
      const exists = await checkEmailExists(email);
      
      if (exists) {
        Alert.alert('Email Already Registered', 'This email is already registered. Would you like to login instead?', [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsLoading(false)
          },
          {
            text: 'Login',
            onPress: () => {
              setIsLoading(false);
              navigation.navigate('Login', { role });
            }
          }
        ]);
        return;
      }
      
      // Save the email to our CSV database
      await saveEmail(email);
      
      // Show Google auth button for the next step
      setEmailChecked(true);
      setShowAuthButton(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error during registration:', error);
      Alert.alert('Error', 'An error occurred during registration. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    navigation.navigate('GoogleAuth', { 
      email, 
      role, 
      isRegistering: true 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Create Account</Text>
        
        <Text style={styles.label}>Work or university email address</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading && !emailChecked}
        />

        {!showAuthButton ? (
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleEmailCheck}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Processing...' : 'Register'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.authButtonContainer}>
            <Text style={styles.authMessage}>Complete registration with:</Text>
            <GoogleAuthButton 
              onPress={handleGoogleAuth} 
              text="Continue with Google"
            />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
          <Text style={styles.loginLink}>Login</Text>
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
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  label: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    marginBottom: SPACING.lg,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONT.family,
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  authButtonContainer: {
    marginTop: SPACING.md,
  },
  authMessage: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.gray,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  footerText: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.gray,
  },
  loginLink: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default RegisterScreen; 