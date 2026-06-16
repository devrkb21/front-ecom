import api, { setAuthToken, clearAuthToken, initCsrf } from './api';
import { 
  ApiResponse, 
  AuthResponse, 
  User, 
  LoginCredentials, 
  RegisterData,
  ProfileUpdateData 
} from '@/types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Initialize CSRF token before login
    await initCsrf();
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    const { user, token } = response.data.data;
    setAuthToken(token);
    return { user, token };
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    // Initialize CSRF token before register
    await initCsrf();
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    const { user, token } = response.data.data;
    setAuthToken(token);
    return { user, token };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuthToken();
    }
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/profile');
    return response.data.data;
  },

  async updateProfile(data: ProfileUpdateData): Promise<User> {
    const response = await api.put<ApiResponse<User>>('/profile', {
      name: data.name,
      phone: data.phone,
      address: data.address,
    });
    return response.data.data;
  },

  async updatePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> {
    await api.post('/auth/change-password', data);
  },

  async forgotPassword(email: string): Promise<void> {
    await initCsrf();
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(data: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> {
    await initCsrf();
    await api.post('/auth/reset-password', data);
  },
};

export default authService;
