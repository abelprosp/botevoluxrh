const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

class Database {
  constructor() {
    this.dbPath = config.database.path;
    this.ensureDatabaseDirectory();
    this.db = new sqlite3.Database(this.dbPath);
    this.init();
  }

  ensureDatabaseDirectory() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  init() {
    this.db.serialize(() => {
      // Tabela de conversas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT NOT NULL,
          user_type TEXT CHECK(user_type IN ('candidate', 'company', 'other', 'unknown')) DEFAULT 'unknown',
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de mensagens
      this.db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER,
          message TEXT NOT NULL,
          sender TEXT CHECK(sender IN ('user', 'agent')) NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
      `);

      // Tabela de vagas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          company TEXT NOT NULL,
          description TEXT,
          requirements TEXT,
          salary_range TEXT,
          location TEXT,
          type TEXT CHECK(type IN ('CLT', 'PJ', 'Freelance')) DEFAULT 'CLT',
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de candidatos
      this.db.run(`
        CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT UNIQUE NOT NULL,
          name TEXT,
          email TEXT,
          experience TEXT,
          skills TEXT,
          current_position TEXT,
          desired_salary TEXT,
          location TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de empresas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          industry TEXT,
          company_size TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de notificações
      this.db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT CHECK(type IN ('company', 'candidate', 'other', 'system')) NOT NULL,
          phone_number TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de registro de mensagens de empresas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS company_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT NOT NULL,
          company_name TEXT,
          message TEXT NOT NULL,
          message_type TEXT CHECK(message_type IN ('initial', 'follow_up', 'response')) DEFAULT 'initial',
          business_hours TEXT CHECK(business_hours IN ('within', 'outside')) DEFAULT 'within',
          status TEXT CHECK(status IN ('pending', 'contacted', 'closed')) DEFAULT 'pending',
          agent_id TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  // Métodos para conversas
  async createConversation(phoneNumber, userType = 'unknown') {
    return new Promise((resolve, reject) => {
      // Verifica se o userType é válido
      const validTypes = ['candidate', 'company', 'other', 'unknown'];
      if (!validTypes.includes(userType)) {
        userType = 'unknown';
      }
      
      this.db.run(
        'INSERT INTO conversations (phone_number, user_type) VALUES (?, ?)',
        [phoneNumber, userType],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getConversation(phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM conversations WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1',
        [phoneNumber],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async updateConversationUserType(conversationId, userType) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE conversations SET user_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userType, conversationId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async finalizeConversation(phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE conversations SET status = "finalized", updated_at = CURRENT_TIMESTAMP WHERE phone_number = ? AND status = "active"',
        [phoneNumber],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async clearConversationData(phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM conversations WHERE phone_number = ?',
        [phoneNumber],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async updateConversationStatus(phoneNumber, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ? AND status != "finalized"',
        [status, phoneNumber],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async saveMessage(conversationId, message, sender) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO messages (conversation_id, message, sender) VALUES (?, ?, ?)',
        [conversationId, message, sender],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getConversationHistory(conversationId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?',
        [conversationId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.reverse());
        }
      );
    });
  }

  // Métodos para vagas
  async createJob(jobData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO jobs (title, company, description, requirements, salary_range, location, type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [jobData.title, jobData.company, jobData.description, jobData.requirements, 
         jobData.salary_range, jobData.location, jobData.type],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getActiveJobs() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM jobs WHERE status = "active" ORDER BY created_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Métodos para candidatos
  async saveCandidate(candidateData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO candidates 
         (phone_number, name, email, experience, skills, current_position, desired_salary, location) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [candidateData.phone_number, candidateData.name, candidateData.email, 
         candidateData.experience, candidateData.skills, candidateData.current_position, 
         candidateData.desired_salary, candidateData.location],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getCandidate(phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM candidates WHERE phone_number = ?',
        [phoneNumber],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Métodos para empresas
  async saveCompany(companyData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO companies 
         (phone_number, name, email, industry, company_size, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [companyData.phone_number, companyData.name, companyData.email, 
         companyData.industry, companyData.company_size, companyData.description],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getCompany(phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM companies WHERE phone_number = ?',
        [phoneNumber],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Métodos para notificações
  async getUnreadNotificationsCount() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0',
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
  }

  // Método para criar notificações
  async createNotification(type, phoneNumber, title, message) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO notifications (type, phone_number, title, message) VALUES (?, ?, ?, ?)',
        [type, phoneNumber, title, message],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Método para obter notificações
  async getNotifications(type = null, limit = 50) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM notifications';
      let params = [];
      
      if (type) {
        query += ' WHERE type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Método para marcar notificação como lida
  async markNotificationAsRead(notificationId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE notifications SET is_read = 1 WHERE id = ?',
        [notificationId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Métodos para registro de mensagens de empresas
  async createCompanyMessage(phoneNumber, message, companyName = null, messageType = 'initial', businessHours = 'within') {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO company_messages (phone_number, company_name, message, message_type, business_hours) VALUES (?, ?, ?, ?, ?)',
        [phoneNumber, companyName, message, messageType, businessHours],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async updateCompanyMessageStatus(messageId, status, agentId = null, notes = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE company_messages SET status = ?, agent_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, agentId, notes, messageId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async getCompanyMessages(phoneNumber = null, status = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM company_messages';
      let params = [];
      
      if (phoneNumber) {
        query += ' WHERE phone_number = ?';
        params.push(phoneNumber);
      } else if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getPendingCompanyMessages() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM company_messages WHERE status = "pending" ORDER BY created_at ASC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async getCompanyMessageStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
          SUM(CASE WHEN business_hours = 'outside' THEN 1 ELSE 0 END) as outside_hours
        FROM company_messages`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
