import { Platform } from 'react-native';

export const THEME = {
  colors: {
    background: '#FDFBF7', // Off-white soft background
    primary: '#102C26',    // Deep Forest
    accent: '#F7E7CE',     // Champagne
    text: '#1C1C1C',
    textMuted: '#666666',
    border: '#EBEBEB',
    error: '#D32F2F',
    success: '#388E3C',
    warning: '#F57C00',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 16,
    lg: 24,
    full: 9999,
  },
  shadows: {
    soft: Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(16, 44, 38, 0.08)',
      } as any,
      default: {
        shadowColor: '#102C26',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }
    }),
    medium: Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(16, 44, 38, 0.12)',
      } as any,
      default: {
        shadowColor: '#102C26',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
      }
    })
  }
};
