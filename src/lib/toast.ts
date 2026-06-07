import { toast as sonner } from 'sonner';
import { errorMessage } from '@/lib/errors';

/**
 * App-wide toast facade. Centralizing it means we can change the toast library
 * or add logging/analytics in one place, and `toast.error(err)` always renders a
 * localized, human-readable message from any thrown value.
 */
export const toast = {
  success: (message: string) => sonner.success(message),
  info: (message: string) => sonner.info(message),
  warning: (message: string) => sonner.warning(message),
  /** Accepts a string OR any thrown error (mapped via errorMessage). */
  error: (error: unknown) =>
    sonner.error(typeof error === 'string' ? error : errorMessage(error)),
};
