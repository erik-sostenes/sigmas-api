import { Webhook } from 'svix';
import type { Request } from 'express';
import { BadRequestException, type RawBodyRequest } from '@nestjs/common';
import { UserWebhookClerkController } from './user-webhook.controller';
import { UserLogic } from '../../business/user.logic';
import { User, UserId } from '../../business/user.model';
import { UserRepositoryI } from '../../business/user.ports';
import {
  ActivityAlreadyHasLeaderError,
  InvalidUserActivitiesRoleError,
  InvalidUserAssignmentError,
  LeaderUserRequiresActivitiesError,
} from '../../business/user.errors';

describe('UserWebhookClerkController + UserLogic', () => {
  const testSecret =
    'whsec_' +
    Buffer.from('12345678901234567890123456789012').toString('base64');
  const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  let saveUserMock: jest.Mock<Promise<UserId>, [User]>;
  let controller: UserWebhookClerkController;

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;
    saveUserMock = jest.fn().mockResolvedValue('uuid-created');
    const userRepository: UserRepositoryI = {
      save: saveUserMock,
      hasActiveRole: jest.fn().mockResolvedValue(false),
    };
    const userLogic = new UserLogic(userRepository);
    controller = new UserWebhookClerkController(userLogic);
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    } else {
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
    }
  });

  const buildSignedRequest = (eventPayload: unknown) => {
    const rawString = JSON.stringify(eventPayload);
    const rawBody = Buffer.from(rawString, 'utf8');
    const wh = new Webhook(testSecret);
    const msgId = 'msg_test_123';
    const timestamp = new Date();
    const signature = wh.sign(msgId, timestamp, rawString);

    const headers = {
      'svix-id': msgId,
      'svix-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
      'svix-signature': signature,
    };

    const req = { rawBody } as unknown as RawBodyRequest<Request>;
    return { headers, req };
  };

  it('procesa user.created con firma válida y guarda el usuario con roles y actividades', async () => {
    const { headers, req } = buildSignedRequest({
      type: 'user.created',
      data: {
        id: 'user_clerk_abc',
        first_name: 'Hector',
        last_name: 'Ramirez Olvera',
        email_addresses: [{ id: 'idn_1', email_address: 'lider@itsoeh.edu.mx' }],
        public_metadata: {
          departmentId: 4,
          title: 'Ing.',
          roleCodes: ['solicitante', 'lider_actividad'],
          activityCodes: ['C2A1'],
        },
      },
    });

    const response = await controller.handleuserClerkWebhook(headers, req);

    expect(response).toEqual({ success: true });
    expect(saveUserMock).toHaveBeenCalledTimes(1);
    const savedUser = saveUserMock.mock.calls[0]?.[0];
    expect(savedUser?.clerkId).toBe('user_clerk_abc');
    expect(savedUser?.firstName).toBe('Hector');
    expect(savedUser?.lastName).toBe('Ramirez Olvera');
    expect(savedUser?.email).toBe('lider@itsoeh.edu.mx');
    expect(savedUser?.departmentId).toBe(4);
    expect(savedUser?.roleCodes).toEqual(['solicitante', 'lider_actividad']);
    expect(savedUser?.activityCodes).toEqual(['C2A1']);
  });

  it('procesa user.created únicamente con roleIds y activityIds (sin roleCodes ni activityCodes)', async () => {
    const { headers, req } = buildSignedRequest({
      type: 'user.created',
      data: {
        id: 'user_clerk_num_only',
        first_name: 'Juan',
        last_name: 'Perez Lopez',
        email_addresses: [{ id: 'idn_2', email_address: 'solo_ids@itsoeh.edu.mx' }],
        public_metadata: {
          departmentId: 5,
          title: 'Coordinador',
          roleIds: [2],
          activityIds: [15],
        },
      },
    });

    const response = await controller.handleuserClerkWebhook(headers, req);

    expect(response).toEqual({ success: true });
    expect(saveUserMock).toHaveBeenCalledTimes(1);
    const savedUser = saveUserMock.mock.calls[0]?.[0];
    expect(savedUser?.clerkId).toBe('user_clerk_num_only');
    expect(savedUser?.firstName).toBe('Juan');
    expect(savedUser?.lastName).toBe('Perez Lopez');
    expect(savedUser?.roleIds).toEqual([2]);
    expect(savedUser?.roleCodes).toEqual([]);
    expect(savedUser?.activityIds).toEqual([15]);
    expect(savedUser?.activityCodes).toEqual([]);
  });

  it('rechaza firma de Svix inválida con BadRequestException', async () => {
    const { headers, req } = buildSignedRequest({
      type: 'user.created',
      data: {},
    });
    headers['svix-signature'] = 'v1,firma_invalida';

    await expect(
      controller.handleuserClerkWebhook(headers, req),
    ).rejects.toThrow(BadRequestException);
    expect(saveUserMock).not.toHaveBeenCalled();
  });

  it('propaga errores de dominio (como conflicto de líder o actividades sin rol) sin ocultarlos como error de firma', async () => {
    const { headers, req } = buildSignedRequest({
      type: 'user.created',
      data: {
        id: 'user_clerk_abc',
        first_name: 'Ana',
        last_name: 'Gomez',
        email_addresses: [{ email_address: 'solicitante@itsoeh.edu.mx' }],
        public_metadata: {
          departmentId: 1,
          title: 'Lic.',
          roleCodes: ['solicitante'],
          activityCodes: ['C1A1'],
        },
      },
    });

    await expect(
      controller.handleuserClerkWebhook(headers, req),
    ).rejects.toThrow(InvalidUserActivitiesRoleError);

    const leaderWithoutActivities = buildSignedRequest({
      type: 'user.created',
      data: {
        id: 'user_clerk_abc',
        first_name: 'Ana',
        last_name: 'Gomez',
        email_addresses: [{ email_address: 'lider@itsoeh.edu.mx' }],
        public_metadata: {
          departmentId: 1,
          title: 'Lic.',
          roleCodes: ['lider_actividad'],
          activityCodes: [],
        },
      },
    });

    await expect(
      controller.handleuserClerkWebhook(
        leaderWithoutActivities.headers,
        leaderWithoutActivities.req,
      ),
    ).rejects.toThrow(LeaderUserRequiresActivitiesError);

    saveUserMock.mockRejectedValueOnce(
      new ActivityAlreadyHasLeaderError([
        {
          activityCode: 'C1A1',
          currentLeaderId: 'uuid-otro',
          currentLeaderEmail: 'otro@itsoeh.edu.mx',
        },
      ]),
    );

    const conflictEvent = buildSignedRequest({
      type: 'user.created',
      data: {
        id: 'user_clerk_abc',
        first_name: 'Ana',
        last_name: 'Gomez',
        email_addresses: [{ email_address: 'lider@itsoeh.edu.mx' }],
        public_metadata: {
          departmentId: 1,
          title: 'Lic.',
          roleCodes: ['lider_actividad'],
          activityCodes: ['C1A1'],
        },
      },
    });

    await expect(
      controller.handleuserClerkWebhook(
        conflictEvent.headers,
        conflictEvent.req,
      ),
    ).rejects.toThrow(ActivityAlreadyHasLeaderError);
  });

  it('rechaza evento user.created sin roleCodes en public_metadata', async () => {
    const { headers, req } = buildSignedRequest({
      type: 'user.created',
      data: {
        id: 'user_clerk_abc',
        first_name: 'Ana',
        last_name: 'Gomez',
        email_addresses: [{ email_address: 'sinrol@itsoeh.edu.mx' }],
        public_metadata: {
          departmentId: 1,
          title: 'Lic.',
        },
      },
    });

    await expect(
      controller.handleuserClerkWebhook(headers, req),
    ).rejects.toThrow(InvalidUserAssignmentError);
  });
});
