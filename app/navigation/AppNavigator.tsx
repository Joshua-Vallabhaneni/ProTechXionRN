/**
 * AppNavigator.tsx
 * Main navigation component that handles app-wide navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import FacultyDashboardNavigator from './FacultyDashboardNavigator';
import StudentDashboardNavigator from './StudentDashboardNavigator';
import AuthNavigator from './AuthNavigator';
import ThreatAlertScreen from '../screens/alerts/ThreatAlertScreen';
import UserRole from '../models/UserRole';
import { Button, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/theme';

// Define our navigation param types
export type RootStackParamList = {
  Auth: undefined;
  FacultyDashboard: undefined;
  StudentDashboard: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, userRole, isLoading, signOut } = useAuth();
  
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // If not authenticated, show auth flow
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : userRole === UserRole.Faculty ? (
          // Faculty dashboard
          <Stack.Screen 
            name="FacultyDashboard" 
            options={({ navigation }) => ({
              headerShown: true,
              headerTitle: 'ProTechXion Faculty',
              headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Settings')}
                    style={{ marginRight: 15 }}
                  >
                    <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Button 
                    onPress={signOut} 
                    title="Log Out" 
                  />
                </View>
              )
            })}
          >
            {props => <FacultyDashboardNavigator {...props} />}
          </Stack.Screen>
        ) : (
          // Student dashboard
          <Stack.Screen 
            name="StudentDashboard" 
            options={({ navigation }) => ({
              headerShown: true,
              headerTitle: 'ProTechXion Student',
              headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Settings')}
                    style={{ marginRight: 15 }}
                  >
                    <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Button 
                    onPress={signOut} 
                    title="Log Out" 
                  />
                </View>
              )
            })}
          >
            {props => <StudentDashboardNavigator {...props} />}
          </Stack.Screen>
        )}
        <Stack.Screen 
          name="Settings" 
          component={ThreatAlertScreen}
          options={{ 
            headerShown: true,
            headerTitle: 'Emergency Settings'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 