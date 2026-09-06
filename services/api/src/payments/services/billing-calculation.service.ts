import { Injectable, BadRequestException } from '@nestjs/common';
import { MoneyUtil } from '../utils/money.util';

export interface LineItemInput {
  description: string;
  unitAmountMinor: number;
  quantity: number;
  discountMinor?: number;
  taxMinor?: number;
  membershipPlanId?: string;
  memberMembershipId?: string;
  metadata?: Record<string, any>;
}

export interface CalculatedLineItem extends LineItemInput {
  subtotalMinor: number;
  totalMinor: number;
}

export interface CalculationResult {
  lineItems: CalculatedLineItem[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  feeMinor: number;
  totalMinor: number;
}

@Injectable()
export class BillingCalculationService {
  /**
   * Calculates subtotal, discounts, taxes, fees, and grand total for a set of line items.
   * All numbers are strictly in minor units (integers).
   */
  calculateInvoice(
    items: LineItemInput[],
    invoiceDiscountMinor: number = 0,
    feeMinor: number = 0,
    taxRatePercentage: number = 0
  ): CalculationResult {
    if (!items || items.length === 0) {
      throw new BadRequestException('At least one line item is required for invoice calculation');
    }

    let itemsSubtotal = 0;
    let itemsDiscount = 0;
    let itemsTax = 0;

    const calculatedLineItems: CalculatedLineItem[] = items.map((item) => {
      if (item.unitAmountMinor < 0) {
        throw new BadRequestException('Unit amount cannot be negative');
      }
      if (item.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than zero');
      }

      const lineSubtotal = MoneyUtil.multiply(item.unitAmountMinor, item.quantity);
      const lineDiscount = Math.min(item.discountMinor || 0, lineSubtotal);
      
      // Calculate line tax if not provided explicitly and taxRatePercentage is given
      let lineTax = item.taxMinor || 0;
      if (!item.taxMinor && taxRatePercentage > 0) {
        const taxableAmount = lineSubtotal - lineDiscount;
        lineTax = MoneyUtil.percentage(taxableAmount, taxRatePercentage);
      }

      const lineTotal = lineSubtotal - lineDiscount + lineTax;

      itemsSubtotal += lineSubtotal;
      itemsDiscount += lineDiscount;
      itemsTax += lineTax;

      return {
        ...item,
        unitAmountMinor: Math.round(item.unitAmountMinor),
        quantity: Math.round(item.quantity),
        discountMinor: lineDiscount,
        taxMinor: lineTax,
        subtotalMinor: lineSubtotal,
        totalMinor: lineTotal,
      };
    });

    const totalDiscount = MoneyUtil.add(itemsDiscount, invoiceDiscountMinor);
    const totalTax = itemsTax;
    const totalFee = Math.max(0, Math.round(feeMinor));
    const finalTotal = Math.max(0, itemsSubtotal - totalDiscount + totalTax + totalFee);

    return {
      lineItems: calculatedLineItems,
      subtotalMinor: itemsSubtotal,
      discountMinor: totalDiscount,
      taxMinor: totalTax,
      feeMinor: totalFee,
      totalMinor: finalTotal,
    };
  }
}
