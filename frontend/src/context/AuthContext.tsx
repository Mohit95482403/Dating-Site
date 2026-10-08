import { createContext, useContext, useState, useEffect, useCallback, useRef, useTransition, useMemo } from 'react';
import type { ReactNode, FC } from 'react';
import type { AuthUser, LoginPayload, RegisterPayload } from '../types/auth';
import { authService } from '../services/auth.service';
import { setOnAuthFailure, setAccessToken, getAccessToken, getStoredUser, setStoredUser } from '../services/api';
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
  // Synchronous session initialization:
  // If an access token and cached user exist, restore them immediately on frame 0
  const initialToken = getAccessToken();
  const initialCachedUser = initialToken ? getStoredUser() : null;

  const [user, setUser] = useState<AuthUser | null>(initialCachedUser);
  // Only enter loading state if we have a token that needs validation without a cached user
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return Boolean(initialToken && !initialCachedUser);
  });
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
      setStoredUser(null);
      setIsLoading(false);
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
      const existingToken = getAccessToken();

      // Case 1: Visitor has NO token in storage — they are a guest!
      // Settle auth immediately in 0ms without sending a blocking /refresh request to Render
      if (!existingToken) {
        if (isMounted) {
          setUser(null);
          setStoredUser(null);
          setIsLoading(false);
        }
        return;
      }

      // Case 2: Visitor has an existing access token in storage
      try {
        // Verify token validity with backend /api/auth/me
        const currentUser = await authService.getCurrentUser();
        if (isMounted && currentUser) {
          setUser(currentUser);
          setStoredUser(currentUser);
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        // Token may have expired while tab was closed; attempt silent refresh only if token existed
        console.warn('[AuthContext] Stored token expired, attempting silent refresh...', err?.message);
        try {
          const newToken = await authService.refresh();
          if (newToken && isMounted) {
            const currentUser = await authService.getCurrentUser();
            if (isMounted && currentUser) {
              setUser(currentUser);
              setStoredUser(currentUser);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Refresh session expired or invalid
        }
      }

      // Session could not be validated or refreshed: clear state
      if (isMounted) {
        setUser(null);
        setAccessToken(null);
        setStoredUser(null);
        setIsLoading(false);
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
  const login = useCallback(async (payload: LoginPayload): Promise<AuthUser> => {
    try {
      const { user: loggedInUser } = await authService.login(payload);
      setUser(loggedInUser);
      setStoredUser(loggedInUser);
      setIsLoading(false);
      toast.success(`Welcome back, ${loggedInUser.firstName || 'there'}!`);
      return loggedInUser;
    } catch (error) {
      const normalized = normalizeApiError(error);
      throw normalized;
    }
  }, [toast]);

  /**
   * Register a new user
   */
  const register = useCallback(async (payload: RegisterPayload): Promise<AuthUser> => {
    try {
      const { user: registeredUser } = await authService.register(payload);
      setUser(registeredUser);
      setStoredUser(registeredUser);
      setIsLoading(false);
      toast.success('Registration successful! Welcome to Connectly.');
      return registeredUser;
    } catch (error) {
      const normalized = normalizeApiError(error);
      throw normalized;
    }
  }, [toast]);

  /**
   * Log out of current session
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Even if network fails, clear local state
    } finally {
      setUser(null);
      setAccessToken(null);
      setStoredUser(null);
      setIsLoading(false);
      toast.info('You have been logged out.');
    }
  }, [toast]);

  /**
   * Log out of all sessions across all devices
   */
  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      await authService.logoutAll();
    } catch {
      // Ignore network error on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      setStoredUser(null);
      setIsLoading(false);
      toast.info('Logged out from all devices.');
    }
  }, [toast]);

  /**
   * Refresh current user identity from server
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const updatedUser = await authService.getCurrentUser();
      setUser(updatedUser);
      setStoredUser(updatedUser);
    } catch (error) {
      const normalized = normalizeApiError(error);
      throw normalized;
    }
  }, []);

  const authContextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      logoutAll,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, logoutAll, refreshUser]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
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
