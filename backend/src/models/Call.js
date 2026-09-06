const pool = require('../db');

/**
 * Call Model - handles call records in PostgreSQL
 */
class Call {
  constructor(row) {
    if (!row) return;
    this.id = row.id;
    this.callerId = row.caller_id;
    this.calleeId = row.callee_id;
    this.startedAt = row.started_at;
    this.endedAt = row.ended_at;
    this.durationSeconds = row.duration_seconds;
    this.status = row.status;
  }

  /**
   * Create a new call record
   */
  static async create(callerId, calleeId) {
    const result = await pool.query(
      `INSERT INTO calls (caller_id, callee_id, status)
       VALUES ($1, $2, 'initiated')
       RETURNING *`,
      [callerId, calleeId]
    );
    return new Call(result.rows[0]);
  }

  /**
   * Find call by ID
   */
  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM calls WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return new Call(result.rows[0]);
  }

  /**
   * Find active calls for a user
   */
  static async findActiveForUser(userId) {
    const result = await pool.query(
      `SELECT * FROM calls
       WHERE (caller_id = $1 OR callee_id = $1)
       AND status NOT IN ('ended', 'rejected')
       ORDER BY started_at DESC`,
      [userId]
    );
    return result.rows.map((row) => new Call(row));
  }

  /**
   * Get call history for a user
   */
  static async getHistory(userId, limit = 50) {
    const result = await pool.query(
      `SELECT * FROM calls
       WHERE caller_id = $1 OR callee_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map((row) => new Call(row));
  }

  /**
   * Update call status
   */
  async updateStatus(status) {
    const result = await pool.query(
      `UPDATE calls SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, this.id]
    );
    return new Call(result.rows[0]);
  }

  /**
   * End the call and calculate duration
   */
  async end() {
    const started = new Date(this.startedAt);
    const ended = new Date();
    const durationSeconds = Math.floor((ended - started) / 1000);

    const result = await pool.query(
      `UPDATE calls
       SET status = 'ended',
           ended_at = $1,
           duration_seconds = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [ended, durationSeconds, this.id]
    );
    return new Call(result.rows[0]);
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      callerId: this.callerId,
      calleeId: this.calleeId,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      durationSeconds: this.durationSeconds,
      status: this.status,
    };
  }
}

module.exports = Call;
