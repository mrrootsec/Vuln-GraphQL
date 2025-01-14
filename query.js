const { gql } = require('apollo-server');

const typeDefs = gql`
  type User {
    user_id: String
    name: String
    email: String
    phone: String
    isAdmin: Boolean
    password: String
    createdAt: String
  }

  type Event {
    event_id: String
    name: String
    description: String
    createdAt: String
  }

  type RSVPedUser {
    name: String
    email: String
    phone: String
  }

  type Query {
    users: [User]
    user(user_id: String!): User
    events: [Event]
    event(event_id: String!): Event
    rsvpedUsers(event_id: String!): [RSVPedUser]
    healthCheck(input: String!): String
  }

  type Mutation {
    register(name: String!, email: String!, phone: String!, password: String!): String
    login(email: String!, password: String!): String
    editProfile(name: String, phone: String, email: String, isAdmin: Boolean): String
    editEvent(event_id: String!, name: String, description: String): String
    rsvpEvent(event_id: String!): String
    cancelRsvp(event_id: String!, user_id: String!): String  }
`;

module.exports = { typeDefs };
