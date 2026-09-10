/**
 * FitCore — Day 42: Payment Failure Classifier
 *
 * Normalizes raw provider error codes into canonical failure categories
 * and determines whether an attempt is retryable.
 */

import { Injectable } from '@nestjs/common';
import { PaymentFailureCategory } from '@fitcore/types';

export interface ClassifiedFailure {
  category: PaymentFailureCategory;
  isRetryable: boolean;
  userFriendlyReason: string;
}

@Injectable()
export class FailureClassifierService {
  /**
   * Classifies a provider failure code and message.
   */
  classify(failureCode?: string | null, failureMessage?: string | null): ClassifiedFailure {
    const code = (failureCode || '').toLowerCase();
    const msg = (failureMessage || '').toLowerCase();

    // 1. Insufficient Funds (Retryable)
    if (
      code.includes('insufficient_funds') ||
      msg.includes('insufficient funds') ||
      code === 'balance_insufficient' ||
      code === 'not_enough_balance'
    ) {
      return {
        category: 'INSUFFICIENT_FUNDS',
        isRetryable: true,
        userFriendlyReason: 'Insufficient funds in the payment account.',
      };
    }

    // 2. Authentication Required (Non-retryable without customer action)
    if (
      code.includes('authentication_required') ||
      code.includes('requires_action') ||
      code.includes('3d_secure') ||
      msg.includes('authentication required') ||
      msg.includes('sca')
    ) {
      return {
        category: 'AUTHENTICATION_REQUIRED',
        isRetryable: false,
        userFriendlyReason: 'Cardholder authentication or verification is required.',
      };
    }

    // 3. Expired Payment Method (Non-retryable)
    if (
      code.includes('expired_card') ||
      code.includes('card_expired') ||
      msg.includes('expired')
    ) {
      return {
        category: 'EXPIRED_PAYMENT_METHOD',
        isRetryable: false,
        userFriendlyReason: 'The payment card has expired.',
      };
    }

    // 4. Invalid Payment Method (Non-retryable)
    if (
      code.includes('invalid_card') ||
      code.includes('invalid_number') ||
      code.includes('invalid_account') ||
      code.includes('card_not_supported') ||
      msg.includes('invalid')
    ) {
      return {
        category: 'INVALID_PAYMENT_METHOD',
        isRetryable: false,
        userFriendlyReason: 'The payment method information is invalid or unsupported.',
      };
    }

    // 5. Card Declined (Generic - conditionally retryable if not stolen/lost)
    if (code.includes('do_not_honor') || code.includes('card_declined') || code === 'generic_decline') {
      return {
        category: 'CARD_DECLINED',
        isRetryable: true,
        userFriendlyReason: 'Payment card was declined by the issuing bank.',
      };
    }

    // 6. Fraud / Stolen / Lost (Non-retryable)
    if (
      code.includes('fraud') ||
      code.includes('stolen') ||
      code.includes('lost_card') ||
      code.includes('pickup_card')
    ) {
      return {
        category: 'FRAUD_REVIEW',
        isRetryable: false,
        userFriendlyReason: 'Transaction declined due to security or fraud restrictions.',
      };
    }

    // 7. Network / Provider / Timeout (Retryable)
    if (
      code.includes('network') ||
      code.includes('timeout') ||
      code.includes('provider_error') ||
      code.includes('api_error') ||
      msg.includes('timeout') ||
      msg.includes('connection')
    ) {
      return {
        category: 'NETWORK_ERROR',
        isRetryable: true,
        userFriendlyReason: 'Temporary network or provider communication error.',
      };
    }

    // 8. Rate Limited (Retryable)
    if (code.includes('rate_limit') || msg.includes('too many requests')) {
      return {
        category: 'RATE_LIMITED',
        isRetryable: true,
        userFriendlyReason: 'Payment request was rate limited. Retrying shortly.',
      };
    }

    // 9. Customer Action Required
    if (code.includes('customer_action') || msg.includes('action required')) {
      return {
        category: 'CUSTOMER_ACTION_REQUIRED',
        isRetryable: false,
        userFriendlyReason: 'Additional action is required by the cardholder to complete payment.',
      };
    }

    // 10. Default / Unknown
    return {
      category: 'UNKNOWN',
      isRetryable: true, // Default safe retry for unclassified transient errors
      userFriendlyReason: 'An unexpected payment error occurred.',
    };
  }
}
