/**
 * GoogleAuthButton.tsx
 * A styled button that resembles the Google sign-in button
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image, View } from 'react-native';
import { COLORS, FONT, SIZES, SPACING, BORDER_RADIUS } from '../theme/theme';

interface GoogleAuthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  text?: string;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onPress,
  disabled = false,
  text = 'Sign in with Google'
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.content}>
        <Image
          source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.text}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: SPACING.md,
  },
  text: {
    fontFamily: FONT.family,
    fontSize: SIZES.md,
    color: COLORS.black,
    fontWeight: '500',
  },
});

export default GoogleAuthButton; 