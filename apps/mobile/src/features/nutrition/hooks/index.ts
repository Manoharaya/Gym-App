/**
 * Nutrition & Macros Custom Hooks
 */

import { useNutritionStore } from '../store';

export function useNutrition() {
  const store = useNutritionStore();
  return {
    ...store,
  };
}
