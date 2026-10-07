import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export class PasswordUtil {
  /**
   * Securely hash a plaintext password with bcrypt using 12 salt rounds
   */
  public static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare a plaintext candidate password with an existing bcrypt password hash
   */
  public static async comparePassword(candidatePassword: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, hash);
  }
}

export default PasswordUtil;
