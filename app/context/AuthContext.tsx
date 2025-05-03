import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserRole from '../models/UserRole';
import { ANDROID_CLIENT_ID, IOS_CLIENT_ID, EXPO_CLIENT_ID, WEB_CLIENT_ID } from '../config/env';

// Auth state interface
interface AuthState {
  userInfo: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
}

// Auth context interface
interface AuthContextType extends AuthState {
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (role: UserRole) => void;
}

// Creating the context with default values
const AuthContext = createContext<AuthContextType>({
  userInfo: null,
  isLoading: false,
  isAuthenticated: false,
  userRole: null,
  signIn: async () => {},
  signOut: async () => {},
  setUserRole: () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    userInfo: null,
    isLoading: false,
    isAuthenticated: false,
    userRole: null,
  });

  // Check for stored user on mount
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        // Clear stored credentials on app start
        await AsyncStorage.removeItem('@user_info');
        await AsyncStorage.removeItem('@user_role');
        
        setState({
          userInfo: null,
          isLoading: false,
          isAuthenticated: false,
          userRole: null,
        });
      } catch (error) {
        console.error('Error clearing stored credentials:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadUserFromStorage();
  }, []);

  // Mock Google Auth Sign In
  const signIn = async (email: string) => {
    try {
      console.log('Starting mock Google sign in for:', email);
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Create mock user info
      const userInfo = {
        email,
        id: `mock-user-${Date.now()}`,
        name: email.split('@')[0],
        picture: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(email.split('@')[0]),
      };
      
      // Save user info to storage
      await AsyncStorage.setItem('@user_info', JSON.stringify(userInfo));
      
      setState({
        userInfo,
        isLoading: false,
        isAuthenticated: true,
        userRole: state.userRole,
      });
      
      console.log('Mock authentication successful for:', email);
    } catch (error) {
      console.error('Error in mock sign in:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await AsyncStorage.removeItem('@user_info');
      await AsyncStorage.removeItem('@user_role');
      
      setState({
        userInfo: null,
        isLoading: false,
        isAuthenticated: false,
        userRole: null,
      });
      
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Set user role function
  const setUserRole = async (role: UserRole) => {
    try {
      await AsyncStorage.setItem('@user_role', JSON.stringify(role));
      setState(prev => ({ ...prev, userRole: role }));
    } catch (error) {
      console.error('Error setting user role:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        setUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 