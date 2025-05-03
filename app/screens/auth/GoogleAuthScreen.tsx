/**
 * GoogleAuthScreen.tsx
 * Mock Google authentication screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import UserRole from '../../models/UserRole';
import { COLORS, FONT, SIZES, SPACING } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

type GoogleAuthScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'GoogleAuth'>;
type GoogleAuthScreenRouteProp = RouteProp<AuthStackParamList, 'GoogleAuth'>;

interface GoogleAuthScreenProps {
  navigation: GoogleAuthScreenNavigationProp;
  route: GoogleAuthScreenRouteProp;
  onAuthenticate?: (role: UserRole) => void;
}

const GoogleAuthScreen: React.FC<GoogleAuthScreenProps> = ({ navigation, route, onAuthenticate }) => {
  const { email, role, isRegistering } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const { signIn } = useAuth();

  useEffect(() => {
    // Simulate authentication process
    const authenticateUser = async () => {
      try {
        // Wait a moment to simulate the process
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Use the mock sign in from AuthContext
        await signIn(email);
        
        // Short delay to show success message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
        
        // Simulate successful authentication
        if (onAuthenticate) {
          onAuthenticate(role);
        }
      } catch (error) {
        console.error('Error in GoogleAuthScreen:', error);
        setIsLoading(false);
      }
    };
    
    authenticateUser();
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png' }} 
        style={styles.logo}
        resizeMode="contain"
      />
      
      <Text style={styles.title}>{isLoading ? 'Authenticating...' : 'Authenticated!'}</Text>
      
      <Text style={styles.email}>{email}</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <Text style={styles.successMessage}>
          {isRegistering ? 'Account created successfully!' : 'Login successful!'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: SPACING.xl,
  },
  title: {
    fontFamily: FONT.family,
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  email: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.gray,
    marginBottom: SPACING.xl,
  },
  loader: {
    marginTop: SPACING.xl,
  },
  successMessage: {
    fontFamily: FONT.family,
    fontSize: SIZES.lg,
    color: COLORS.success,
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
});

export default GoogleAuthScreen; 