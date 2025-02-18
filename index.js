const { ApolloServer, ApolloError } = require('apollo-server-express');
const express = require('express'); // Import express for routing
const { typeDefs } = require('./query'); // Your GraphQL schema definitions
const { resolvers } = require('./resolvers'); // Your GraphQL resolvers
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');
const jwt = require('jsonwebtoken');
const { v1: uuidv1 } = require('uuid');

// Database setup
let db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

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
      createdAt TEXT
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
    { name: 'Null Humla Workshop', description: 'Hacking Graphql 101: Exploring & Exploiting Vulnerabilities in GraphQL API’s', ownerId: uuidv1() },
  ];

  users.forEach(user => {
    const customPass = `${user.name}@123!!!`;
    const formattedDate = moment().format('YYYY-MMM-DD, dddd ,HH:mm:ss');
    db.run(
      `INSERT INTO users (user_id, name, email, phone, password, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv1(), user.name, user.email, user.phone, customPass, user.isAdmin, formattedDate]
    );
  });

  events.forEach(event => {
    const formattedDate = moment().format('YYYY-MMM-DD, dddd ,HH:mm:ss'); // Current timestamp
    db.run(
      `INSERT INTO events (event_id, name, description, createdAt) VALUES (?, ?, ?, ?)`,
      [event.event_id, event.name, event.description, formattedDate] // Insert createdAt timestamp
    );
  });
});

// JWT secret
const JWT_SECRET = 'TheSecretStringIsMuchStrongerThanOneMillionOfTanks';

// Initialize Express app
const app = express();

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req, db, JWT_SECRET }),
  formatError: (err) => ({
    message: err.message,
    code: err.extensions?.code || 'INTERNAL_SERVER_ERROR',
  }),
  introspection: true, // Enables or Disable introspection queries
});

// Async function to start the server
const startServer = async () => {
  // Start the Apollo server
  await server.start();

  // Apply middleware to only activate Apollo Server on /graphql
  server.applyMiddleware({
    app,
    path: '/graphql', // Only handle requests that go to '/graphql'
  });

  // Catch-all route for any other paths
  app.all('*', (req, res) => {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Denied</title>
        </head>
        <body>
          <h1>Not Found</h1>
          <p>The requested URL was not found on this server.</p>
        </body>
      </html>
    `);
  });

  // Start the express server
  app.listen(4000, () => {
    console.log(`🚀 GraphQL server running at http://localhost:4000/graphql`);
  });
};

// Call the async function to start the server
startServer();
