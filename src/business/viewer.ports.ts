import type { Viewer } from './viewer.model';

// right port
export abstract class ViewerRepositoryI {
  // Solo usuarios activos; null si el clerk_id no está registrado o está inactivo.
  abstract findActiveByClerkId(clerkId: string): Promise<Viewer | null>;
}
