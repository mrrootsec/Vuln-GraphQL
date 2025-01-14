const { ApolloServer, ApolloError } = require('apollo-server');
const { typeDefs } = require('./query');
const { resolvers } = require('./resolvers');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');
const jwt = require('jsonwebtoken');
const { v1: uuidv1 } = require('uuid');

// Database setup
const db = new sqlite3.Database(':memory:');

// Initialize DB
db.serialize(() => {
  db.run(`
    CREATE TABLE users (
      user_id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      password TEXT,
      isAdmin INTEGER DEFAULT 0,
      createdAt TEXT
    )
  `);

  db.run(`
    CREATE TABLE events (
      event_id INTEGER PRIMARY KEY,
      name TEXT,
      description TEXT,
      ownerId TEXT
    )
  `);

  db.run(`
    CREATE TABLE rsvp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      user_id TEXT,
      UNIQUE(event_id, user_id) ON CONFLICT IGNORE
    )
  `);

  const users = [
    { name: 'admin', email: 'admin@hack.org', phone: '7894561230', isAdmin: 1 },
    { name: 'peter', email: 'peter@hack.org', phone: '0987654321', isAdmin: 0 },
    { name: 'wiener', email: 'wiener@hack.org', phone: '0987654321', isAdmin: 0 },
  ];

  const events = [
    { name: 'Nullhyd monthly meet', description: 'Null Hyderabad is an in-person experience only community', ownerId: uuidv1() },
    { name: 'Null Bachav Workshop', description: 'Source code review with Semgrep', ownerId: uuidv1() },
    { name: 'Null Humla Workshop', description: 'Attacking Graphql: Queries & Mutations', ownerId: uuidv1() },
  ];

  users.forEach(user => {
    const customPass = `${user.name}@123`;
    const formattedDate = moment().format('YYYY-MMM-DD, dddd ,HH:mm:ss');
    db.run(
      `INSERT INTO users (user_id, name, email, phone, password, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv1(), user.name, user.email, user.phone, customPass, user.isAdmin, formattedDate]
    );
  });

  events.forEach(event => {
    db.run(
      `INSERT INTO events (event_id, name, description, ownerId) VALUES (?, ?, ?, ?)`,
      [event.event_id, event.name, event.description, event.ownerId]
    );
  });
});

// JWT secret
const JWT_SECRET = 'TheSecretStringIsMuchStrongerThanOneMillionOfTanks';

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req, db, JWT_SECRET }),
  formatError: (err) => ({
    message: err.message,
    code: err.extensions?.code || 'INTERNAL_SERVER_ERROR',
  }),
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
