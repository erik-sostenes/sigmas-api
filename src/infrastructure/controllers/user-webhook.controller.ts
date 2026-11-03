import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  type RawBodyRequest,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from 'svix';
import { UserLogicI } from '../../business/user.ports';
import { User } from '../../business/user.model';
import { UserExceptionFilter } from './user-exception.filter';

@Controller('api/v1/user/webhook/clerk')
@UseFilters(UserExceptionFilter)
export class UserWebhookClerkController {
  constructor(private readonly userLogic: UserLogicI) {}

  @Post()
  async handleuserClerkWebhook(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      throw new BadRequestException('Falta el cuerpo de la petición');
    }

    const svixId = headers['svix-id'];
    const svixTimestamp = headers['svix-timestamp'];
    const svixSignature = headers['svix-signature'];

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Faltan cabeceras de verificación de Svix');
    }

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET || '');

    try {
      wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });

      const evt = JSON.parse(payload.toString('utf8'));

      if (evt.type === 'user.created') {
        const data = evt.data;
        const email = data.email_addresses?.[0]?.email_address;
        const metadata = data.public_metadata || {};

        if (!email || !metadata.departmentId) {
          throw new BadRequestException(
            'Faltan datos requeridos en el evento de Clerk',
          );
        }

        // TODO: agregar los roles
        const user = new User({
          clerkId: data.id,
          email: email,
          departmentId: Number(metadata.departmentId),
          title: metadata.title || null,
          isActive: true,
        });

        await this.userLogic.create(user);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Firma de webhook inválida');
    }

    return { success: true };
  }
}
