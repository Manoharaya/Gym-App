/**
 * FitCore Minor Units Money Utility
 *
 * All monetary calculations MUST be performed in integer minor units (e.g. cents)
 * to eliminate IEEE-754 floating-point inaccuracies.
 */

export class MoneyUtil {
  /**
   * Safely adds multiple minor unit values.
   */
  static add(...amounts: number[]): number {
    return amounts.reduce((acc, curr) => acc + Math.round(curr || 0), 0);
  }

  /**
   * Safely subtracts minor unit values: a - b.
   */
  static subtract(a: number, b: number): number {
    return Math.round(a || 0) - Math.round(b || 0);
  }

  /**
   * Multiplies an amount in minor units by a quantity.
   */
  static multiply(unitAmountMinor: number, quantity: number): number {
    return Math.round((unitAmountMinor || 0) * (quantity || 0));
  }

  /**
   * Calculates a percentage of an amount in minor units.
   * e.g. 10% of 10000 cents = 1000 cents.
   */
  static percentage(amountMinor: number, percentage: number): number {
    if (!percentage || percentage <= 0) return 0;
    return Math.round(((amountMinor || 0) * percentage) / 100);
  }

  /**
   * Formats minor units to human-readable string (e.g. 11999 -> "119.99" or "$119.99").
   */
  static format(amountMinor: number, currency: string = 'AUD'): string {
    const major = (amountMinor / 100).toFixed(2);
    try {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amountMinor / 100);
    } catch {
      return `${currency.toUpperCase()} ${major}`;
    }
  }

  /**
   * Converts major unit (e.g. 119.99) to minor unit (11999).
   */
  static toMinor(major: number): number {
    return Math.round(major * 100);
  }

  /**
   * Converts minor unit (11999) to major unit (119.99).
   */
  static toMajor(minor: number): number {
    return minor / 100;
  }
}
