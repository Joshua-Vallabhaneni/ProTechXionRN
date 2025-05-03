/**
 * AuthNavigator.tsx
 * Handles navigation between authentication screens
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import GoogleAuthScreen from '../screens/auth/GoogleAuthScreen';
import UserRole from '../models/UserRole';
import { useAuth } from '../context/AuthContext';

// Define navigation param types for auth stack
export type AuthStackParamList = {
  Welcome: undefined;
  RoleSelection: { 
    flow: 'login' | 'register' 
  };
  Login: { 
    role: UserRole 
  };
  Register: { 
    role: UserRole 
  };
  GoogleAuth: {
    email: string;
    role: UserRole;
    isRegistering: boolean;
  };
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const { setUserRole } = useAuth();
  
  const handleAuthenticate = (role: UserRole) => {
    setUserRole(role);
  };

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' }
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Login">
        {props => <LoginScreen {...props} onAuthenticate={handleAuthenticate} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {props => <RegisterScreen {...props} onAuthenticate={handleAuthenticate} />}
      </Stack.Screen>
      <Stack.Screen name="GoogleAuth">
        {props => <GoogleAuthScreen {...props} onAuthenticate={handleAuthenticate} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AuthNavigator; 