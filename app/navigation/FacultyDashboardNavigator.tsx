/**
 * FacultyDashboardNavigator.tsx
 * Tab navigator for faculty dashboard
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FacultyAlertScreen from '../screens/Faculty/FacultyAlertScreen';
import FacultyMapScreen from '../screens/Faculty/FacultyMapScreen';
import { COLORS } from '../theme/theme';

// Define the tabs for faculty dashboard
export type FacultyTabParamList = {
  Alerts: undefined;
  Map: undefined;
};

const Tab = createBottomTabNavigator<FacultyTabParamList>();

const FacultyDashboardNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'alert-circle';
          
          if (route.name === 'Alerts') {
            iconName = focused ? 'alert' : 'alert-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {
          fontFamily: 'Poppins',
          fontSize: 12,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Alerts" component={FacultyAlertScreen} />
      <Tab.Screen name="Map" component={FacultyMapScreen} />
    </Tab.Navigator>
  );
};

export default FacultyDashboardNavigator; 