import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiResponse, LoginResponse, UserProfile } from '@accident-alarm/api-contracts';
import { authService } from './auth.service';
import { authenticate } from './auth.middleware';
import { validateBody } from '../common/middleware';
import { getDbStore } from '../db';
import { NotFoundError } from '../common/errors';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  password: z.string().min(1, 'Password is required.')
});

router.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      const response: ApiResponse<LoginResponse> = {
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/logout', (req: Request, res: Response): void => {
  // Session revocation acknowledgment
  res.status(200).json({
    data: {
      message: 'Logged out successfully.'
    }
  });
});

router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new NotFoundError('User context not found.');
      }

      const store = getDbStore();
      const user = await store.findUserById(req.user.id);
      if (!user) {
        throw new NotFoundError('User profile not found.');
      }

      let agencyName: string | null = null;
      if (user.agencyId) {
        const agency = await store.findAgencyById(user.agencyId);
        if (agency) {
          agencyName = agency.name;
        }
      }

      const userProfile: UserProfile = {
        id: user.id,
        fullName: user.fullName || 'Staff Member',
        email: user.email || '',
        role: user.role,
        accountStatus: user.accountStatus,
        agencyId: user.agencyId,
        agencyName
      };

      const response: ApiResponse<UserProfile> = {
        data: userProfile
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export const authRouter = router;
