import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RootLayout from '../root';

const mockUseAuth = vi.fn();
const mockSetAuthToken = vi.fn();
const mockSetAuthTokenProvider = vi.fn();
const mockUseMe = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
    setAuthTokenProvider: (...args: unknown[]) => mockSetAuthTokenProvider(...args),
  },
}));

vi.mock('@/hooks/use-me', () => ({
  useMe: (...args: unknown[]) => mockUseMe(...args),
}));

describe('RootLayout auth sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMe.mockReturnValue({ data: null, isLoading: false, error: null, mutate: vi.fn() });
  });

  it('waits for Clerk token sync before rendering protected routes', async () => {
    let resolveToken: (value: string | null) => void = () => {};
    const tokenPromise = new Promise<string | null>((resolve) => {
      resolveToken = resolve;
    });

    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: vi.fn(() => tokenPromise),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<div>Protected content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sincronizando sesión...')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(mockUseMe).toHaveBeenCalledWith(false);

    resolveToken('token-123');

    await waitFor(() => {
      expect(mockSetAuthTokenProvider).toHaveBeenCalledTimes(1);
      expect(mockSetAuthToken).toHaveBeenCalledWith('token-123');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    expect(mockUseMe).toHaveBeenLastCalledWith(true);
});

  it('keeps API auth disabled until Clerk finishes loading and syncs a token', async () => {
    let authState = {
      isLoaded: false,
      isSignedIn: false,
      getToken: vi.fn<() => Promise<string | null>>(),
    };
    mockUseAuth.mockImplementation(() => authState);

    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<div>Protected content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(mockUseMe).toHaveBeenLastCalledWith(false);
    expect(mockSetAuthTokenProvider).not.toHaveBeenCalled();

    authState = {
      isLoaded: true,
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('fresh-token'),
    };

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<div>Protected content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockSetAuthTokenProvider).toHaveBeenCalledTimes(1);
      expect(mockSetAuthToken).toHaveBeenCalledWith('fresh-token');
    });
    expect(mockUseMe).toHaveBeenLastCalledWith(true);
  });
});
