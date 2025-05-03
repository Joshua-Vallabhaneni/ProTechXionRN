/**
 * StudentDashboardNavigator.tsx
 * Tab navigator for student dashboard
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import StudentAlertScreen from '../screens/Student/StudentAlertScreen';
import StudentMapScreen from '../screens/Student/StudentMapScreen';
import { COLORS } from '../theme/theme';

// Define the tabs for student dashboard
export type StudentTabParamList = {
  Alerts: undefined;
  Map: undefined;
};

const Tab = createBottomTabNavigator<StudentTabParamList>();

const StudentDashboardNavigator: React.FC = () => {
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
      <Tab.Screen name="Alerts" component={StudentAlertScreen} />
      <Tab.Screen name="Map" component={StudentMapScreen} />
    </Tab.Navigator>
  );
};

export default StudentDashboardNavigator; 