import jwt from 'jsonwebtoken';
import { TokenPayload } from '@collab/shared-types';

const SECRET: string = process.env.JWT_SECRET!;
const EXPIRES_IN: string = process.env.JWT_EXPIRES_IN ?? '7d';

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET as jwt.Secret, {
    expiresIn: EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
}