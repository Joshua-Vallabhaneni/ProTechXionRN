/**
 * LoginScreen.tsx
 * Login screen where users can select their role
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import UserRole from '../../models/UserRole';

interface LoginScreenProps {
  setUserRole: (role: UserRole) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ setUserRole }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ProTechXion</Text>
      
      <Text style={styles.subtitle}>Select your role:</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.facultyButton]} 
        onPress={() => setUserRole(UserRole.Faculty)}
      >
        <Text style={styles.buttonText}>Faculty</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.studentButton]}
        onPress={() => setUserRole(UserRole.Student)}
      >
        <Text style={styles.buttonText}>Student</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  button: {
    width: '80%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  facultyButton: {
    backgroundColor: '#3498db', // Blue
  },
  studentButton: {
    backgroundColor: '#2ecc71', // Green
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 