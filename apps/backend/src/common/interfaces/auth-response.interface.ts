import { User } from '@prisma/client';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: Omit<User, 'pw_hash'>;
}
