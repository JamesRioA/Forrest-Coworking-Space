import React from 'react';
import { TextInput, TextInputProps, View, Text, StyleSheet } from 'react-native';
import { THEME } from '../utils/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={THEME.colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: '#FFFFFF',
    color: THEME.colors.text,
    fontSize: 16,
  },
  inputError: {
    borderColor: THEME.colors.error,
  },
  errorText: {
    fontSize: 12,
    color: THEME.colors.error,
    marginTop: THEME.spacing.xs,
  },
});
