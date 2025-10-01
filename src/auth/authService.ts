import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'battleship-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  resetCode?: string;
  resetCodeExpiry?: number;
}

export interface UserStats {
  id: string;
  username: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export class AuthService {
  private users: Map<string, User> = new Map();
  private usernameIndex: Map<string, string> = new Map(); // username -> userId

  async register(username: string, password: string): Promise<{ success: boolean; message?: string; token?: string; user?: UserStats }> {
    // Validate input
    if (!username || !password) {
      return { success: false, message: 'Username and password are required' };
    }

    if (username.length < 3 || username.length > 20) {
      return { success: false, message: 'Username must be 3-20 characters' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    // Check if username exists
    const normalizedUsername = username.toLowerCase();
    if (this.usernameIndex.has(normalizedUsername)) {
      return { success: false, message: 'Username already exists' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userId = `user_${Date.now()}_${Math.random()}`;
    const user: User = {
      id: userId,
      username: username,
      passwordHash,
      createdAt: Date.now(),
      wins: 0,
      losses: 0,
      gamesPlayed: 0
    };

    this.users.set(userId, user);
    this.usernameIndex.set(normalizedUsername, userId);

    // Generate token
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

    return {
      success: true,
      token,
      user: this.getUserStats(user)
    };
  }

  async login(username: string, password: string): Promise<{ success: boolean; message?: string; token?: string; user?: UserStats }> {
    // Validate input
    if (!username || !password) {
      return { success: false, message: 'Username and password are required' };
    }

    // Find user
    const normalizedUsername = username.toLowerCase();
    const userId = this.usernameIndex.get(normalizedUsername);

    if (!userId) {
      return { success: false, message: 'Invalid username or password' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return { success: false, message: 'Invalid username or password' };
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    return {
      success: true,
      token,
      user: this.getUserStats(user)
    };
  }

  verifyToken(token: string): { userId: string; username: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserByUsername(username: string): User | undefined {
    const normalizedUsername = username.toLowerCase();
    const userId = this.usernameIndex.get(normalizedUsername);
    return userId ? this.users.get(userId) : undefined;
  }

  updateStats(userId: string, won: boolean): void {
    const user = this.users.get(userId);
    if (!user) return;

    user.gamesPlayed++;
    if (won) {
      user.wins++;
    } else {
      user.losses++;
    }
  }

  private getUserStats(user: User): UserStats {
    return {
      id: user.id,
      username: user.username,
      wins: user.wins,
      losses: user.losses,
      gamesPlayed: user.gamesPlayed
    };
  }

  getAllUserStats(): UserStats[] {
    return Array.from(this.users.values()).map(u => this.getUserStats(u));
  }

  generateResetCode(username: string): { success: boolean; message?: string; resetCode?: string } {
    const normalizedUsername = username.toLowerCase();
    const userId = this.usernameIndex.get(normalizedUsername);

    if (!userId) {
      return { success: false, message: 'Username not found' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'Username not found' };
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Code expires in 15 minutes
    user.resetCode = resetCode;
    user.resetCodeExpiry = Date.now() + 15 * 60 * 1000;

    return {
      success: true,
      message: `Reset code generated: ${resetCode}`,
      resetCode
    };
  }

  async resetPassword(username: string, resetCode: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    if (!username || !resetCode || !newPassword) {
      return { success: false, message: 'All fields are required' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    const normalizedUsername = username.toLowerCase();
    const userId = this.usernameIndex.get(normalizedUsername);

    if (!userId) {
      return { success: false, message: 'Invalid reset code or username' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'Invalid reset code or username' };
    }

    // Check if reset code exists and matches
    if (!user.resetCode || user.resetCode !== resetCode) {
      return { success: false, message: 'Invalid reset code' };
    }

    // Check if code is expired
    if (!user.resetCodeExpiry || Date.now() > user.resetCodeExpiry) {
      return { success: false, message: 'Reset code has expired' };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordHash = passwordHash;

    // Clear reset code
    delete user.resetCode;
    delete user.resetCodeExpiry;

    return {
      success: true,
      message: 'Password reset successful'
    };
  }
}