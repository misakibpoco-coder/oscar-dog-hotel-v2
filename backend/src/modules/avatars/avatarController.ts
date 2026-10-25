import { Request, Response } from 'express';
import { UNIVERSAL_DOG_AVATARS } from '../../constants/registries.js';

export class AvatarController {
  static getAvatars(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      data: UNIVERSAL_DOG_AVATARS
    });
  }
}
