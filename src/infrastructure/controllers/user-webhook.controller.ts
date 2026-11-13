import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  InternalServerErrorException,
  type RawBodyRequest,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from 'svix';
import { UserLogicI } from '../../business/user.ports';
import { UserExceptionFilter } from './user-exception.filter';

@Controller('api/v1/user/webhook/clerk')
@UseFilters(UserExceptionFilter)
export class UserWebhookClerkController {
  constructor(private readonly userLogic: UserLogicI) {}

  @Post()
  async handleUserClerkWebhook(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody;
    if (!payload)
      throw new BadRequestException('Falta el cuerpo de la petición');

    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim();
    if (!signingSecret)
      throw new InternalServerErrorException('Falta secreto de Clerk');

    const svixId = headers['svix-id'];
    const svixTimestamp = headers['svix-timestamp'];
    const svixSignature = headers['svix-signature'];
    const wh = new Webhook(signingSecret);

    try {
      wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });

      const evt = JSON.parse(payload.toString('utf8'));

      if (evt.type !== 'user.created') {
        return { success: true, ignored: true };
      }

      const data = evt.data;
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address || '';

      if (!email) {
        return { success: true, ignored: true, reason: 'Sin email' };
      }

      const userId = await this.userLogic.createFromInvitation(clerkId, email);

      if (!userId) {
        return {
          success: true,
          ignored: true,
          reason: 'No hay invitación pendiente',
        };
      }

      return { success: true, userId };
    } catch (error) {
      throw error;
    }
  }
}
