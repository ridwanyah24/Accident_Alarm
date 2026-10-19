import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole, AccountStatus, UserProfile } from '@accident-alarm/api-contracts';
import { config } from '../config';
import { getDbStore } from '../db';
import { UnauthorizedError, ForbiddenError } from '../common/errors';

export interface TokenPayload {
  userId: string;
  email: string | null;
  role: UserRole;
  fullName: string | null;
  agencyId: string | null;
}

export class AuthService {
  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const store = getDbStore();
    const user = await store.findUserByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenError('Your account has been suspended. Please contact your system administrator.');
    }

    if (user.accountStatus === AccountStatus.DISABLED) {
      throw new ForbiddenError('Your account has been disabled.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Update last login timestamp
    await store.updateUser(user.id, { lastLoginAt: new Date() });

    // Fetch agency name if assigned
    let agencyName: string | null = null;
    if (user.agencyId) {
      const agency = await store.findAgencyById(user.agencyId);
      if (agency) {
        agencyName = agency.name;
      }
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      agencyId: user.agencyId
    };

    const token = jwt.sign(payload, config.authSecret, {
      expiresIn: '24h'
    });

    const userProfile: UserProfile = {
      id: user.id,
      fullName: user.fullName || 'Anonymous User',
      email: user.email || '',
      role: user.role,
      accountStatus: user.accountStatus,
      agencyId: user.agencyId,
      agencyName
    };

    return { token, user: userProfile };
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.authSecret) as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token.');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  hashGuestToken(token: string): string {
    return crypto.createHash('sha256').update(token + config.guestTokenSecret).digest('hex');
  }

  generateGuestToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  generateReferenceCode(): string {
    // Generates non-sequential uppercase alphanumeric code, e.g. "RA-7K4M2P"
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused chars: 0, 1, I, O
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return `RA-${code}`;
  }
}

export const authService = new AuthService();
