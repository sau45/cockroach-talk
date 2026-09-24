import { RESERVED_NAME_TERMS } from '../config/constants.js';
import { securityService } from './security.service.js';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a custom display name or status tag against reserved terms,
 * length constraints, character rules, and automated toxicity scoring.
 */
export async function validateCustomText(
  text: string,
  type: 'name' | 'status'
): Promise<ValidationResult> {
  const trimmed = (text || '').trim();

  if (type === 'name') {
    if (trimmed.length < 2) {
      return { valid: false, reason: 'Name must be at least 2 characters long.' };
    }
    if (trimmed.length > 24) {
      return { valid: false, reason: 'Name cannot exceed 24 characters.' };
    }

    // Allow letters, numbers, spaces, underscores, and hyphens
    const validCharsRegex = /^[a-zA-Z0-9_\- ]+$/;
    if (!validCharsRegex.test(trimmed)) {
      return {
        valid: false,
        reason: 'Name may only contain letters, numbers, spaces, underscores, and hyphens.'
      };
    }
  } else {
    // Status tag
    if (trimmed.length > 30) {
      return { valid: false, reason: 'Status cannot exceed 30 characters.' };
    }
  }

  // 1. Reserved-Word / Impersonation Protection
  // Normalize by stripping non-alphanumeric characters for comparison
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const reserved of RESERVED_NAME_TERMS) {
    const normReserved = reserved.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized === normReserved || normalized.includes(normReserved)) {
      return {
        valid: false,
        reason: `"${trimmed}" contains a reserved or administrative term. Please choose another ${type}.`
      };
    }
  }

  // 2. Perspective API & Linguistic Toxicity Check
  try {
    const toxicityScore = await securityService.scoreToxicity(trimmed);
    if (toxicityScore >= 0.50) {
      return {
        valid: false,
        reason: `This ${type} violates community safety standards. Please choose a respectful ${type}.`
      };
    }
  } catch (err) {
    console.warn('[validateCustomText] Toxicity scoring failed open:', err);
  }

  return { valid: true };
}
