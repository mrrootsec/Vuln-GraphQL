const { gql } = require('apollo-server');

const typeDefs = gql`
  type User {
    user_id: ID
    name: String
    email: String
    phone: String
    isAdmin: Boolean
    password: String
    createdAt: String
  }

  type Event {
    event_id: ID
    name: String
    description: String
    ownerId: String
  }

  type Query {
    users: [User]
    user(user_id: ID!): User
    event(event_id: ID!): Event
  }

  type Mutation {
    register(name: String!, email: String!, phone: String!, password: String!): String
    login(email: String!, password: String!): String
    editProfile(name: String, phone: String, email: String, isAdmin: Boolean): String
    editEvent(event_id: ID!, name: String!, description: String!): String
  }
`;

module.exports = { typeDefs };
