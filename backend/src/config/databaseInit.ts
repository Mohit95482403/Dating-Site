import { pool } from './database';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

/**
 * Connectly Day 2 Complete MySQL Relational Database Initialization
 * Creates all 20 production tables in strict dependency order, sets up
 * foreign keys, unique constraints, performance indexes, and seeds 20 default interests.
 */
export async function initializeDatabase(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    logger.info('[DatabaseInit] Starting database schema verification and migration...');

    // Ensure database uses utf8mb4 encoding
    await connection.query('SET NAMES utf8mb4');

    // 1. users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'moderator', 'admin') DEFAULT 'user',
        status ENUM('active', 'inactive', 'suspended', 'deleted') DEFAULT 'active',
        is_email_verified BOOLEAN DEFAULT FALSE,
        last_login_at DATETIME NULL,
        last_seen_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email),
        INDEX idx_users_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. profiles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NULL,
        date_of_birth DATE NULL,
        gender ENUM('male', 'female', 'non_binary', 'other') NULL,
        bio TEXT NULL,
        occupation VARCHAR(150) NULL,
        education VARCHAR(150) NULL,
        location_city VARCHAR(100) NULL,
        location_state VARCHAR(100) NULL,
        location_country VARCHAR(100) NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        profile_visibility ENUM('public', 'hidden', 'matches_only') DEFAULT 'public',
        is_profile_complete BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_profiles_user_id (user_id),
        INDEX idx_profiles_gender (gender),
        INDEX idx_profiles_dob (date_of_birth)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. preferences table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS preferences (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED UNIQUE NOT NULL,
        min_age INT UNSIGNED DEFAULT 18,
        max_age INT UNSIGNED DEFAULT 100,
        preferred_gender ENUM('all', 'male', 'female', 'non_binary', 'other') DEFAULT 'all',
        max_distance_km INT UNSIGNED DEFAULT 50,
        relationship_goal ENUM('dating', 'long_term', 'friendship', 'casual', 'marriage', 'not_sure') DEFAULT 'not_sure',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_preferences_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_preferences_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. interests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS interests (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_interests_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. user_interests junction table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_interests (
        user_id BIGINT UNSIGNED NOT NULL,
        interest_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, interest_id),
        CONSTRAINT fk_ui_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_ui_interest FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE,
        INDEX idx_ui_user (user_id),
        INDEX idx_ui_interest (interest_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. photos table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT UNSIGNED NOT NULL,
        display_order INT UNSIGNED DEFAULT 0,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_photos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_photos_user (user_id),
        INDEX idx_photos_primary (is_primary)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. likes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        from_user_id BIGINT UNSIGNED NOT NULL,
        to_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_likes_from_to (from_user_id, to_user_id),
        CONSTRAINT fk_likes_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_likes_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_likes_from (from_user_id),
        INDEX idx_likes_to (to_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. passes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS passes (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        from_user_id BIGINT UNSIGNED NOT NULL,
        to_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_passes_from_to (from_user_id, to_user_id),
        CONSTRAINT fk_passes_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_passes_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_passes_from (from_user_id),
        INDEX idx_passes_to (to_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. super_likes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS super_likes (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        from_user_id BIGINT UNSIGNED NOT NULL,
        to_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_super_likes_from_to (from_user_id, to_user_id),
        CONSTRAINT fk_super_likes_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_super_likes_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_super_likes_from (from_user_id),
        INDEX idx_super_likes_to (to_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. matches table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_one_id BIGINT UNSIGNED NOT NULL,
        user_two_id BIGINT UNSIGNED NOT NULL,
        matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('active', 'unmatched', 'blocked') DEFAULT 'active',
        unmatched_by BIGINT UNSIGNED NULL,
        unmatched_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_matches_users (user_one_id, user_two_id),
        CONSTRAINT fk_matches_user_one FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_matches_user_two FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_matches_unmatched_by FOREIGN KEY (unmatched_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_matches_user_one (user_one_id),
        INDEX idx_matches_user_two (user_two_id),
        INDEX idx_matches_status (status),
        INDEX idx_matches_matched_at (matched_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. conversations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        match_id BIGINT UNSIGNED UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_message_at DATETIME NULL,
        CONSTRAINT fk_conversations_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        INDEX idx_conversations_match (match_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. conversation_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS conversation_members (
        conversation_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_read_message_id BIGINT UNSIGNED NULL,
        PRIMARY KEY (conversation_id, user_id),
        CONSTRAINT fk_cm_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_cm_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id BIGINT UNSIGNED NOT NULL,
        message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
        message_text TEXT NULL,
        media_url VARCHAR(500) NULL,
        reply_to_message_id BIGINT UNSIGNED NULL,
        status ENUM('sent', 'delivered', 'read', 'deleted') DEFAULT 'sent',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL,
        INDEX idx_messages_conversation (conversation_id),
        INDEX idx_messages_sender (sender_id),
        INDEX idx_messages_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 14. message_reactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        message_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        reaction VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_reactions_msg_user_reaction (message_id, user_id, reaction),
        CONSTRAINT fk_mr_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        CONSTRAINT fk_mr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_mr_message (message_id),
        INDEX idx_mr_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 15. notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        actor_id BIGINT UNSIGNED NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        reference_type VARCHAR(50) NULL,
        reference_id BIGINT UNSIGNED NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_notifications_user (user_id),
        INDEX idx_notifications_actor (actor_id),
        INDEX idx_notifications_is_read (is_read),
        INDEX idx_notifications_created_at (created_at),
        INDEX idx_notifications_user_is_read (user_id, is_read),
        INDEX idx_notifications_user_created (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 16. blocks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        blocker_id BIGINT UNSIGNED NOT NULL,
        blocked_user_id BIGINT UNSIGNED NOT NULL,
        reason VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_blocks_pair (blocker_id, blocked_user_id),
        CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_blocks_blocker (blocker_id),
        INDEX idx_blocks_blocked (blocked_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 17. reports table (historical record - resolved_by uses SET NULL)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        reporter_id BIGINT UNSIGNED NOT NULL,
        reported_user_id BIGINT UNSIGNED NOT NULL,
        reason VARCHAR(100) NOT NULL,
        description TEXT NULL,
        status ENUM('pending', 'reviewing', 'resolved', 'dismissed') DEFAULT 'pending',
        admin_notes TEXT NULL,
        resolved_by BIGINT UNSIGNED NULL,
        resolved_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_reports_reported FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_reports_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_reports_status (status),
        INDEX idx_reports_reported (reported_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 18. verification_requests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS verification_requests (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        document_url VARCHAR(500) NULL,
        selfie_url VARCHAR(500) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        reviewed_by BIGINT UNSIGNED NULL,
        reviewed_at DATETIME NULL,
        admin_notes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_vr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_vr_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_vr_status (status),
        INDEX idx_vr_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 19. sessions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        refresh_token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked_at DATETIME NULL,
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_sessions_user (user_id),
        INDEX idx_sessions_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 20. audit_logs table (historical compliance record - user_id uses SET NULL)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id BIGINT UNSIGNED NULL,
        description TEXT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_action (action),
        INDEX idx_audit_entity (entity_type, entity_id),
        INDEX idx_audit_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    logger.info('[DatabaseInit] All 20 relational database tables verified successfully.');

    // Ensure matches.matched_at index exists on existing installations
    try {
      const [idxRows] = await connection.query(
        "SHOW INDEX FROM matches WHERE Key_name = 'idx_matches_matched_at'"
      );
      if ((idxRows as any[]).length === 0) {
        await connection.query('CREATE INDEX idx_matches_matched_at ON matches (matched_at)');
        logger.info('[DatabaseInit] Created index idx_matches_matched_at on matches table.');
      }
    } catch {
      // index check fallback
    }

    // Ensure messages(conversation_id, created_at) index exists for fast pagination
    try {
      const [idxConvMsg] = await connection.query(
        "SHOW INDEX FROM messages WHERE Key_name = 'idx_messages_conv_created'"
      );
      if ((idxConvMsg as any[]).length === 0) {
        await connection.query('CREATE INDEX idx_messages_conv_created ON messages (conversation_id, created_at)');
        logger.info('[DatabaseInit] Created index idx_messages_conv_created on messages table.');
      }
    } catch {
      // index check fallback
    }

    // Ensure users table has last_seen_at column
    try {
      const [colLastSeen] = await connection.query("SHOW COLUMNS FROM users LIKE 'last_seen_at'");
      if ((colLastSeen as any[]).length === 0) {
        await connection.query('ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL AFTER last_login_at');
        logger.info('[DatabaseInit] Added last_seen_at column to users table.');
      }
    } catch {
      // column check fallback
    }

    // Ensure message_reactions has unique constraint per user per message
    try {
      const [idxReaction] = await connection.query(
        "SHOW INDEX FROM message_reactions WHERE Key_name = 'uk_reactions_msg_user'"
      );
      if ((idxReaction as any[]).length === 0) {
        await connection.query('ALTER TABLE message_reactions ADD UNIQUE KEY uk_reactions_msg_user (message_id, user_id)');
        logger.info('[DatabaseInit] Created unique index uk_reactions_msg_user on message_reactions table.');
      }
    } catch {
      // index check fallback
    }

    // Day 14: Ensure notifications table has actor_id, read_at, VARCHAR type, and composite indexes
    try {
      const [colActor] = await connection.query("SHOW COLUMNS FROM notifications LIKE 'actor_id'");
      if ((colActor as any[]).length === 0) {
        await connection.query(`
          ALTER TABLE notifications 
          ADD COLUMN actor_id BIGINT UNSIGNED NULL AFTER user_id,
          ADD CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        logger.info('[DatabaseInit] Added actor_id column and foreign key to notifications table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] actor_id migration warning:', err);
    }

    try {
      const [colReadAt] = await connection.query("SHOW COLUMNS FROM notifications LIKE 'read_at'");
      if ((colReadAt as any[]).length === 0) {
        await connection.query('ALTER TABLE notifications ADD COLUMN read_at DATETIME NULL AFTER is_read');
        logger.info('[DatabaseInit] Added read_at column to notifications table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] read_at migration warning:', err);
    }

    try {
      // Modernize type column to VARCHAR(50) so all event types (UPPERCASE and lowercase) work smoothly
      await connection.query('ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL');
      logger.info('[DatabaseInit] Ensured notifications.type is VARCHAR(50).');
    } catch (err) {
      logger.warn('[DatabaseInit] notifications.type modify warning:', err);
    }

    try {
      const [idxUserRead] = await connection.query(
        "SHOW INDEX FROM notifications WHERE Key_name = 'idx_notifications_user_is_read'"
      );
      if ((idxUserRead as any[]).length === 0) {
        await connection.query('CREATE INDEX idx_notifications_user_is_read ON notifications (user_id, is_read)');
        logger.info('[DatabaseInit] Created index idx_notifications_user_is_read on notifications table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] idx_notifications_user_is_read warning:', err);
    }

    try {
      const [idxUserCreated] = await connection.query(
        "SHOW INDEX FROM notifications WHERE Key_name = 'idx_notifications_user_created'"
      );
      if ((idxUserCreated as any[]).length === 0) {
        await connection.query('CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at)');
        logger.info('[DatabaseInit] Created index idx_notifications_user_created on notifications table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] idx_notifications_user_created warning:', err);
    }

    // Day 15: Ensure users table has username column
    try {
      const [colUsername] = await connection.query("SHOW COLUMNS FROM users LIKE 'username'");
      if ((colUsername as any[]).length === 0) {
        await connection.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL UNIQUE AFTER email');
        logger.info('[DatabaseInit] Added username column to users table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] username migration warning:', err);
    }

    // Day 15: Create user_settings table for account, privacy, discovery & notification preferences
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED UNIQUE NOT NULL,
          profile_visibility ENUM('public', 'hidden', 'matches_only') DEFAULT 'public',
          show_online_status BOOLEAN DEFAULT TRUE,
          show_last_seen BOOLEAN DEFAULT TRUE,
          show_read_receipts BOOLEAN DEFAULT TRUE,
          show_typing_indicator BOOLEAN DEFAULT TRUE,
          show_in_discovery BOOLEAN DEFAULT TRUE,
          use_location_for_discovery BOOLEAN DEFAULT TRUE,
          notify_matches BOOLEAN DEFAULT TRUE,
          notify_messages BOOLEAN DEFAULT TRUE,
          notify_likes BOOLEAN DEFAULT TRUE,
          notify_super_likes BOOLEAN DEFAULT TRUE,
          notify_reactions BOOLEAN DEFAULT TRUE,
          notify_system BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_settings_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified user_settings table.');
    } catch (err) {
      logger.warn('[DatabaseInit] user_settings migration warning:', err);
    }

    // Day 15: Ensure blocks table has blocker_created index
    try {
      const [idxBlocks] = await connection.query(
        "SHOW INDEX FROM blocks WHERE Key_name = 'idx_blocks_blocker_created'"
      );
      if ((idxBlocks as any[]).length === 0) {
        await connection.query('CREATE INDEX idx_blocks_blocker_created ON blocks (blocker_id, created_at)');
        logger.info('[DatabaseInit] Created index idx_blocks_blocker_created on blocks table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] idx_blocks_blocker_created warning:', err);
    }

    // Day 16: Ensure profiles table has is_verified column
    try {
      const [colVerified] = await connection.query("SHOW COLUMNS FROM profiles LIKE 'is_verified'");
      if ((colVerified as any[]).length === 0) {
        await connection.query('ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER is_profile_complete');
        logger.info('[DatabaseInit] Added is_verified column to profiles table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] is_verified migration warning:', err);
    }

    // Day 16: Ensure verification_requests table supports rejection_reason and flexible document storage
    try {
      const [colRejection] = await connection.query("SHOW COLUMNS FROM verification_requests LIKE 'rejection_reason'");
      if ((colRejection as any[]).length === 0) {
        await connection.query('ALTER TABLE verification_requests ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER admin_notes');
        logger.info('[DatabaseInit] Added rejection_reason column to verification_requests table.');
      }
    } catch (err) {
      logger.warn('[DatabaseInit] rejection_reason migration warning:', err);
    }

    try {
      await connection.query('ALTER TABLE verification_requests MODIFY COLUMN selfie_url VARCHAR(500) NULL');
    } catch (err) {
      // column modification fallback
    }

    // Day 16: Create profile_prompts and user_profile_prompts tables
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS profile_prompts (
          id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          prompt_text VARCHAR(255) NOT NULL UNIQUE,
          category VARCHAR(50) DEFAULT 'general',
          display_order INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_profile_prompts (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          prompt_id INT UNSIGNED NOT NULL,
          answer TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_user_prompt (user_id, prompt_id),
          CONSTRAINT fk_upp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_upp_prompt FOREIGN KEY (prompt_id) REFERENCES profile_prompts(id) ON DELETE CASCADE,
          INDEX idx_upp_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified profile_prompts and user_profile_prompts tables.');
    } catch (err) {
      logger.warn('[DatabaseInit] profile_prompts table error:', err);
    }

    // Day 17: Update users.status to include 'banned'
    try {
      await connection.query(
        "ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'banned', 'deleted') DEFAULT 'active'"
      );
    } catch (err) {
      // fallback if already modified
    }

    // Day 17: Update reports.status to include 'under_review'
    try {
      await connection.query(
        "ALTER TABLE reports MODIFY COLUMN status ENUM('pending', 'under_review', 'reviewing', 'resolved', 'dismissed') DEFAULT 'pending'"
      );
    } catch (err) {
      // fallback if already modified
    }

    // Day 17: Create moderation_actions table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS moderation_actions (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          admin_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          action ENUM('SUSPEND', 'UNSUSPEND', 'BAN', 'UNBAN', 'VERIFY', 'REJECT_VERIFICATION', 'DISMISS_REPORT', 'WARN') NOT NULL,
          reason VARCHAR(255) NOT NULL,
          metadata JSON NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_mod_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_mod_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_mod_admin (admin_id),
          INDEX idx_mod_user (user_id),
          INDEX idx_mod_action (action),
          INDEX idx_mod_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified moderation_actions table.');
    } catch (err) {
      logger.warn('[DatabaseInit] moderation_actions table error:', err);
    }

    // Day 19: Create calls table for WebRTC Audio & Video Calling
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS calls (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          match_id BIGINT UNSIGNED NOT NULL,
          conversation_id BIGINT UNSIGNED NULL,
          caller_id BIGINT UNSIGNED NOT NULL,
          receiver_id BIGINT UNSIGNED NOT NULL,
          call_type ENUM('audio', 'video') NOT NULL,
          status ENUM('ringing', 'accepted', 'rejected', 'cancelled', 'ended', 'missed', 'failed', 'busy') DEFAULT 'ringing',
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          answered_at DATETIME NULL,
          ended_at DATETIME NULL,
          duration INT UNSIGNED DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_calls_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
          CONSTRAINT fk_calls_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
          CONSTRAINT fk_calls_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_calls_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_calls_match (match_id),
          INDEX idx_calls_conversation (conversation_id),
          INDEX idx_calls_caller (caller_id),
          INDEX idx_calls_receiver (receiver_id),
          INDEX idx_calls_status (status),
          INDEX idx_calls_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified calls table for Day 19 WebRTC Calling.');
    } catch (err) {
      logger.warn('[DatabaseInit] calls table migration warning:', err);
    }

    // Day 20: Create ai_usage_logs table for AI feature monitoring
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          feature ENUM('compatibility', 'profile_insights', 'bio_improvement', 'conversation_suggestions', 'conversation_starter') NOT NULL,
          tokens_used INT UNSIGNED DEFAULT 0,
          latency_ms INT UNSIGNED DEFAULT 0,
          status ENUM('success', 'fallback', 'error') DEFAULT 'success',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_ai_user (user_id),
          INDEX idx_ai_feature (feature),
          INDEX idx_ai_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified ai_usage_logs table for Day 20 AI System.');
    } catch (err) {
      logger.warn('[DatabaseInit] ai_usage_logs table migration warning:', err);
    }

    // Day 21: Create subscription_plans table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT NULL,
          price_inr INT UNSIGNED NOT NULL DEFAULT 0,
          currency VARCHAR(10) DEFAULT 'INR',
          duration_days INT UNSIGNED DEFAULT 30,
          features JSON NOT NULL,
          limits JSON NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          display_order INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_plans_code (code),
          INDEX idx_plans_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified subscription_plans table for Day 21.');
    } catch (err) {
      logger.warn('[DatabaseInit] subscription_plans table migration warning:', err);
    }

    // Day 21: Create subscriptions table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          plan_id BIGINT UNSIGNED NOT NULL,
          status ENUM('active', 'cancelled', 'expired', 'pending', 'past_due') DEFAULT 'active',
          provider VARCHAR(50) DEFAULT 'system',
          provider_subscription_id VARCHAR(255) NULL,
          provider_order_id VARCHAR(255) NULL,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NULL,
          cancelled_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
          INDEX idx_sub_user (user_id),
          INDEX idx_sub_status (status),
          INDEX idx_sub_expires (expires_at),
          INDEX idx_sub_prov_sub (provider_subscription_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified subscriptions table for Day 21.');
    } catch (err) {
      logger.warn('[DatabaseInit] subscriptions table migration warning:', err);
    }

    // Day 21: Create payment_transactions table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          subscription_id BIGINT UNSIGNED NULL,
          plan_id BIGINT UNSIGNED NOT NULL,
          provider VARCHAR(50) NOT NULL,
          provider_payment_id VARCHAR(255) UNIQUE NOT NULL,
          provider_order_id VARCHAR(255) NULL,
          amount INT UNSIGNED NOT NULL,
          currency VARCHAR(10) DEFAULT 'INR',
          status ENUM('success', 'pending', 'failed', 'refunded') DEFAULT 'pending',
          signature VARCHAR(255) NULL,
          metadata JSON NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_tx_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
          INDEX idx_tx_user (user_id),
          INDEX idx_tx_status (status),
          INDEX idx_tx_prov_pay (provider_payment_id),
          INDEX idx_tx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified payment_transactions table for Day 21.');
    } catch (err) {
      logger.warn('[DatabaseInit] payment_transactions table migration warning:', err);
    }

    // Day 21: Create profile_boosts table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS profile_boosts (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
          multiplier DECIMAL(3, 1) DEFAULT 2.5,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_boost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_boost_user (user_id),
          INDEX idx_boost_status (status),
          INDEX idx_boost_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified profile_boosts table for Day 21.');
    } catch (err) {
      logger.warn('[DatabaseInit] profile_boosts table migration warning:', err);
    }

    // Day 21: Create feature_usage table for daily quota tracking
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS feature_usage (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          feature_key ENUM('likes', 'super_likes', 'boosts', 'ai_requests') NOT NULL,
          usage_count INT UNSIGNED DEFAULT 0,
          window_date DATE NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_user_feat_date (user_id, feature_key, window_date),
          CONSTRAINT fk_fu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_fu_user_date (user_id, window_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      logger.info('[DatabaseInit] Verified feature_usage table for Day 21.');
    } catch (err) {
      logger.warn('[DatabaseInit] feature_usage table migration warning:', err);
    }

    // Day 21: Seed subscription plans idempotently
    await seedInitialSubscriptionPlans(connection);

    // Day 22: Create Social Feed tables (posts, comments, bookmarks, stories, content reports)
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          content TEXT,
          media_url VARCHAR(500),
          media_type ENUM('image','video') DEFAULT NULL,
          visibility ENUM('public','matches_only','private') DEFAULT 'public',
          status ENUM('active','hidden','removed','flagged') DEFAULT 'active',
          likes_count INT UNSIGNED DEFAULT 0,
          comments_count INT UNSIGNED DEFAULT 0,
          bookmarks_count INT UNSIGNED DEFAULT 0,
          shares_count INT UNSIGNED DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_posts_user (user_id),
          INDEX idx_posts_status_created (status, created_at),
          INDEX idx_posts_visibility (visibility)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          post_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_pl_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_post_like (post_id, user_id),
          INDEX idx_post_likes_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          post_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          parent_id BIGINT UNSIGNED DEFAULT NULL,
          content TEXT NOT NULL,
          likes_count INT UNSIGNED DEFAULT 0,
          status ENUM('active','hidden','removed') DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_pc_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          CONSTRAINT fk_pc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_pc_parent FOREIGN KEY (parent_id) REFERENCES post_comments(id) ON DELETE CASCADE,
          INDEX idx_comments_post (post_id, created_at),
          INDEX idx_comments_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS comment_likes (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          comment_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_cl_comment FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
          CONSTRAINT fk_cl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_comment_like (comment_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS post_bookmarks (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          post_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_pb_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          CONSTRAINT fk_pb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_post_bookmark (post_id, user_id),
          INDEX idx_bookmarks_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS stories (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          media_url VARCHAR(500) NOT NULL,
          media_type ENUM('image','video') DEFAULT 'image',
          caption VARCHAR(500),
          views_count INT UNSIGNED DEFAULT 0,
          reactions_count INT UNSIGNED DEFAULT 0,
          status ENUM('active','expired','removed') DEFAULT 'active',
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_stories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_stories_user (user_id),
          INDEX idx_stories_active (status, expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS story_views (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          story_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_sv_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
          CONSTRAINT fk_sv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_story_view (story_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS story_reactions (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          story_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          reaction VARCHAR(10) NOT NULL DEFAULT '❤️',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_sr_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
          CONSTRAINT fk_sr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_story_reaction (story_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS content_reports (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          reporter_id BIGINT UNSIGNED NOT NULL,
          target_type ENUM('post','comment','story') NOT NULL,
          target_id BIGINT UNSIGNED NOT NULL,
          reason VARCHAR(100) NOT NULL,
          description TEXT,
          status ENUM('pending','reviewed','actioned','dismissed') DEFAULT 'pending',
          reviewed_by BIGINT UNSIGNED DEFAULT NULL,
          reviewed_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_cr_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_cr_status (status),
          INDEX idx_cr_target (target_type, target_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      logger.info('[DatabaseInit] Verified Day 22 Social Feed tables (posts, comments, bookmarks, stories, content_reports).');
    } catch (err) {
      logger.warn('[DatabaseInit] Day 22 tables migration warning:', err);
    }

    // Day 23: Explore, Global Search, Search History, Hashtags & Content Discovery
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS search_history (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          query VARCHAR(255) NOT NULL,
          search_type ENUM('all', 'people', 'posts', 'stories', 'hashtags', 'interests') DEFAULT 'all',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_sh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_sh_user_created (user_id, created_at DESC),
          INDEX idx_sh_query (query)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS hashtags (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) UNIQUE NOT NULL,
          posts_count INT UNSIGNED DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_hashtags_name (name),
          INDEX idx_hashtags_posts_count (posts_count DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS post_hashtags (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          post_id BIGINT UNSIGNED NOT NULL,
          hashtag_id BIGINT UNSIGNED NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_ph_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          CONSTRAINT fk_ph_hashtag FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE,
          UNIQUE KEY uq_post_hashtag (post_id, hashtag_id),
          INDEX idx_ph_hashtag (hashtag_id, created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Idempotently extract hashtags from existing posts into hashtags & post_hashtags
      await backfillHashtags(connection);

      logger.info('[DatabaseInit] Verified Day 23 Explore & Global Search tables (search_history, hashtags, post_hashtags).');
    } catch (err) {
      logger.warn('[DatabaseInit] Day 23 tables migration warning:', err);
    }

    // Day 24: Communities, Groups, Events, Membership, RSVPs, Group Chat & Moderation
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_categories (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) UNIQUE NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          description VARCHAR(255) NULL,
          icon VARCHAR(50) DEFAULT 'Users',
          display_order INT UNSIGNED DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_cc_slug (slug),
          INDEX idx_cc_order (display_order, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS communities (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(150) NOT NULL,
          slug VARCHAR(150) UNIQUE NOT NULL,
          description TEXT NULL,
          category_id BIGINT UNSIGNED NOT NULL,
          cover_image VARCHAR(500) NULL,
          avatar_image VARCHAR(500) NULL,
          creator_id BIGINT UNSIGNED NOT NULL,
          visibility ENUM('public', 'private') DEFAULT 'public',
          join_policy ENUM('open', 'request_to_join', 'invite_only') DEFAULT 'open',
          status ENUM('active', 'suspended', 'archived') DEFAULT 'active',
          posting_permission ENUM('all_members', 'moderators_only', 'admins_only') DEFAULT 'all_members',
          event_permission ENUM('all_members', 'admins_and_moderators', 'admins_only') DEFAULT 'admins_and_moderators',
          member_count INT UNSIGNED DEFAULT 1,
          post_count INT UNSIGNED DEFAULT 0,
          event_count INT UNSIGNED DEFAULT 0,
          is_boosted BOOLEAN DEFAULT FALSE,
          boost_expires_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_comm_category FOREIGN KEY (category_id) REFERENCES community_categories(id) ON DELETE RESTRICT,
          CONSTRAINT fk_comm_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_comm_slug (slug),
          INDEX idx_comm_category (category_id),
          INDEX idx_comm_visibility_status (visibility, status),
          INDEX idx_comm_member_count (member_count DESC),
          INDEX idx_comm_created (created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_members (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          role ENUM('owner', 'admin', 'moderator', 'member') DEFAULT 'member',
          status ENUM('active', 'pending', 'banned', 'rejected') DEFAULT 'active',
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_cmemb_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          CONSTRAINT fk_cmemb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uk_community_user (community_id, user_id),
          INDEX idx_cmemb_user (user_id, status),
          INDEX idx_cmemb_role (community_id, role, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Add community_id to posts table if missing
      const [colRows] = await connection.query("SHOW COLUMNS FROM posts LIKE 'community_id'");
      if ((colRows as any[]).length === 0) {
        await connection.query(`
          ALTER TABLE posts 
          ADD COLUMN community_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER user_id,
          ADD INDEX idx_posts_community (community_id, status, created_at DESC)
        `);
      }

      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_events (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          creator_id BIGINT UNSIGNED NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT NULL,
          cover_image VARCHAR(500) NULL,
          event_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NULL,
          location_type ENUM('online', 'in_person', 'hybrid') DEFAULT 'in_person',
          location_name VARCHAR(255) NULL,
          location_visibility ENUM('public', 'members_only') DEFAULT 'public',
          max_attendees INT UNSIGNED DEFAULT 0,
          attendees_count INT UNSIGNED DEFAULT 0,
          status ENUM('scheduled', 'active', 'cancelled', 'completed') DEFAULT 'scheduled',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_cevent_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          CONSTRAINT fk_cevent_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_cevent_comm_date (community_id, event_date, status),
          INDEX idx_cevent_date (event_date, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_event_rsvps (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          event_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          status ENUM('going', 'interested', 'not_going') DEFAULT 'going',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_cersvp_event FOREIGN KEY (event_id) REFERENCES community_events(id) ON DELETE CASCADE,
          CONSTRAINT fk_cersvp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uk_event_user_rsvp (event_id, user_id),
          INDEX idx_cersvp_user (user_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_messages (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          sender_id BIGINT UNSIGNED NOT NULL,
          content TEXT NOT NULL,
          media_url VARCHAR(500) NULL,
          media_type ENUM('image', 'video', 'file') DEFAULT NULL,
          status ENUM('active', 'deleted') DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_cmsg_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          CONSTRAINT fk_cmsg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_cmsg_comm_created (community_id, created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_invites (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          inviter_id BIGINT UNSIGNED NOT NULL,
          invitee_id BIGINT UNSIGNED NOT NULL,
          status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_cinv_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          CONSTRAINT fk_cinv_inviter FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_cinv_invitee FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uk_cinv_comm_invitee (community_id, invitee_id, status),
          INDEX idx_cinv_invitee (invitee_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_moderation_logs (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          moderator_id BIGINT UNSIGNED NOT NULL,
          target_type ENUM('member', 'post', 'comment', 'event', 'message') NOT NULL,
          target_id BIGINT UNSIGNED NOT NULL,
          action VARCHAR(50) NOT NULL,
          reason VARCHAR(255) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_cmod_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          CONSTRAINT fk_cmod_moderator FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_cmod_comm_created (community_id, created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS community_reports (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          reporter_id BIGINT UNSIGNED NOT NULL,
          target_type ENUM('community', 'post', 'comment', 'event', 'member', 'message') NOT NULL,
          target_id BIGINT UNSIGNED NOT NULL,
          reason VARCHAR(100) NOT NULL,
          description TEXT,
          status ENUM('pending', 'reviewed', 'actioned', 'dismissed') DEFAULT 'pending',
          reviewed_by BIGINT UNSIGNED DEFAULT NULL,
          reviewed_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_crep_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          CONSTRAINT fk_crep_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_crep_status (status),
          INDEX idx_crep_comm (community_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Seed initial categories
      await seedCommunityCategories(connection);

      logger.info('[DatabaseInit] Verified Day 24 Communities tables & seeded categories.');
    } catch (err) {
      logger.warn('[DatabaseInit] Day 24 tables migration warning:', err);
    }

    // Day 18: Performance Indexes for Analytics Aggregations
    try {
      const ensureIndex = async (table: string, indexName: string, columnDef: string) => {
        const [rows] = await connection.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
        if ((rows as any[]).length === 0) {
          await connection.query(`CREATE INDEX ${indexName} ON ${table} (${columnDef})`);
          logger.info(`[DatabaseInit] Created index ${indexName} on ${table}.`);
        }
      };

      await ensureIndex('users', 'idx_users_created_at', 'created_at');
      await ensureIndex('users', 'idx_users_last_seen', 'last_seen_at');
      await ensureIndex('likes', 'idx_likes_created_at', 'created_at');
      await ensureIndex('reports', 'idx_reports_created_at', 'created_at');
      await ensureIndex('verification_requests', 'idx_vr_created_at', 'created_at');
      await ensureIndex('conversations', 'idx_conversations_created_at', 'created_at');
    } catch (err) {
      logger.warn('[DatabaseInit] Analytics indexes migration warning:', err);
    }

    // Seed 20 initial interests idempotently (no duplicates)
    await seedInitialInterests(connection);

    // Seed 10 engaging profile prompts
    await seedInitialPrompts(connection);

    // Day 17: Seed default admin user idempotently
    await seedInitialAdmin(connection);

    // Day 21: Seed subscription plans
    await seedInitialSubscriptionPlans(connection);

    // Day 24: Seed community categories (reference taxonomy only, no sample communities)
    await seedCommunityCategories(connection);

    // Day 25: Trust, Safety, Identity Verification & Anti-Abuse
    await initDay25TrustSafety(connection);

    // Day 26: AI Personalization, Recommendation Intelligence & Behavioral Learning
    await initDay26Personalization(connection);

    logger.info('[DatabaseInit] Database schema initialization completed successfully.');
  } catch (error) {
    logger.error('[DatabaseInit] Database initialization failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Idempotently seed default admin account
 */
async function seedInitialAdmin(connection: any): Promise<void> {
  try {
    const [adminRows] = await connection.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if ((adminRows as any[]).length === 0) {
      const passwordHash = await bcrypt.hash('AdminPass123!', 10);
      const [insertResult] = await connection.query(
        `INSERT INTO users (email, password_hash, role, status, is_email_verified)
         VALUES ('admin@connectly.com', ?, 'admin', 'active', TRUE)`,
        [passwordHash]
      );
      const adminId = (insertResult as any).insertId;

      await connection.query(
        `INSERT INTO profiles (user_id, first_name, last_name, bio, occupation, location_city, location_country, is_profile_complete, is_verified)
         VALUES (?, 'Admin', 'Connectly', 'Connectly Platform Administrator & Safety Moderator', 'System Administrator', 'Mumbai', 'India', TRUE, TRUE)
         ON DUPLICATE KEY UPDATE is_verified = TRUE`,
        [adminId]
      );

      logger.info(`[DatabaseInit] Successfully seeded initial admin account: admin@connectly.com (ID: ${adminId})`);
    }
  } catch (err) {
    logger.warn('[DatabaseInit] seedInitialAdmin warning:', err);
  }
}

/**
 * Idempotently seed 10 engaging profile prompts
 */
async function seedInitialPrompts(connection: any): Promise<void> {
  const initialPrompts: Array<{ prompt_text: string; category: string; display_order: number }> = [
    { prompt_text: 'A perfect weekend for me is...', category: 'lifestyle', display_order: 1 },
    { prompt_text: 'My ideal travel destination is...', category: 'travel', display_order: 2 },
    { prompt_text: 'One thing you should know about me...', category: 'about', display_order: 3 },
    { prompt_text: 'My hidden talent is...', category: 'quirks', display_order: 4 },
    { prompt_text: 'I am happiest when...', category: 'lifestyle', display_order: 5 },
    { prompt_text: "The best advice I've ever received...", category: 'values', display_order: 6 },
    { prompt_text: 'My simple pleasures in life...', category: 'lifestyle', display_order: 7 },
    { prompt_text: "We'll get along if...", category: 'relationship', display_order: 8 },
    { prompt_text: 'A random fact I love is...', category: 'quirks', display_order: 9 },
    { prompt_text: 'My favorite comfort food is...', category: 'food', display_order: 10 }
  ];

  for (const item of initialPrompts) {
    await connection.query(
      `INSERT INTO profile_prompts (prompt_text, category, display_order)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE category = VALUES(category), display_order = VALUES(display_order)`,
      [item.prompt_text, item.category, item.display_order]
    );
  }

  logger.info(`[DatabaseInit] Verified ${initialPrompts.length} seed profile prompts.`);
}

/**
 * Idempotently seed 20 initial lifestyle and hobby interests
 */
async function seedInitialInterests(connection: any): Promise<void> {
  const initialInterests: Array<{ name: string; slug: string }> = [
    { name: 'Travel', slug: 'travel' },
    { name: 'Music', slug: 'music' },
    { name: 'Photography', slug: 'photography' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Fitness', slug: 'fitness' },
    { name: 'Movies', slug: 'movies' },
    { name: 'Reading', slug: 'reading' },
    { name: 'Cooking', slug: 'cooking' },
    { name: 'Technology', slug: 'technology' },
    { name: 'Art', slug: 'art' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Nature', slug: 'nature' },
    { name: 'Dancing', slug: 'dancing' },
    { name: 'Food', slug: 'food' },
    { name: 'Business', slug: 'business' },
    { name: 'Entrepreneurship', slug: 'entrepreneurship' },
    { name: 'Coding', slug: 'coding' },
    { name: 'Fashion', slug: 'fashion' },
    { name: 'Volunteering', slug: 'volunteering' },
    { name: 'Adventure', slug: 'adventure' }
  ];

  for (const item of initialInterests) {
    await connection.query(
      `INSERT INTO interests (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [item.name, item.slug]
    );
  }

  logger.info(`[DatabaseInit] Verified ${initialInterests.length} seed interests.`);
}

/**
 * Idempotently seed default Day 21 subscription plans (Free, Premium, Premium Plus)
 */
async function seedInitialSubscriptionPlans(connection: any): Promise<void> {
  const initialPlans = [
    {
      code: 'FREE',
      name: 'Connectly Free',
      description: 'Core dating & social discovery with essential matching and messaging',
      price_inr: 0,
      currency: 'INR',
      duration_days: 0,
      features: JSON.stringify(['BASIC_MATCHING', 'TEXT_CHAT', 'AUDIO_VIDEO_CALLS']),
      limits: JSON.stringify({ dailyLikes: 25, dailySuperLikes: 1, dailyAiRequests: 5, monthlyBoosts: 0 }),
      is_active: true,
      display_order: 1,
    },
    {
      code: 'PREMIUM',
      name: 'Connectly Premium',
      description: 'Unlimited likes, see who liked you, monthly profile boost, and advanced AI matching',
      price_inr: 499,
      currency: 'INR',
      duration_days: 30,
      features: JSON.stringify([
        'BASIC_MATCHING',
        'TEXT_CHAT',
        'AUDIO_VIDEO_CALLS',
        'UNLIMITED_LIKES',
        'SEE_WHO_LIKED',
        'ADVANCED_FILTERS',
        'PROFILE_BOOST',
        'PREMIUM_AI',
        'PREMIUM_BADGE',
        'ADVANCED_COMPATIBILITY',
      ]),
      limits: JSON.stringify({ dailyLikes: -1, dailySuperLikes: 5, dailyAiRequests: 35, monthlyBoosts: 1 }),
      is_active: true,
      display_order: 2,
    },
    {
      code: 'PREMIUM_PLUS',
      name: 'Connectly VIP Premium+',
      description: 'Maximum attraction: priority discovery ranking, unlimited AI intelligence, and VIP prestige',
      price_inr: 799,
      currency: 'INR',
      duration_days: 30,
      features: JSON.stringify([
        'BASIC_MATCHING',
        'TEXT_CHAT',
        'AUDIO_VIDEO_CALLS',
        'UNLIMITED_LIKES',
        'SEE_WHO_LIKED',
        'ADVANCED_FILTERS',
        'PROFILE_BOOST',
        'PREMIUM_AI',
        'PREMIUM_BADGE',
        'ADVANCED_COMPATIBILITY',
        'PRIORITY_DISCOVERY',
        'UNLIMITED_AI',
      ]),
      limits: JSON.stringify({ dailyLikes: -1, dailySuperLikes: 15, dailyAiRequests: -1, monthlyBoosts: 3 }),
      is_active: true,
      display_order: 3,
    },
  ];

  for (const plan of initialPlans) {
    await connection.query(
      `INSERT INTO subscription_plans (code, name, description, price_inr, currency, duration_days, features, limits, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         description = VALUES(description),
         price_inr = VALUES(price_inr),
         features = VALUES(features),
         limits = VALUES(limits),
         is_active = VALUES(is_active),
         display_order = VALUES(display_order)`,
      [
        plan.code,
        plan.name,
        plan.description,
        plan.price_inr,
        plan.currency,
        plan.duration_days,
        plan.features,
        plan.limits,
        plan.is_active,
        plan.display_order,
      ]
    );
  }

  logger.info(`[DatabaseInit] Verified ${initialPlans.length} seed subscription plans.`);
}

/**
 * Idempotently extracts and indexes hashtags from existing posts into hashtags and post_hashtags tables
 */
async function backfillHashtags(connection: any): Promise<void> {
  try {
    const [posts] = await connection.query(
      `SELECT id, content FROM posts WHERE content LIKE '%#%' AND status = 'active'`
    );
    if (!Array.isArray(posts) || posts.length === 0) {
      return;
    }

    const hashtagRegex = /#([a-zA-Z0-9_\u00c0-\u024f]+)/g;
    for (const post of posts as any[]) {
      if (!post.content) continue;
      const matches = post.content.match(hashtagRegex);
      if (!matches) continue;

      const uniqueTags = Array.from(new Set(matches.map((t: string) => t.slice(1).toLowerCase()))).filter(Boolean);
      for (const tag of uniqueTags) {
        // Upsert hashtag
        await connection.query(
          `INSERT INTO hashtags (name, posts_count) VALUES (?, 1)
           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [tag]
        );
        const [tagRows] = await connection.query(`SELECT id FROM hashtags WHERE name = ? LIMIT 1`, [tag]);
        const hashtagId = (tagRows as any[])[0]?.id;
        if (hashtagId) {
          await connection.query(
            `INSERT IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)`,
            [post.id, hashtagId]
          );
        }
      }
    }

    // Recount posts_count accurately
    await connection.query(`
      UPDATE hashtags h
      SET posts_count = (
        SELECT COUNT(DISTINCT ph.post_id) 
        FROM post_hashtags ph 
        INNER JOIN posts p ON ph.post_id = p.id 
        WHERE ph.hashtag_id = h.id AND p.status = 'active'
      )
    `);

    logger.info(`[DatabaseInit] Synced hashtags index from existing posts.`);
  } catch (err) {
    logger.warn('[DatabaseInit] backfillHashtags warning:', err);
  }
}

/**
 * Idempotently seed default community categories
 */
async function seedCommunityCategories(connection: any): Promise<void> {
  try {
    const initialCategories = [
      { name: 'Travel & Exploration', slug: 'travel', description: 'Road trips, weekend getaways, and global adventures', icon: 'Compass', display_order: 1 },
      { name: 'Fitness & Wellness', slug: 'fitness-wellness', description: 'Gym workouts, yoga, running, and holistic healthy living', icon: 'Dumbbell', display_order: 2 },
      { name: 'Tech & Startups', slug: 'tech-startups', description: 'Software engineering, AI, product design, and entrepreneurial journeys', icon: 'Code', display_order: 3 },
      { name: 'Food & Dining', slug: 'food-dining', description: 'Foodies, home cooking, local cafes, and culinary exploration', icon: 'Utensils', display_order: 4 },
      { name: 'Music & Concerts', slug: 'music-concerts', description: 'Live gigs, indie music, musicians, and concert companions', icon: 'Music', display_order: 5 },
      { name: 'Photography & Art', slug: 'photography-art', description: 'Street photography, portraits, visual arts, and gallery visits', icon: 'Camera', display_order: 6 },
      { name: 'Gaming & Esports', slug: 'gaming-esports', description: 'PC, console, multiplayer gaming, and competitive esports', icon: 'Gamepad2', display_order: 7 },
      { name: 'Books & Literature', slug: 'books-literature', description: 'Book clubs, fiction discussions, poetry, and reading buddies', icon: 'BookOpen', display_order: 8 },
      { name: 'Outdoors & Trekking', slug: 'outdoors-trekking', description: 'Hiking, mountain treks, nature photography, and camping', icon: 'Mountain', display_order: 9 },
      { name: 'Lifestyle & Social', slug: 'lifestyle-social', description: 'Casual weekend meetups, dating talks, and social mixers', icon: 'Coffee', display_order: 10 },
    ];

    for (const cat of initialCategories) {
      await connection.query(
        `INSERT INTO community_categories (name, slug, description, icon, display_order, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE 
           name = VALUES(name),
           description = VALUES(description),
           icon = VALUES(icon),
           display_order = VALUES(display_order)`,
        [cat.name, cat.slug, cat.description, cat.icon, cat.display_order]
      );
    }
    logger.info(`[DatabaseInit] Verified ${initialCategories.length} community categories.`);
  } catch (err) {
    logger.warn('[DatabaseInit] seedCommunityCategories warning:', err);
  }
}


/**
 * Day 25: Initialize Trust, Safety, Identity Verification, Privacy & Anti-Abuse
 */
async function initDay25TrustSafety(connection: any): Promise<void> {
  try {
    // 1. user_security_events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_security_events (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        event_type VARCHAR(60) NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        details JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_use_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_use_user (user_id),
        INDEX idx_use_type (event_type),
        INDEX idx_use_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. account_restrictions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS account_restrictions (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        restriction_type ENUM('MESSAGE_RESTRICTED', 'LIKE_RESTRICTED', 'COMMUNITY_RESTRICTED', 'POST_RESTRICTED', 'TEMPORARILY_LOCKED') NOT NULL,
        reason TEXT NOT NULL,
        issued_by BIGINT UNSIGNED NULL,
        expires_at DATETIME NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_ar_admin FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_ar_user (user_id, is_active),
        INDEX idx_ar_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. verification_audit_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS verification_audit_logs (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        verification_id BIGINT UNSIGNED NOT NULL,
        actor_id BIGINT UNSIGNED NULL,
        action VARCHAR(60) NOT NULL,
        details TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_val_verification (verification_id),
        INDEX idx_val_actor (actor_id),
        INDEX idx_val_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Helper for idempotent column addition
    const ensureColumn = async (table: string, column: string, def: string) => {
      const [cols] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
      if ((cols as any[]).length === 0) {
        await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
      }
    };

    // 4. Ensure Day 25 columns on users table
    await ensureColumn('users', 'is_phone_verified', 'BOOLEAN DEFAULT FALSE');
    await ensureColumn('users', 'phone_number', 'VARCHAR(30) NULL');
    await ensureColumn('users', 'phone_otp_hash', 'VARCHAR(255) NULL');
    await ensureColumn('users', 'phone_otp_expires', 'DATETIME NULL');
    await ensureColumn('users', 'email_verification_token', 'VARCHAR(255) NULL');
    await ensureColumn('users', 'email_verification_expires', 'DATETIME NULL');
    await ensureColumn('users', 'two_factor_enabled', 'BOOLEAN DEFAULT FALSE');
    await ensureColumn('users', 'two_factor_secret', 'VARCHAR(255) NULL');
    await ensureColumn('users', 'two_factor_recovery_codes', 'TEXT NULL');

    // 5. Ensure Day 25 columns on user_settings table
    await ensureColumn('user_settings', 'location_visibility', "ENUM('city_only', 'approximate', 'hidden') DEFAULT 'approximate'");
    await ensureColumn('user_settings', 'message_permissions', "ENUM('everyone', 'matches_only', 'verified_only') DEFAULT 'matches_only'");
    await ensureColumn('user_settings', 'call_permissions', "ENUM('matches_only', 'verified_only', 'nobody') DEFAULT 'matches_only'");
    await ensureColumn('user_settings', 'ai_data_processing', 'BOOLEAN DEFAULT TRUE');
    await ensureColumn('user_settings', 'search_visibility', 'BOOLEAN DEFAULT TRUE');

    // 6. Ensure Day 25 columns on verification_requests table
    await ensureColumn('verification_requests', 'document_type', "VARCHAR(50) DEFAULT 'national_id'");

    logger.info('[DatabaseInit] Day 25 Trust, Safety & Anti-Abuse schema verified.');
  } catch (err) {
    logger.warn('[DatabaseInit] initDay25TrustSafety warning:', err);
  }
}

/**
 * Day 26: Initialize AI Personalization, Recommendation Intelligence & Behavioral Learning
 */
async function initDay26Personalization(connection: any): Promise<void> {
  try {
    // 1. user_behavior_events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_behavior_events (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        event_type VARCHAR(60) NOT NULL,
        entity_type VARCHAR(40) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ube_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_ube_user_type_created (user_id, event_type, created_at),
        INDEX idx_ube_entity (entity_type, entity_id),
        INDEX idx_ube_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. user_interest_scores table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_interest_scores (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        interest_id BIGINT UNSIGNED NOT NULL,
        score DECIMAL(7,3) NOT NULL DEFAULT 1.000,
        source ENUM('EXPLICIT', 'BEHAVIORAL', 'COMMUNITY', 'EVENT', 'POST', 'AI') NOT NULL DEFAULT 'EXPLICIT',
        confidence DECIMAL(4,3) NOT NULL DEFAULT 1.000,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_uis_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_uis_interest FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE,
        UNIQUE KEY uk_user_interest (user_id, interest_id),
        INDEX idx_uis_user_score (user_id, score DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. recommendation_feedback table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recommendation_feedback (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        recommendation_type ENUM('PEOPLE', 'COMMUNITY', 'EVENT', 'POST', 'TRENDING') NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        feedback_type ENUM('NOT_INTERESTED', 'SHOW_LESS', 'DISMISS', 'REPORT') NOT NULL,
        reason VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_rf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_rf_user_target (user_id, recommendation_type, entity_id),
        INDEX idx_rf_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. recommendation_exposures table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recommendation_exposures (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        recommendation_type ENUM('PEOPLE', 'COMMUNITY', 'EVENT', 'POST', 'TRENDING') NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        action ENUM('SHOWN', 'CLICKED', 'LIKED', 'SKIPPED', 'JOINED', 'RSVP') NOT NULL DEFAULT 'SHOWN',
        experiment_version VARCHAR(30) NOT NULL DEFAULT 'v1',
        score DECIMAL(7,3) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_re_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_re_user_entity (user_id, recommendation_type, entity_id),
        INDEX idx_re_created (created_at),
        INDEX idx_re_action (action, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. personalization_settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personalization_settings (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        personalized_recommendations BOOLEAN NOT NULL DEFAULT TRUE,
        personalized_feed BOOLEAN NOT NULL DEFAULT TRUE,
        personalized_communities BOOLEAN NOT NULL DEFAULT TRUE,
        personalized_events BOOLEAN NOT NULL DEFAULT TRUE,
        search_personalization BOOLEAN NOT NULL DEFAULT TRUE,
        ai_recommendations BOOLEAN NOT NULL DEFAULT TRUE,
        experiment_version VARCHAR(20) NOT NULL DEFAULT 'v1',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_ps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. recommendation_experiments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recommendation_experiments (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        version VARCHAR(30) NOT NULL UNIQUE,
        description TEXT NULL,
        traffic_percentage INT UNSIGNED NOT NULL DEFAULT 50,
        status ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default experiments idempotently
    await connection.query(`
      INSERT INTO recommendation_experiments (name, version, description, traffic_percentage, status)
      VALUES 
        ('Standard Hybrid Scoring', 'v1', 'Default balanced scoring weighting explicit profile interests, freshness, and mutual connections equally.', 50, 'active'),
        ('Behavior-Weighted Intelligence', 'v2', 'Dynamic behavioral scoring granting higher weight to recent community joins, post interactions, and decay rates.', 50, 'active')
      ON DUPLICATE KEY UPDATE description = VALUES(description), traffic_percentage = VALUES(traffic_percentage)
    `);

    logger.info('[DatabaseInit] Day 26 AI Personalization & Recommendation schema initialized.');
  } catch (err) {
    logger.warn('[DatabaseInit] initDay26Personalization warning:', err);
  }

  // Day 27: Production Database Index Optimization & Query Performance
  try {
    await initDay27PerformanceAndHardening(connection);
  } catch (err) {
    logger.warn('[DatabaseInit] initDay27PerformanceAndHardening warning:', err);
  }

  // Day 28: Advanced Admin Control Center, Support, Platform Settings & Feature Flags
  try {
    await initDay28AdminOperations(connection);
  } catch (err) {
    logger.warn('[DatabaseInit] initDay28AdminOperations warning:', err);
  }
}

/**
 * Day 27 Database Optimization: Adds targeted compound indexes to eliminate
 * full-table scans on high-frequency social, chat, notification, and analytics queries.
 */
async function initDay27PerformanceAndHardening(connection: any): Promise<void> {
  const ensureIndex = async (tableName: string, indexName: string, columns: string) => {
    try {
      const [rows] = await connection.query(`SHOW INDEX FROM \`${tableName}\` WHERE Key_name = ?`, [indexName]);
      if ((rows as any[]).length === 0) {
        await connection.query(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columns})`);
        logger.info(`[DatabaseInit] Day 27 Created performance index ${indexName} on ${tableName}(${columns})`);
      }
    } catch {
      // Ignore if table not present in current environment
    }
  };

  await ensureIndex('users', 'idx_users_created_at', 'created_at');
  await ensureIndex('notifications', 'idx_notif_user_created', 'user_id, created_at');
  await ensureIndex('posts', 'idx_posts_user_created', 'user_id, created_at');
  await ensureIndex('stories', 'idx_stories_user_expires', 'user_id, expires_at');
  await ensureIndex('subscriptions', 'idx_subs_user_status', 'user_id, status');
  await ensureIndex('likes', 'idx_likes_from_created', 'from_user_id, created_at');
  await ensureIndex('likes', 'idx_likes_to_created', 'to_user_id, created_at');
  await ensureIndex('calls', 'idx_calls_participants', 'caller_id, receiver_id');
  await ensureIndex('audit_logs', 'idx_audit_action_created', 'action, created_at');

  logger.info('[DatabaseInit] Day 27 Database query optimization & performance indexes verified.');
}

/**
 * Day 28: Advanced Admin Control Center, Support Ticket System, Platform Settings & Feature Flags
 */
async function initDay28AdminOperations(connection: any): Promise<void> {
  // 1. Support Tickets Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      ticket_number VARCHAR(50) UNIQUE NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      subject VARCHAR(255) NOT NULL,
      category ENUM('account', 'login', 'profile', 'messages', 'calls', 'payments', 'subscription', 'report', 'technical', 'other') NOT NULL DEFAULT 'other',
      priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
      status ENUM('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed') NOT NULL DEFAULT 'open',
      assigned_to BIGINT UNSIGNED NULL,
      resolution_notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_st_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_st_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_st_user (user_id),
      INDEX idx_st_status (status),
      INDEX idx_st_priority (priority),
      INDEX idx_st_assigned (assigned_to),
      INDEX idx_st_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Support Messages (Thread & Internal Moderator Notes)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      ticket_id BIGINT UNSIGNED NOT NULL,
      sender_id BIGINT UNSIGNED NOT NULL,
      sender_role ENUM('user', 'admin', 'moderator') NOT NULL DEFAULT 'user',
      is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
      message TEXT NOT NULL,
      attachments JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
      CONSTRAINT fk_sm_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_sm_ticket (ticket_id),
      INDEX idx_sm_sender (sender_id),
      INDEX idx_sm_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Platform Settings (Database-driven configuration)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      description VARCHAR(255) NULL,
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      updated_by BIGINT UNSIGNED NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_ps_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_ps_key (setting_key),
      INDEX idx_ps_public (is_public)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Feature Flags Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      flag_key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      description VARCHAR(255) NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      rollout_percentage INT UNSIGNED NOT NULL DEFAULT 100,
      updated_by BIGINT UNSIGNED NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_ff_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_ff_key (flag_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Add temporary suspension fields to users table if missing
  try {
    const [colSuspendedUntil] = await connection.query("SHOW COLUMNS FROM users LIKE 'suspended_until'");
    if ((colSuspendedUntil as any[]).length === 0) {
      await connection.query('ALTER TABLE users ADD COLUMN suspended_until DATETIME NULL AFTER status');
      logger.info('[DatabaseInit] Added suspended_until column to users table.');
    }
  } catch {}

  try {
    const [colSuspensionReason] = await connection.query("SHOW COLUMNS FROM users LIKE 'suspension_reason'");
    if ((colSuspensionReason as any[]).length === 0) {
      await connection.query('ALTER TABLE users ADD COLUMN suspension_reason VARCHAR(255) NULL AFTER suspended_until');
      logger.info('[DatabaseInit] Added suspension_reason column to users table.');
    }
  } catch {}

  try {
    await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'moderator', 'admin') DEFAULT 'user'");
  } catch {}

  // 5b. password_resets table for secure password recovery lifecycle
  await connection.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_pwd_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_pwd_resets_token (token_hash),
      INDEX idx_pwd_resets_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Seed Default Platform Settings Idempotently
  await connection.query(`
    INSERT INTO platform_settings (setting_key, setting_value, setting_type, category, description, is_public)
    VALUES 
      ('site_name', 'Connectly', 'string', 'general', 'Platform public title name', TRUE),
      ('support_email', 'support@connectly.app', 'string', 'support', 'Primary support and operations contact email', TRUE),
      ('maintenance_mode', 'false', 'boolean', 'operations', 'Restricts non-administrative access with a friendly maintenance screen', TRUE),
      ('registration_enabled', 'true', 'boolean', 'access', 'Allows new user registrations to proceed', TRUE),
      ('new_user_verification_requirement', 'false', 'boolean', 'trust', 'Requires manual identity verification before full profile unlock', FALSE),
      ('max_upload_size_mb', '10', 'number', 'storage', 'Maximum single media file upload size in megabytes', FALSE),
      ('daily_free_likes_limit', '25', 'number', 'monetization', 'Daily swipe/like limit for non-premium members', TRUE),
      ('ai_features_enabled', 'true', 'boolean', 'ai', 'Global master switch for AI profile insights & recommendation intelligence', TRUE),
      ('video_calling_enabled', 'true', 'boolean', 'communication', 'Global master switch for WebRTC real-time voice and video calls', TRUE)
    ON DUPLICATE KEY UPDATE description = VALUES(description), is_public = VALUES(is_public)
  `);

  // 7. Seed Default Feature Flags Idempotently
  await connection.query(`
    INSERT INTO feature_flags (flag_key, name, description, is_enabled, rollout_percentage)
    VALUES 
      ('AI_FEATURES', 'AI Profile Intelligence & Suggestions', 'Enables AI bio improvements, conversation starters, and compatibility insights', TRUE, 100),
      ('VIDEO_CALLING', 'WebRTC Video & Voice Calling', 'Allows matched users to initiate encrypted 1-on-1 peer calls', TRUE, 100),
      ('PREMIUM_MONETIZATION', 'Connectly Premium & Boosts', 'Controls access to subscription plans, boosts, and advanced filters', TRUE, 100),
      ('SOCIAL_FEED', 'Community Social Feed & Posts', 'Enables feed posts, comments, likes, and bookmarks', TRUE, 100),
      ('STORIES', 'Ephemeral 24h Stories', 'Allows users to upload expiring 24-hour visual stories', TRUE, 100),
      ('SMART_RECOMMENDATIONS', 'Behavioral Recommendation Engine', 'Personalizes home discovery using interest vectors and interaction decay', TRUE, 100),
      ('TRUST_VERIFICATION', 'Identity Document Review & Badge', 'Official verification request review workflow and verified blue badges', TRUE, 100)
    ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
  `);

  logger.info('[DatabaseInit] Day 28 Admin Control Center, Support, Settings & Feature Flags schema initialized.');
}
