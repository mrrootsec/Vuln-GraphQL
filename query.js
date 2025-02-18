const { gql } = require('apollo-server');

const typeDefs = gql`
  type User {
    """
    Unique identifier for the user.
    """
    user_id: String
    """
    Full name of the user.
    """
    name: String
    """
    Email address of the user.
    """
    email: String
    """
    Phone number of the user.
    """
    phone: String
    """
    Flag indicating whether the user has admin privileges.
    """
    isAdmin: Boolean
    """
    The user's password (hashed or encrypted in the system).
    """
    password: String
    """
    Timestamp of when the user was created.
    """
    createdAt: String
  }

  type Event {
    """
    Unique identifier for the event.
    """
    event_id: String
    """
    Name or title of the event.
    """
    name: String
    """
    Description providing details about the event.
    """
    description: String
    """
    Timestamp of when the event was created.
    """
    createdAt: String
  }

  type RSVPedUser {
    """
    Full name of the user who RSVPed.
    """
    name: String
    """
    Email address of the RSVPed user.
    """
    email: String
    """
    Phone number of the RSVPed user.
    """
    phone: String
  }

  type Query {
    """
    Fetch a list of all users.
    """
    users: [User]

    """
    Fetch a single user by their unique user ID.
    """
    user(user_id: String!): User

    """
    Fetch a list of all events.
    """
    events: [Event]

    """
    Fetch a single event by its unique event ID.
    """
    event(event_id: String!): Event

    """
    Fetch a list of users who RSVPed for a specific event.
    """
    rsvpedUsers(event_id: String!): [RSVPedUser]

    """
    Fetch the system health status.
    An optional input can be provided to customize the check.
    """
    systemHealth(input: String): String
  }

  type Mutation {
    """
    Register a new user in the system with provided details.
    """
    register(name: String!, email: String!, phone: String!, password: String!): String

    """
    Log in an existing user by email and password, returning a token.
    """
    login(email: String!, password: String!): String

    """
    Edit an existing user's profile information (name, phone, email, admin status).
    """
    editProfile(name: String, phone: String, email: String, isAdmin: Boolean): String

    """
    Edit an event by updating its name and description.
    """
    editEvent(event_id: String!, name: String, description: String): String

    """
    RSVP for a specific event.
    """
    rsvpEvent(event_id: String!): String

    """
    Cancel an RSVP for a specific event for a user.
    """
    cancelRsvp(event_id: String!, user_id: String!): String
  }
`;

module.exports = { typeDefs };
