export class InvalidInvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInvitationError';
  }
}

export class ClerkInvitationError extends Error {
  constructor(message: string) {
    super(`Error al enviar la invitación: ${message}`);
    this.name = 'ClerkInvitationError';
  }
}
