import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../config/env.js';
import { SESSION_COOKIE_NAME } from '../config/constants.js';
import { countersCollection, usersCollection } from '../config/db.js';
import { User } from '../models/User.js';
import { UserSession } from '../types/index.js';
import { generateRealisticName } from './nameGenerator.service.js';

let inMemoryCounter = 1001;

export async function generateUniqueTag(gender?: string): Promise<{ tag: string; handle: string }> {
  try {
    let nextId: string;
    let seq = 1001;

    if (countersCollection) {
      const counterDoc = await countersCollection.findOneAndUpdate(
        { _id: 'userid' as any },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      seq = counterDoc?.seq || (counterDoc?.value as any)?.seq || 1001;
      nextId = seq.toString();
    } else {
      nextId = inMemoryCounter.toString();
      seq = inMemoryCounter;
      inMemoryCounter++;
    }

    const hasChosenGender = Boolean(gender);
    const handle = hasChosenGender ? generateRealisticName(gender, nextId) : '';

    // Upsert into users database
    await User.findOneAndUpdate(
      { tag: nextId },
      {
        tag: nextId,
        tagNum: seq,
        handle,
        gender: gender || '',
        hasChosenGender,
        lastActiveAt: new Date()
      },
      { upsert: true, new: true }
    );

    return { tag: nextId, handle };
  } catch (error) {
    console.error('Error generating unique tag:', error);
    const fallbackTag = Math.floor(1000 + Math.random() * 9000).toString();
    const fallbackHandle = gender ? generateRealisticName(gender, fallbackTag) : '';
    return { tag: fallbackTag, handle: fallbackHandle };
  }
}

export function signSessionToken(session: UserSession): string {
  return jwt.sign(session, env.SESSION_SECRET, { expiresIn: '30d' });
}

export function verifySessionToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, env.SESSION_SECRET) as UserSession;
  } catch {
    return null;
  }
}

export function attachSessionCookie(res: Response, session: UserSession): void {
  const token = signSessionToken(session);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}
