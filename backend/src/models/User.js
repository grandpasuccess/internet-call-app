require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const pool = require('../db');

const SALT_ROUNDS = 10;

/**
 * User Model - handles user data access and password operations
 */
class User {
  constructor(row) {
    this.id = row.id;
    this.username = row.username;
    this.email = row.email;
    this.passwordHash = row.password_hash;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return new User(result.rows[0]);
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) return null;
    return new User(result.rows[0]);
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) return null;
    return new User(result.rows[0]);
  }

  /**
   * Create a new user with hashed password
   */
  static async create(username, email, plainPassword) {
    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [username, email.toLowerCase(), passwordHash]
    );
    return new User(result.rows[0]);
  }

  /**
   * Update user fields
   */
  async update(fields) {
    const allowedFields = ['username', 'email', 'password_hash'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(this.id);

    const result = await pool.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return new User(result.rows[0]);
  }

  /**
   * Delete user
   */
  async delete() {
    await pool.query('DELETE FROM users WHERE id = $1', [this.id]);
  }

  /**
   * Compare password with stored hash
   */
  async comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  /**
   * Convert to plain object (without sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = User;
