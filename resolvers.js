const { ApolloError } = require('apollo-server');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { v1: uuidv1 } = require('uuid');

const resolvers = {
  Query: {
    users: (_, __, { db }) => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', (err, rows) => {
          if (err) return reject(new ApolloError('Failed to fetch users.', 'INTERNAL_SERVER_ERROR'));
          resolve(rows);
        });
      });
    },
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
    event: (_, { event_id }, { db }) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM events WHERE event_id = ?', [event_id], (err, row) => {
          if (err || !row) return reject(new ApolloError('Event not found.', 'NOT_FOUND'));
          resolve(row);
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
    login: (_, { email, password }, { db, JWT_SECRET }) => {
          return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
            db.get(query, (err, user) => {
              if (err || !user) return reject(new Error('Invalid credentials.'));
              const token = jwt.sign({ id: user.user_id, name: user.name, email: user.email, createdAt: user.createdAt, isAdmin: user.isAdmin }, JWT_SECRET);
              resolve(token);
            });
          });
        },
        editProfile: (_, args, { req, db, JWT_SECRET }) => {
            // Extract the token from the Authorization header
            const authHeader = req.headers.authorization || '';
            const token = authHeader.split(' ')[1];
          
            if (!token) {
              throw new ApolloError('Authorization token is missing.', '401 - UNAUTHORIZED');
            }
          
            let userId, isAdmin;
          
            // Verify and decode the token
            try {
              const decoded = jwt.verify(token, JWT_SECRET);
              userId = decoded.id; // Aligning with token payload structure from 'login'
              isAdmin = decoded.isAdmin;
            } catch (error) {
              throw new ApolloError('Invalid or expired token.', '401 - UNAUTHORIZED');
            }
          
            // Prepare updates based on provided fields
            const updates = {};
            if (isAdmin && 'isAdmin' in args) {
              updates.isAdmin = args.isAdmin; // Only admins can update this field
            }
          
            const allowedFields = ['name', 'phone', 'email'];
            allowedFields.forEach((field) => {
              if (args[field] !== undefined) {
                updates[field] = args[field];
              }
            });
          
            // Ensure there's at least one valid field to update
            const updateFields = Object.keys(updates)
              .map((field) => `${field} = ?`)
              .join(', ');
          
            if (!updateFields) {
              throw new ApolloError('No valid fields to update.', 'BAD_USER_INPUT');
            }
          
            // SQL query to update the user's profile
            const query = `UPDATE users SET ${updateFields} WHERE user_id = ?`;
          
            // Execute the update
            return new Promise((resolve, reject) => {
              db.run(query, [...Object.values(updates), userId], (err) => {
                if (err) {
                  return reject(new ApolloError('Failed to update profile.', 'INTERNAL_SERVER_ERROR'));
                }
                resolve('Profile details updated successfully.');
              });
            });
          },
    editEvent: (_, { event_id, name, description }, { db, req, JWT_SECRET }) => {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.split(' ')[1];
      
        if (!token) {
          throw new ApolloError('Authorization token is missing.', '401 - UNAUTHORIZED');
        }
      
        let userId, isAdmin;
      
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.user_id;
          isAdmin = decoded.isAdmin;
        } catch (error) {
          throw new ApolloError('Invalid or expired token.', '401 - UNAUTHORIZED');
        }
      
        if (!isAdmin) {
          throw new ApolloError('Unauthorized. Only admins can edit events.', '403 - FORBIDDEN');
        }
      
        return new Promise((resolve, reject) => {
          // Check if event exists
          db.get('SELECT * FROM events WHERE event_id = ?', [event_id], (err, row) => {
            if (err || !row) {
              return reject(new ApolloError('Event not found.', 'NOT_FOUND'));
            }
      
            // Update event
            const query = `UPDATE events SET name = ?, description = ? WHERE event_id = ?`;
            db.run(query, [name, description, event_id], (err) => {
              if (err) {
                return reject(new ApolloError('Failed to update event.', 'INTERNAL_SERVER_ERROR'));
              }
              resolve('Event updated successfully.');
            });
          });
        });
      }      
  },
};

module.exports = { resolvers };
