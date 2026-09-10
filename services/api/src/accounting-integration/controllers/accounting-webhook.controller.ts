/**
 * FitCore — Day 43: Accounting Webhook Intake Controller
 */

import {
  Controller,
  Post,
  Param,
  Headers,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountingWebhookService } from '../webhooks/accounting-webhook.service';
import { AccountingProviderType } from '@fitcore/types';

@Controller('accounting/webhooks')
export class AccountingWebhookController {
  constructor(private readonly webhookService: AccountingWebhookService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-xero-signature') xeroSignature: string,
    @Headers('intuit-signature') intuitSignature: string,
    @Headers() headers: Record<string, any>,
    @Body() payload: any,
    @Req() req: any,
  ) {
    const providerType = provider.toUpperCase() as AccountingProviderType;
    const signature = xeroSignature || intuitSignature || headers['x-signature'] || '';
    const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(payload);

    return this.webhookService.processWebhook(
      providerType,
      rawBody,
      signature,
      headers,
      payload,
    );
  }
}
