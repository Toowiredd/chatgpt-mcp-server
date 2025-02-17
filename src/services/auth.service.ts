import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

interface User {
  email: string;
  password: string;
  name: string;
}

const users: User[] = [];

export class AuthService {
  async register(user: User): Promise<string> {
    const existingUser = users.find(u => u.email === user.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser = { ...user, password: hashedPassword };
    users.push(newUser);

    return this.generateToken(newUser.email);
  }

  async login(user: { email: string; password: string }): Promise<string> {
    const existingUser = users.find(u => u.email === user.email);
    if (!existingUser) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(user.password, existingUser.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    return this.generateToken(existingUser.email);
  }

  private generateToken(email: string): string {
    return jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  }

  validateToken(token: string): string | object {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
