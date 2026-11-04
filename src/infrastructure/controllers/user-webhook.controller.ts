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
import { User } from '../../business/user.model';
import { InvalidUserAssignmentError } from '../../business/user.errors';
import { UserExceptionFilter } from './user-exception.filter';

interface ClerkEmailAddressPayload {
  id?: string;
  email_address?: string;
}

interface ClerkUserCreatedDataPayload {
  id?: string;
  primary_email_address_id?: string;
  email_addresses?: ClerkEmailAddressPayload[];
  public_metadata?: Record<string, unknown>;
}

interface ClerkWebhookEventPayload {
  type?: string;
  data?: ClerkUserCreatedDataPayload;
}

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

    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim();
    if (!signingSecret) {
      throw new InternalServerErrorException(
        'Falta configurar CLERK_WEBHOOK_SIGNING_SECRET en el servidor',
      );
    }

    const wh = new Webhook(signingSecret);
    let evt: ClerkWebhookEventPayload;

    try {
      wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });

      evt = JSON.parse(payload.toString('utf8')) as ClerkWebhookEventPayload;
    } catch {
      throw new BadRequestException('Firma de webhook inválida');
    }

    if (evt.type !== 'user.created') {
      return { success: true, ignored: true };
    }

    const data = evt.data ?? {};
    const clerkId = typeof data.id === 'string' ? data.id.trim() : '';
    const primaryEmailObj =
      data.email_addresses?.find(
        (item) =>
          data.primary_email_address_id &&
          item.id === data.primary_email_address_id,
      ) ?? data.email_addresses?.[0];
    const email =
      typeof primaryEmailObj?.email_address === 'string'
        ? primaryEmailObj.email_address.trim()
        : '';

    const metadata = data.public_metadata ?? {};
    const departmentId = Number(metadata.departmentId);
    const title =
      typeof metadata.title === 'string' && metadata.title.trim().length > 0
        ? metadata.title.trim()
        : null;

    const roleCodes = this.extractRoleCodes(metadata);
    const activityCodes = this.extractActivityCodes(metadata);

    if (
      !clerkId ||
      !email ||
      !Number.isInteger(departmentId) ||
      departmentId < 1 ||
      roleCodes.length === 0
    ) {
      throw new InvalidUserAssignmentError(
        'Faltan datos requeridos en el evento de Clerk (email, departmentId o roleCodes).',
      );
    }

    const user = new User({
      clerkId,
      email,
      departmentId,
      title,
      isActive: true,
      roleCodes,
      activityCodes,
    });

    await this.userLogic.create(user);

    return { success: true };
  }

  private extractRoleCodes(metadata: Record<string, unknown>): string[] {
    if (Array.isArray(metadata.roleCodes)) {
      if (!metadata.roleCodes.every((item) => typeof item === 'string')) {
        throw new InvalidUserAssignmentError(
          'El campo roleCodes en public_metadata debe contener únicamente cadenas de texto.',
        );
      }
      return metadata.roleCodes as string[];
    }

    if (Array.isArray(metadata.roles)) {
      if (!metadata.roles.every((item) => typeof item === 'string')) {
        throw new InvalidUserAssignmentError(
          'El campo roles en public_metadata debe contener únicamente cadenas de texto.',
        );
      }
      return metadata.roles as string[];
    }

    if (typeof metadata.role === 'string' && metadata.role.trim().length > 0) {
      return [metadata.role.trim().toLowerCase()];
    }

    return [];
  }

  private extractActivityCodes(metadata: Record<string, unknown>): string[] {
    if (
      metadata.activityCodes === undefined ||
      metadata.activityCodes === null
    ) {
      return [];
    }

    if (
      !Array.isArray(metadata.activityCodes) ||
      !metadata.activityCodes.every((item) => typeof item === 'string')
    ) {
      throw new InvalidUserAssignmentError(
        'El campo activityCodes en public_metadata debe ser un arreglo de códigos de actividad.',
      );
    }

    return metadata.activityCodes as string[];
  }
}
