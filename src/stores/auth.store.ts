import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData } from '@/types';
import { authService, getAuthToken, clearAuthToken } from '@/services';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.login(credentials);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          let message = 'Login failed';
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            message = axiosError.response?.data?.message || message;
          } else if (error instanceof Error) {
            message = error.message;
          }
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.register(data);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          let message = 'Registration failed';
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            message = axiosError.response?.data?.message || message;
          } else if (error instanceof Error) {
            message = error.message;
          }
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          clearAuthToken();
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      fetchUser: async () => {
        const token = getAuthToken();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        
        set({ isLoading: true });
        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          clearAuthToken();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      initialize: async () => {
        const { isInitialized } = get();
        if (isInitialized) return;
        
        const token = getAuthToken();
        if (token) {
          try {
            const user = await authService.getMe();
            set({ user, isAuthenticated: true, isInitialized: true });
          } catch {
            clearAuthToken();
            set({ user: null, isAuthenticated: false, isInitialized: true });
          }
        } else {
          set({ isInitialized: true });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;
