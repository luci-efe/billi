// Worker runtime bindings. Populated from wrangler.toml / .dev.vars / secrets.
// Every variable is a secret-or-config at runtime — none are bundled.
export interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY?: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  OPENROUTER_API_KEY?: string;
  VITEST?: string;
}
