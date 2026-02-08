/**
 * Widget Theme - Design tokens and styles
 */

export const COLORS = {
  // Primary - Kaspa teal
  primary: {
    50: '#E6F7F7',
    100: '#B3E8E8',
    200: '#80D9D9',
    300: '#4DC9C9',
    400: '#26BDBD',
    500: '#49EACB', // Main Kaspa color
    600: '#3DD4B7',
    700: '#2EB89E',
    800: '#209C86',
    900: '#14806E',
  },
  // Neutral
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  // Background
  white: '#FFFFFF',
  black: '#000000',
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const TYPOGRAPHY = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const BORDERS = {
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

export const ANIMATION = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

/**
 * Generate CSS custom properties
 */
export function getCSSVariables(theme: 'light' | 'dark'): string {
  const isDark = theme === 'dark';

  return `
    --kg-primary: ${COLORS.primary[500]};
    --kg-primary-hover: ${COLORS.primary[600]};
    --kg-primary-light: ${COLORS.primary[100]};

    --kg-bg: ${isDark ? COLORS.gray[900] : COLORS.white};
    --kg-bg-secondary: ${isDark ? COLORS.gray[800] : COLORS.gray[50]};
    --kg-bg-tertiary: ${isDark ? COLORS.gray[700] : COLORS.gray[100]};

    --kg-text: ${isDark ? COLORS.gray[100] : COLORS.gray[900]};
    --kg-text-secondary: ${isDark ? COLORS.gray[400] : COLORS.gray[500]};
    --kg-text-muted: ${isDark ? COLORS.gray[500] : COLORS.gray[400]};

    --kg-border: ${isDark ? COLORS.gray[700] : COLORS.gray[200]};
    --kg-border-focus: ${COLORS.primary[500]};

    --kg-success: ${COLORS.success};
    --kg-warning: ${COLORS.warning};
    --kg-error: ${COLORS.error};
    --kg-info: ${COLORS.info};

    --kg-shadow: ${isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};

    --kg-font-family: ${TYPOGRAPHY.fontFamily};
    --kg-font-size-sm: ${TYPOGRAPHY.fontSize.sm};
    --kg-font-size-base: ${TYPOGRAPHY.fontSize.base};
    --kg-font-size-lg: ${TYPOGRAPHY.fontSize.lg};
    --kg-font-size-xl: ${TYPOGRAPHY.fontSize.xl};
    --kg-font-size-xxl: ${TYPOGRAPHY.fontSize.xxl};

    --kg-radius: ${BORDERS.radius.md};
    --kg-radius-lg: ${BORDERS.radius.lg};

    --kg-spacing-xs: ${SPACING.xs};
    --kg-spacing-sm: ${SPACING.sm};
    --kg-spacing-md: ${SPACING.md};
    --kg-spacing-lg: ${SPACING.lg};
    --kg-spacing-xl: ${SPACING.xl};
  `;
}
