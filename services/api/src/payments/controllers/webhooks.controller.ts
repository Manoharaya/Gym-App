import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentWebhookService } from '../services/payment-webhook.service';
import { Request } from 'express';

@ApiTags('Payment Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookService: PaymentWebhookService) {}

  @Public()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public gateway webhook handler with signature verification' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, any>,
    @Req() req: Request
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    return this.webhookService.handleWebhook(provider, headers, rawBody);
  }
}
