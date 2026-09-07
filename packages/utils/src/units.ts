/**
 * Unit conversion and formatting utilities for workouts and physical measurements
 */

export function kgToLb(kg: number): number {
  if (isNaN(kg)) return 0;
  return Math.round(kg * 2.20462262 * 100) / 100;
}

export function lbToKg(lb: number): number {
  if (isNaN(lb)) return 0;
  return Math.round((lb / 2.20462262) * 100) / 100;
}

export function kmToMiles(km: number): number {
  if (isNaN(km)) return 0;
  return Math.round(km * 0.621371192 * 100) / 100;
}

export function milesToKm(miles: number): number {
  if (isNaN(miles)) return 0;
  return Math.round((miles / 0.621371192) * 100) / 100;
}

export function mToFt(m: number): number {
  if (isNaN(m)) return 0;
  return Math.round(m * 3.2808399 * 100) / 100;
}

export function ftToM(ft: number): number {
  if (isNaN(ft)) return 0;
  return Math.round((ft / 3.2808399) * 100) / 100;
}

export function formatWeight(val?: number | null, unit: 'KG' | 'LB' = 'KG'): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return `${val} ${unit}`;
}

export function formatDistance(val?: number | null, unit: 'KM' | 'MI' | 'M' | 'FT' = 'KM'): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return `${val} ${unit}`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '-';
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  if (mins === 0) return `${remSecs}s`;
  if (remSecs === 0) return `${mins}m`;
  return `${mins}m ${remSecs}s`;
}

export function mlToOz(ml: number): number {
  if (isNaN(ml)) return 0;
  return Math.round((ml / 29.5735) * 10) / 10;
}

export function ozToMl(oz: number): number {
  if (isNaN(oz)) return 0;
  return Math.round(oz * 29.5735);
}

export function mlToLitres(ml: number): number {
  if (isNaN(ml)) return 0;
  return Math.round((ml / 1000) * 100) / 100;
}

export function litresToMl(l: number): number {
  if (isNaN(l)) return 0;
  return Math.round(l * 1000);
}

export function formatLiquidVolume(ml?: number | null, unit: 'ML' | 'L' | 'OZ' = 'ML'): string {
  if (ml === null || ml === undefined || isNaN(ml)) return '-';
  if (unit === 'L') {
    return `${mlToLitres(ml)} L`;
  }
  if (unit === 'OZ') {
    return `${mlToOz(ml)} fl oz`;
  }
  return `${ml} ml`;
}

