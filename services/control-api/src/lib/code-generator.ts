import { randomInt } from 'crypto';
import { Model } from 'mongoose';

const CHARS = 'abcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 4;
const MAX_RETRIES = 10;

/**
 * Generate a random 4-letter lowercase code (a-z)
 */
function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS[randomInt(CHARS.length)];
  }
  return code;
}

/**
 * Generate a unique code for a Mongoose model by checking for duplicates
 * @param model The Mongoose model to check against
 * @param maxRetries Maximum number of attempts to generate a unique code
 * @returns A unique 4-letter lowercase code (a-z)
 * @throws Error if unable to generate a unique code after maxRetries attempts
 */
export async function generateUniqueCode<T>(
  model: Model<T>,
  maxRetries: number = MAX_RETRIES
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateRandomCode();
    const existing = await model.findOne({ code } as any).lean().exec();
    if (!existing) {
      return code;
    }
  }
  throw new Error(`Failed to generate unique code after ${maxRetries} attempts`);
}
