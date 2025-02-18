const { ApolloError } = require('apollo-server');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { v1: uuidv1 } = require('uuid');
const { exec } = require('node:child_process');

const resolvers = {
  Query: {
    users: (_, __, { db }) => 
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', (err, rows) => {
          if (err) return reject(new ApolloError('Failed to fetch users.', 'INTERNAL_SERVER_ERROR'));
          resolve(rows);
        });
      }),

    user: (_, { user_id }, { db, req, JWT_SECRET }) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) throw new ApolloError('Authorization token is missing.', '401-UNAUTHORIZED');

      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        throw new ApolloError('Invalid or expired token.', '401-UNAUTHORIZED');
      }

      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE user_id = ?', [user_id], (err, row) => {
          if (err || !row) return reject(new ApolloError('User not found.', 'NOT_FOUND'));
          resolve(row);
        });
      });
    },

    events: (_, __, { db }) => 
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM events', (err, rows) => {
          if (err) return reject(new ApolloError('Failed to fetch events.', 'INTERNAL_SERVER_ERROR'));
          resolve(rows);
        });
      }),

    event: (_, { event_id }, { db }) => 
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM events WHERE event_id = ?', [event_id], (err, row) => {
          if (err || !row) return reject(new ApolloError('Event not found.', 'NOT_FOUND'));
          resolve(row);
        });
      }),

    rsvpedUsers: (_, { event_id }, { db }) => 
      new Promise((resolve, reject) => {
        const query = `SELECT name, phone, email FROM users u JOIN rsvp r ON u.user_id = r.user_id WHERE r.event_id = ?`;
        db.all(query, [event_id], (err, rows) => {
          if (err) return reject(new ApolloError('Failed to fetch RSVPed users.', 'INTERNAL_SERVER_ERROR'));
          resolve(rows);
        });
      }),
      systemHealth: async (_, { input }) => {
          // Blacklist of disallowed commands
          const blacklist = ['cat','ls','head','tail','rm','cp','mv','wget','curl','&','&&','||',';','|','$','>','<','`','/',];
    
          // Check if input contains any blacklisted words or characters
          const isBlacklisted = blacklist.some((item) => input.includes(item));
          if (isBlacklisted) {
            throw new Error('Error: Invalid command or characters detected.');
          }
    
          // Append allowed command (sanitized input)
          const command = input.trim();
    
          return new Promise((resolve, reject) => {
            exec(command, (error, stdout) => {
              if (error) {
                reject('Error: Command execution failed.');
              } else {
                resolve(stdout);
              }
            });
          });
        },
  },

  Mutation: {
    register: (_, { name, email, phone, password }, { db }) => {
      const createdAt = moment().format('YYYY-MMM-DD, dddd ,HH:mm:ss');
      const user_id = uuidv1();

      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (user_id, name, email, phone, password, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
          [user_id, name, email, phone, password, createdAt],
          (err) => {
            if (err) return reject(new ApolloError('Registration failed. Email already exists.', 'BAD_USER_INPUT'));
            resolve('User registered successfully.');
          }
        );
      });
    },

    login: (_, { email, password }, { db, JWT_SECRET }) => 
      new Promise((resolve, reject) => {
        const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
        db.get(query, (err, user) => {
          if (err || !user) return reject(new ApolloError('Invalid credentials.', 'BAD_USER_INPUT'));
          const token = jwt.sign({
            id: user.user_id, 
            name: user.name, 
            email: user.email,
            createdAt: user.createdAt, 
            isAdmin: user.isAdmin
          }, JWT_SECRET, { expiresIn: '1h' });
          resolve(token);
        });
      }),

    editProfile: (_, args, { req, db, JWT_SECRET }) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1];
      if (!token) throw new ApolloError('Authorization token is missing.', '401 - UNAUTHORIZED');

      let userId, isAdmin;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
        isAdmin = decoded.isAdmin;
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw new ApolloError('Token has expired. Please log in again.', '401 - UNAUTHORIZED');
        }
        throw new ApolloError('Invalid token.', '401 - UNAUTHORIZED');
      }
      const updates = {};
      if (isAdmin && 'isAdmin' in args) {
        if (isAdmin) throw new ApolloError('Only admins can update the isAdmin field.', '403 - FORBIDDEN');
        updates.isAdmin = args.isAdmin;
      }

      ['name', 'phone', 'email'].forEach((field) => {
        if (args[field] !== undefined) updates[field] = args[field];
      });

      const updateFields = Object.keys(updates).map((field) => `${field} = ?`).join(', ');
      if (!updateFields) throw new ApolloError('No valid fields to update.', 'BAD_USER_INPUT');

      const query = `UPDATE users SET ${updateFields} WHERE user_id = ?`;
      return new Promise((resolve, reject) => {
        db.run(query, [...Object.values(updates), userId], (err) => {
          if (err) return reject(new ApolloError('Failed to update profile.', 'INTERNAL_SERVER_ERROR'));
          resolve('Profile details updated successfully.');
        });
      });
    },
  
    editEvent: (_, { event_id, name, description }, { db, req, JWT_SECRET }) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1];
      if (!token) throw new ApolloError('Authorization token is missing.', '401 - UNAUTHORIZED');

      let isAdmin;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        isAdmin = decoded.isAdmin;
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          // If the token is expired, provide a specific error message
          throw new ApolloError('Token has expired. Please log in again.', '401 - UNAUTHORIZED');
        }
        // For any other JWT error (invalid token, malformed token, etc.)
        throw new ApolloError('Invalid or expired token.', '401 - UNAUTHORIZED');
      }
      if (!isAdmin) throw new ApolloError('Unauthorized. Only admins can edit events.', '403 - FORBIDDEN');

      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM events WHERE event_id = ?', [event_id], (err, row) => {
          if (err || !row) return reject(new ApolloError('Event not found.', 'NOT_FOUND'));

          const query = `UPDATE events SET name = ?, description = ? WHERE event_id = ?`;
          db.run(query, [name, description, event_id], (err) => {
            if (err) return reject(new ApolloError('Failed to update event.', 'INTERNAL_SERVER_ERROR'));
            resolve('Event updated successfully.');
          });
        });
      });
    },

    rsvpEvent: (_, { event_id }, { db, req, JWT_SECRET }) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1];
      if (!token) throw new ApolloError('Authorization token is missing.', '401 - UNAUTHORIZED');

      let userId;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw new ApolloError('Token has expired. Please log in again.', '401 - UNAUTHORIZED');
        }
        throw new ApolloError('Invalid or expired token.', '401 - UNAUTHORIZED');
      }
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO rsvp (event_id, user_id) VALUES (?, ?)`,
          [event_id, userId],
          (err) => {
            if (err) return reject(new ApolloError('Failed to RSVP for event.', 'INTERNAL_SERVER_ERROR'));
            resolve('RSVP successful.');
          }
        );
      });
    },
    cancelRsvp: (_, { event_id }, { db, req, JWT_SECRET }) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1];
      if (!token) throw new ApolloError('Authorization token is missing.', '401 - UNAUTHORIZED');
    
      let userId;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw new ApolloError('Token has expired. Please log in again.', '401 - UNAUTHORIZED');
        }
        throw new ApolloError('Invalid token.', '401 - UNAUTHORIZED');
      }
    
      return new Promise((resolve, reject) => {
        db.run(`DELETE FROM rsvp WHERE event_id = ? AND user_id = ?`, [event_id, userId], (err) => {
          if (err) return reject(new ApolloError('Failed to cancel RSVP.', 'INTERNAL_SERVER_ERROR'));
          resolve('RSVP canceled Successfully.');
        });
      });
    },
  },
};

module.exports = { resolvers };
