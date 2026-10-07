import { createContext, useContext, useState, useEffect, useCallback, useRef, useTransition } from 'react';
import type { ReactNode, FC } from 'react';
import type { AuthUser, LoginPayload, RegisterPayload } from '../types/auth';
import { authService } from '../services/auth.service';
import { setOnAuthFailure, setAccessToken, getAccessToken } from '../services/api';
import { useToast } from './ToastContext';
import { normalizeApiError } from '../utils/apiError';

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, startTransition] = useTransition();
  const toast = useToast();

  // Track current user in ref to avoid stale closure or recreation
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  // Handle session expiration triggered by 401 interceptor
  // ONLY notify if the user was actually logged in (prevents guest visitors from seeing session expired)
  const handleAuthFailure = useCallback(() => {
    if (userRef.current) {
      toast.warning('Your session has expired. Please log in again.');
    }
    startTransition(() => {
      setUser(null);
      setAccessToken(null);
    });
  }, [toast]);

  // Register the auth failure callback once
  useEffect(() => {
    setOnAuthFailure(handleAuthFailure);
  }, [handleAuthFailure]);

  // Initial Authentication Restoration Flow - runs ONCE on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Check if an active access token is already available
        const existingToken = getAccessToken();
        if (existingToken) {
          try {
            // Verify token validity with backend /api/auth/me
            const currentUser = await authService.getCurrentUser();
            if (isMounted && currentUser) {
              setUser(currentUser);
              return;
            }
          } catch (err: any) {
            // Token may have expired while tab was closed; attempt refresh below
            console.warn('[AuthContext] Stored token expired, attempting silent refresh...', err?.message);
          }
        }

        // 2. Silently attempt to restore session via refresh cookie / rotation
        try {
          const token = await authService.refresh();
          if (token && isMounted) {
            const currentUser = await authService.getCurrentUser();
            if (isMounted && currentUser) {
              setUser(currentUser);
              return;
            }
          }
        } catch {
          // No active refresh session exists
        }

        // 3. Guest visitor or session expired
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Run only once on mount!

  /**
   * Log in user with credentials
   */
  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    try {
      const { user: loggedInUser } = await authService.login(payload);
      setUser(loggedInUser);
      toast.success(`Welcome back, ${loggedInUser.firstName || 'there'}!`);
      return loggedInUser;
    } catch (error) {
      const normalized = normalizeApiError(error);
      throw normalized;
    }
  };

  /**
   * Register a new user
   */
  const register = async (payload: RegisterPayload): Promise<AuthUser> => {
    try {
      const { user: registeredUser } = await authService.register(payload);
      setUser(registeredUser);
      toast.success('Registration successful! Welcome to Connectly.');
      return registeredUser;
    } catch (error) {
      const normalized = normalizeApiError(error);
      throw normalized;
    }
  };

  /**
   * Log out of current session
   */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Even if network fails, clear local state
    } finally {
      setUser(null);
      setAccessToken(null);
      toast.info('You have been logged out.');
    }
  };

  /**
   * Log out of all sessions across all devices
   */
  const logoutAll = async (): Promise<void> => {
    try {
      await authService.logoutAll();
    } catch {
      // Ignore network error on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      toast.info('Logged out from all devices.');
    }
  };

  /**
   * Refresh current user identity from server
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const updatedUser = await authService.getCurrentUser();
      setUser(updatedUser);
    } catch (error) {
      const normalized = normalizeApiError(error);
      throw normalized;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
