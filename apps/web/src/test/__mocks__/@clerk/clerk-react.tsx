import { vi } from "vitest";

export const ClerkProvider = ({ children }: any) => <div data-testid="clerk-provider">{children}</div>;
export const SignedIn = ({ children }: any) => <div data-testid="signed-in-content">{children}</div>;
export const SignedOut = ({ children }: any) => <div data-testid="signed-out-content">{children}</div>;
export const SignIn = () => <div data-testid="clerk-sign-in">Sign In Component</div>;
export const SignUp = () => <div data-testid="clerk-sign-up">Sign Up Component</div>;

export const useUser = vi.fn(() => ({ user: null, isLoaded: true }));
export const useAuth = vi.fn(() => ({ isSignedIn: false, userId: null, isLoaded: true }));
export const useClerk = vi.fn(() => ({ signOut: vi.fn() }));
