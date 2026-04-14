import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../utils/theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({ label, variant = 'primary', isLoading, leftIcon, style, onPress, disabled, ...props }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress(e);
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        variant === 'outline' && styles.outline,
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? THEME.colors.background : THEME.colors.primary} />
      ) : (
        <React.Fragment>
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              isPrimary && styles.textPrimary,
              isSecondary && styles.textSecondary,
              variant === 'outline' && styles.textOutline,
            ]}
          >
            {label}
          </Text>
        </React.Fragment>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: THEME.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    width: '100%',
    marginBottom: THEME.spacing.sm,
  },
  iconContainer: {
    marginRight: THEME.spacing.sm,
  },
  primary: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.soft,
  },
  secondary: {
    backgroundColor: THEME.colors.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textPrimary: {
    color: THEME.colors.background,
  },
  textSecondary: {
    color: THEME.colors.primary,
  },
  textOutline: {
    color: THEME.colors.primary,
  },
});
