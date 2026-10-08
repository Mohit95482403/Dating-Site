import axios from 'axios';
import type { ApiError } from '../types/auth';

/**
 * Normalizes any error (AxiosError, AppError, Error, or unknown) into a predictable ApiError structure.
 * Maps error messages to field-specific errors where applicable.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    // Network error / backend offline / timeout
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        return {
          message: 'Connecting to server took longer than expected. Please try again.',
          status: 0,
        };
      }
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        return {
          message: 'Unable to connect to Connectly. Please check your network connection and try again.',
          status: 0,
        };
      }
      return {
        message: error.message || 'Unable to connect to Connectly. Please try again.',
        status: 0,
      };
    }

    const data = error.response.data as { message?: string; errors?: string[] } | undefined;
    let message = data?.message;
    if (!message) {
      if (error.response.status === 401) {
        message = 'Invalid email or password. Please check your credentials.';
      } else if (error.response.status === 403) {
        message = 'Access restricted. Please contact support.';
      } else if (error.response.status === 429) {
        message = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.response.status === 503) {
        message = 'Connectly database service is temporarily unavailable. Please verify cloud database connection.';
      } else if (error.response.status >= 500) {
        message = 'Connectly server is temporarily busy. Please try again in a few seconds.';
      } else {
        message = error.response.statusText || 'An unexpected error occurred.';
      }
    }
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    const fieldErrors: Record<string, string> = {};

    // Map common validation messages to field names
    for (const err of errors) {
      const lower = err.toLowerCase();
      if (lower.includes('email')) {
        fieldErrors.email = err;
      } else if (lower.includes('password')) {
        fieldErrors.password = err;
      } else if (lower.includes('first name') || lower.includes('firstname')) {
        fieldErrors.firstName = err;
      } else if (lower.includes('last name') || lower.includes('lastname')) {
        fieldErrors.lastName = err;
      } else if (lower.includes('date of birth') || lower.includes('birth') || lower.includes('age')) {
        fieldErrors.dateOfBirth = err;
      } else if (lower.includes('gender')) {
        fieldErrors.gender = err;
      }
    }

    // Also check main message if it specifies a field conflict (e.g., duplicate email)
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('email already exists') || lowerMsg.includes('email is already registered')) {
      fieldErrors.email = message;
    }

    return {
      message,
      status: error.response.status,
      errors: errors.length > 0 ? errors : undefined,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errObj = error as { message: string; status?: number; errors?: string[]; fieldErrors?: Record<string, string> };
    return {
      message: errObj.message || 'An unexpected error occurred.',
      status: errObj.status,
      errors: errObj.errors,
      fieldErrors: errObj.fieldErrors,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  return {
    message: 'An unexpected error occurred. Please try again.',
  };
}
