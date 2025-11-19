import { db } from '../database';
import { Client } from '../types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export class ClientModel {
  static async create(
    username: string,
    password: string,
    displayName: string,
    email?: string,
    role: 'admin' | 'user' = 'user'
  ): Promise<Client> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO clients (id, username, password_hash, display_name, email, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, username, passwordHash, displayName, email, role, now]
    );

    const client = await this.findById(id);
    if (!client) throw new Error('Failed to create client');
    return client;
  }

  static async findById(id: string): Promise<Client | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM clients WHERE id = ?',
      [id]
    );

    return row ? this.mapRow(row) : undefined;
  }

  static async findByUsername(username: string): Promise<Client | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM clients WHERE username = ?',
      [username]
    );

    return row ? this.mapRow(row) : undefined;
  }

  static async verifyPassword(username: string, password: string): Promise<Client | null> {
    const client = await this.findByUsername(username);
    if (!client) return null;

    const isValid = await bcrypt.compare(password, client.passwordHash);
    return isValid ? client : null;
  }

  static async findAll(): Promise<Client[]> {
    const rows = await db.all<any>('SELECT * FROM clients ORDER BY username');
    return rows.map(row => this.mapRow(row));
  }

  static async delete(id: string): Promise<void> {
    await db.run('DELETE FROM clients WHERE id = ?', [id]);
  }

  static async updateRole(id: string, role: 'admin' | 'user'): Promise<void> {
    await db.run('UPDATE clients SET role = ? WHERE id = ?', [role, id]);
  }

  private static mapRow(row: any): Client {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      displayName: row.display_name,
      email: row.email,
      role: row.role || 'user',
      createdAt: new Date(row.created_at)
    };
  }
}
