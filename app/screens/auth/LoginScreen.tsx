/**
 * LoginScreen.tsx
 * Screen for user login
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import UserRole from '../../models/UserRole';
import { COLORS, FONT, SIZES, SPACING, BORDER_RADIUS } from '../../theme/theme';
import { checkEmailExists } from '../../utils/csvStorage';
import GoogleAuthButton from '../../components/GoogleAuthButton';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
  onAuthenticate?: (role: UserRole) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route, onAuthenticate }) => {
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
      // Check if the email exists in our CSV database
      const exists = await checkEmailExists(email);
      
      if (exists) {
        setEmailChecked(true);
        setShowAuthButton(true);
        setIsLoading(false);
      } else {
        Alert.alert('Account Not Found', 'No account found with this email. Would you like to register?', [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsLoading(false)
          },
          {
            text: 'Register',
            onPress: () => {
              setIsLoading(false);
              navigation.navigate('Register', { role });
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert('Error', 'An error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    navigation.navigate('GoogleAuth', { 
      email, 
      role, 
      isRegistering: false 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Login</Text>
        
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
              {isLoading ? 'Checking...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.authButtonContainer}>
            <Text style={styles.authMessage}>Sign in with:</Text>
            <GoogleAuthButton 
              onPress={handleGoogleAuth} 
              text="Sign in with Google"
            />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register', { role })}>
          <Text style={styles.registerLink}>Register</Text>
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
  registerLink: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 