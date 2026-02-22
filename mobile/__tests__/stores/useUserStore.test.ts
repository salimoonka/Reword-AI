/**
 * Tests for useUserStore
 */

import { useUserStore } from '@/stores/useUserStore';
import { act } from '@testing-library/react-native';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  refreshToken: null,
};

beforeEach(() => {
  act(() => {
    useUserStore.setState(initialState);
  });
});

describe('useUserStore', () => {
  describe('setUser', () => {
    it('should set user and mark authenticated', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: '2026-01-01T00:00:00Z',
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const state = useUserStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear user and mark unauthenticated when null', () => {
      act(() => {
        useUserStore.getState().setUser({
          id: 'user-123',
          createdAt: '2026-01-01T00:00:00Z',
        });
      });

      act(() => {
        useUserStore.getState().setUser(null);
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('should set access and refresh tokens', () => {
      act(() => {
        useUserStore.getState().setTokens('access-token', 'refresh-token');
      });

      const state = useUserStore.getState();
      expect(state.accessToken).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should mark unauthenticated when access token is null', () => {
      act(() => {
        useUserStore.getState().setTokens('token', 'refresh');
      });

      act(() => {
        useUserStore.getState().setTokens(null, null);
      });

      const state = useUserStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setIsLoading', () => {
    it('should update loading state', () => {
      expect(useUserStore.getState().isLoading).toBe(true);

      act(() => {
        useUserStore.getState().setIsLoading(false);
      });

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      act(() => {
        const store = useUserStore.getState();
        store.setUser({
          id: 'user-123',
          email: 'test@example.com',
          createdAt: '2026-01-01T00:00:00Z',
        });
        store.setTokens('access', 'refresh');
      });

      act(() => {
        useUserStore.getState().logout();
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
