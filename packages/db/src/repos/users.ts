import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { users, type UserRow, type NewUserRow } from '../schema/users';

export class UserRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private db: LibSQLDatabase<any>) {}

  async findById(id: string): Promise<UserRow | null> {
    const results = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return results[0] ?? null;
  }

  async upsert(user: NewUserRow): Promise<UserRow> {
    const existing = await this.findById(user.id);
    if (existing) {
      await this.db.update(users).set(user).where(eq(users.id, user.id));
      return (await this.findById(user.id))!;
    }
    await this.db.insert(users).values(user);
    return (await this.findById(user.id))!;
  }

  async update(id: string, data: Partial<Omit<UserRow, 'id' | 'createdAt'>>): Promise<UserRow | null> {
    await this.db.update(users).set(data).where(eq(users.id, id));
    return this.findById(id);
  }
}
