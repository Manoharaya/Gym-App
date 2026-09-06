import React, { createContext, useContext } from 'react';
import { themeColors, typography, spacing, radius, shadows, dimensions } from '../theme';

interface ThemeContextValue {
  colors: typeof themeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  dimensions: typeof dimensions;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: themeColors,
  typography,
  spacing,
  radius,
  shadows,
  dimensions,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value: ThemeContextValue = {
    colors: themeColors,
    typography,
    spacing,
    radius,
    shadows,
    dimensions,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
