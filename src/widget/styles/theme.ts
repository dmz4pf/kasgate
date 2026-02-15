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
  // Luxe navy neutrals (matches dashboard @theme)
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#1e2536',
    800: '#1a1f2e',
    900: '#0f1419',
  },
  // Semantic
  success: '#22c55e',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  // Accent
  purple: '#a78bfa',
  gold: '#fbbf24',
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

    --kg-text: ${isDark ? COLORS.gray[50] : COLORS.gray[900]};
    --kg-text-secondary: ${isDark ? COLORS.gray[400] : COLORS.gray[500]};
    --kg-text-muted: ${isDark ? COLORS.gray[600] : COLORS.gray[400]};

    --kg-border: ${isDark ? '#253245' : COLORS.gray[200]};
    --kg-border-focus: ${isDark ? '#334766' : COLORS.primary[500]};

    --kg-success: ${COLORS.success};
    --kg-warning: ${COLORS.warning};
    --kg-error: ${COLORS.error};
    --kg-info: ${COLORS.info};

    --kg-purple: ${COLORS.purple};
    --kg-gold: ${COLORS.gold};
    --kg-glass: ${isDark ? 'rgba(15, 20, 25, 0.7)' : 'rgba(255, 255, 255, 0.85)'};
    --kg-glass-border: ${isDark ? 'rgba(37, 50, 69, 0.8)' : 'rgba(0, 0, 0, 0.08)'};

    --kg-shadow: ${isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};

    --kg-font-family: ${TYPOGRAPHY.fontFamily};
    --kg-font-size-xs: ${TYPOGRAPHY.fontSize.xs};
    --kg-font-size-sm: ${TYPOGRAPHY.fontSize.sm};
    --kg-font-size-base: ${TYPOGRAPHY.fontSize.base};
    --kg-font-size-lg: ${TYPOGRAPHY.fontSize.lg};
    --kg-font-size-xl: ${TYPOGRAPHY.fontSize.xl};
    --kg-font-size-xxl: ${TYPOGRAPHY.fontSize.xxl};

    --kg-radius: ${BORDERS.radius.md};
    --kg-radius-lg: ${BORDERS.radius.lg};
    --kg-radius-xl: ${BORDERS.radius.xl};

    --kg-spacing-xs: ${SPACING.xs};
    --kg-spacing-sm: ${SPACING.sm};
    --kg-spacing-md: ${SPACING.md};
    --kg-spacing-lg: ${SPACING.lg};
    --kg-spacing-xl: ${SPACING.xl};
  `;
}
