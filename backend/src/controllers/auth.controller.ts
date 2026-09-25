import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateUniqueTag, attachSessionCookie, verifySessionToken } from '../services/auth.service.js';
import { generateRealisticName } from '../services/nameGenerator.service.js';
import { User } from '../models/User.js';
import { SESSION_COOKIE_NAME, ACCENT_COLOR_TOKENS } from '../config/constants.js';
import { validateCustomText } from '../services/profileValidator.js';

export function createAuthController() {
  const updateProfileSchema = z.object({
    bio: z.string().max(200).optional(),
    profilePicture: z.string().optional(),
    gender: z.enum(['male', 'female', 'skip']).optional()
  });

  const customizeProfileSchema = z.object({
    handle: z.string().min(2).max(24).optional(),
    avatarType: z.enum(['initials', 'identicon', 'emoji']).optional(),
    avatarValue: z.string().max(20).optional(),
    accentColor: z.string().max(30).optional(),
    bubbleStyle: z.enum(['sharp', 'rounded', 'outline']).optional(),
    statusTag: z.string().max(30).optional(),
    bio: z.string().max(200).optional(),
    gender: z.enum(['male', 'female', 'skip']).optional()
  });

  function formatUserSession(user: any) {
    const hasChosen = Boolean(user?.hasChosenGender);
    return {
      tag: user?.tag || '',
      handle: hasChosen ? (user?.handle || '') : '',
      hasChosenGender: hasChosen,
      gender: user?.gender || '',
      bio: user?.bio || '',
      profilePicture: user?.profilePicture || '',
      avatarType: user?.avatarType || 'initials',
      avatarValue: user?.avatarValue || '',
      accentColor: user?.accentColor || 'cyber-purple',
      bubbleStyle: user?.bubbleStyle || 'rounded',
      statusTag: user?.statusTag || ''
    };
  }

  return {
    async getSession(req: Request, res: Response, next: NextFunction) {
      try {
        let tag = req.user?.tag;
        let handle = req.user?.handle;
        let existingUser = null;
        const hasConsentQuery = req.query.hasConsent;

        if (tag) {
          existingUser = await User.findOne({ tag });
        }

        if (hasConsentQuery === 'false' && existingUser) {
          existingUser.hasChosenGender = false;
          existingUser.handle = '';
          existingUser.gender = '';
          await existingUser.save();
        } else if (existingUser && existingUser.hasChosenGender) {
          // If user chose skip / prefer_not_to_say, ensure their handle is Cockroach #<tag> instead of a legacy human name
          const isSkip = !existingUser.gender || existingUser.gender === 'skip' || existingUser.gender === 'prefer_not_to_say';
          if (isSkip && (!existingUser.handle || !existingUser.handle.startsWith('Cockroach #'))) {
            existingUser.handle = `Cockroach #${existingUser.tag}`;
            await existingUser.save();
          }
        }

        if (!existingUser) {
          const newIdentity = await generateUniqueTag();
          tag = newIdentity.tag;
          handle = newIdentity.handle;
          existingUser = await User.findOne({ tag });
        }

        const sessionPayload = formatUserSession(existingUser);

        // Attach httpOnly cookie
        attachSessionCookie(res, sessionPayload);

        return res.json({
          success: true,
          user: sessionPayload,
          isBanned: !!existingUser?.isBanned
        });
      } catch (err) {
        next(err);
      }
    },

    async submitConsent(req: Request, res: Response, next: NextFunction) {
      try {
        const consentSchema = z.object({
          gender: z.enum(['male', 'female', 'skip', 'prefer_not_to_say']).default('skip')
        });

        const parsed = consentSchema.safeParse(req.body);
        const rawGender = parsed.success ? parsed.data.gender : 'skip';
        const gender = rawGender === 'prefer_not_to_say' ? 'skip' : rawGender;

        let tag = req.user?.tag;
        let existingUser = null;

        if (tag) {
          existingUser = await User.findOne({ tag });
        }

        if (!existingUser) {
          const newIdentity = await generateUniqueTag(gender);
          tag = newIdentity.tag;
          existingUser = await User.findOne({ tag });
        } else {
          // Regenerate handle matching user's selected gender pool
          const handle = generateRealisticName(gender, existingUser.tag);
          existingUser.handle = handle;
          existingUser.gender = gender;
          existingUser.hasChosenGender = true;
          existingUser.lastActiveAt = new Date();
          await existingUser.save();
        }

        const sessionPayload = formatUserSession(existingUser!);

        attachSessionCookie(res, sessionPayload);

        return res.json({
          success: true,
          user: sessionPayload,
          isBanned: !!existingUser?.isBanned
        });
      } catch (err) {
        next(err);
      }
    },

    async getProfile(req: Request, res: Response, next: NextFunction) {
      try {
        const { tag } = req.params;
        const user = await User.findOne(
          { tag },
          'tag handle gender bio profilePicture avatarType avatarValue accentColor bubbleStyle statusTag isBanned'
        );
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, user: formatUserSession(user) });
      } catch (err) {
        next(err);
      }
    },

    async updateProfile(req: Request, res: Response, next: NextFunction) {
      try {
        const tag = req.user?.tag || (req.body.tag as string);
        if (!tag) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const data = updateProfileSchema.parse(req.body);
        const user = await User.findOne({ tag });
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isBanned) {
          return res.status(403).json({ success: false, message: 'User is banned' });
        }

        if (data.bio !== undefined) user.bio = data.bio;
        if (data.profilePicture !== undefined) user.profilePicture = data.profilePicture;
        if (data.gender !== undefined) user.gender = data.gender;
        user.lastActiveAt = new Date();
        await user.save();

        const updatedSession = formatUserSession(user);
        attachSessionCookie(res, updatedSession);

        return res.json({ success: true, user: updatedSession });
      } catch (err) {
        next(err);
      }
    },

    async customizeProfile(req: Request, res: Response, next: NextFunction) {
      try {
        const tag = req.user?.tag || (req.body.tag as string);
        if (!tag) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const parsed = customizeProfileSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            success: false,
            message: parsed.error.issues[0]?.message || 'Invalid customization parameters.'
          });
        }

        const data = parsed.data;
        const user = await User.findOne({ tag });
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isBanned) {
          return res.status(403).json({ success: false, message: 'User is banned' });
        }

        // 1. Moderate Custom Name (Option B) if changed
        if (data.handle && data.handle.trim() !== user.handle) {
          const nameCheck = await validateCustomText(data.handle, 'name');
          if (!nameCheck.valid) {
            return res.status(400).json({
              success: false,
              message: nameCheck.reason || 'Invalid custom name.'
            });
          }
          user.handle = data.handle.trim();
        }

        // 2. Moderate Status Tag if provided
        if (data.statusTag !== undefined && data.statusTag.trim() !== '') {
          const statusCheck = await validateCustomText(data.statusTag, 'status');
          if (!statusCheck.valid) {
            return res.status(400).json({
              success: false,
              message: statusCheck.reason || 'Invalid status tag.'
            });
          }
          user.statusTag = data.statusTag.trim();
        } else if (data.statusTag !== undefined) {
          user.statusTag = '';
        }

        // 3. Avatar Type & Value
        if (data.avatarType !== undefined) user.avatarType = data.avatarType;
        if (data.avatarValue !== undefined) user.avatarValue = data.avatarValue;

        // 4. Accent Color (Preset token or hex color code from Color Picker)
        if (data.accentColor !== undefined) {
          const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(data.accentColor);
          if (ACCENT_COLOR_TOKENS.includes(data.accentColor) || isHex) {
            user.accentColor = data.accentColor;
          }
        }

        // 5. Bubble Style
        if (data.bubbleStyle !== undefined) user.bubbleStyle = data.bubbleStyle;

        // 6. Bio & Gender
        if (data.bio !== undefined) user.bio = data.bio;
        if (data.gender !== undefined) {
          user.gender = data.gender;
          user.hasChosenGender = true;
        }
        if (data.handle && data.handle.trim() !== '') {
          user.hasChosenGender = true;
        }

        user.lastActiveAt = new Date();
        await user.save();

        const updatedSession = formatUserSession(user);
        attachSessionCookie(res, updatedSession);

        return res.json({ success: true, user: updatedSession });
      } catch (err) {
        next(err);
      }
    },

    async rerollName(req: Request, res: Response, next: NextFunction) {
      try {
        const tag = req.user?.tag || (req.body.tag as string);
        if (!tag) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findOne({ tag });
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isBanned) {
          return res.status(403).json({ success: false, message: 'User is banned' });
        }

        // Option A: Safe re-roll from regional name generators
        const isAnonymous = !user.gender || user.gender === 'skip' || user.gender === 'prefer_not_to_say';
        let newHandle: string;
        if (isAnonymous) {
          // Generate a fresh unique random 4-digit identifier for Cockroach pseudonym so re-rolling generates a new distinct identity
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          newHandle = `Cockroach #${randomSuffix}`;
        } else {
          newHandle = generateRealisticName(user.gender, user.tag);
        }

        user.handle = newHandle;
        user.hasChosenGender = true;
        user.lastActiveAt = new Date();
        await user.save();

        const updatedSession = formatUserSession(user);
        attachSessionCookie(res, updatedSession);

        return res.json({ success: true, user: updatedSession });
      } catch (err) {
        next(err);
      }
    },

    async heartbeat(req: Request, res: Response, next: NextFunction) {
      try {
        const tag = req.user?.tag || (req.body.tag as string);
        if (!tag) {
          return res.json({ success: true });
        }

        const user = await User.findOne({ tag });
        if (user) {
          if (user.isBanned) {
            return res.json({ success: true, isBanned: true });
          }
          user.lastActiveAt = new Date();
          await user.save();
        }

        return res.json({ success: true, isBanned: false });
      } catch (err) {
        next(err);
      }
    }
  };
}
