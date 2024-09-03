import { useAuthStore } from './authStore';
import { getAuthorizationUrl } from './oauth';

export function useAuth() {
  const { accessToken, setAccessToken } = useAuthStore();

  return {
    accessToken,
    setAccessToken,
    isLoggedIn: Boolean(accessToken),
    login: () => {
      location.href = getAuthorizationUrl();
    },
    logout: () => {
      setAccessToken('');
      location.reload();
    },
  };
}
