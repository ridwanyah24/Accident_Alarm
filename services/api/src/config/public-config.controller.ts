import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  PublicEmergencyConfig,
  IncidentCategory,
  ReporterSeverity
} from '@accident-alarm/api-contracts';
import { config } from './index';

const router = Router();

router.get('/public', (req: Request, res: Response): void => {
  const publicConfig: PublicEmergencyConfig = {
    helplines: {
      primary: config.emergency.primary,
      police: config.emergency.police,
      ambulance: config.emergency.ambulance,
      fire: config.emergency.fire
    },
    countryCode: config.emergency.countryCode,
    disclaimer: config.emergency.disclaimer,
    incidentCategories: Object.values(IncidentCategory),
    reporterSeverities: Object.values(ReporterSeverity)
  };

  const response: ApiResponse<PublicEmergencyConfig> = {
    data: publicConfig
  };
  res.status(200).json(response);
});

export const publicConfigRouter = router;
