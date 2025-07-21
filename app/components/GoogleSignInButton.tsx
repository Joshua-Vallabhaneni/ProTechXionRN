import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Image } from 'react-native';
import { COLORS, FONT, SPACING, BORDER_RADIUS, SIZES } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

const GoogleSignInButton: React.FC = () => {
  const { signIn, isLoading } = useAuth();

  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={signIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        <View style={styles.buttonContent}>
          <Image 
            source={require('../../assets/google-logo.png')} 
            style={styles.googleIcon}
          />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    marginVertical: SPACING.md,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.black,
    marginLeft: SPACING.md,
  },
  googleIcon: {
    width: 24,
    height: 24,
  }
});

export default GoogleSignInButton; 