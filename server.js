require("dotenv").config();

import { ApolloServer, gql } from "apollo-server";
import { buildFederatedSchema } from "@apollo/federation";
import { applyMiddleware } from "graphql-middleware";
import { rule, shield } from "graphql-shield";
import cookieParser from "set-cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const Users = require("./dummy-database/users.json");
const Songs = require("./dummy-database/songs.json");
const Artists = require("./dummy-database/artists.json");
const Albums = require("./dummy-database/albums.json");
const Playlists = require("./dummy-database/playlists.json");
const SongsArtist = require("./dummy-database/songs-artists.json");
const FeaturedArtists = require("./dummy-database/featured-artists.json");
const FeaturedPlaylists = require("./dummy-database/featured-playlists.json");

const SALT = process.env.BCRYPT_SALT;
const JWT_SECRET = process.env.JWT_SECRET;

const typeDefs = gql`
  type Query {
    song(id: ID): Song!
    songs: [Song!]!
    album(id: ID): Album!
    albums: [Album!]!
    playlist(id: ID): Playlist!
    artist(id: ID): Artist!
    artists: [Artist!]!
    featured: Featured!
    search(query: String): Search!
  }

  type Mutation {
    login(username_email: String!, password: String!): AuthResult!
    register(username: String!, email: String!, password: String!): AuthResult!
    logout: Boolean!
  }

  type Album {
    id: ID!
    title: String!
    cover: String!
    songs: [Song!]!
  }

  type Playlist {
    id: ID!
    title: String!
    cover: String!
    songIDs: [Int!]
    songs: [Song!]!
  }

  type Song {
    id: ID!
    title: String!
    src: String!
    albumID: ID!
    album: Album!
    artists: [Artist!]!
  }

  type Artist {
    id: ID!
    name: String!
    cover: String
    songs: [Song!]
  }

  type Featured {
    playlists: [Playlist!]!
    artists: [Artist!]!
  }

  type Search {
    albums: [Album!]!
    artists: [Artist!]!
    songs: [Song!]!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    password: String!
  }

  type AuthResult {
    result: User
    error: String
  }
`;

const resolvers = {
  Query: {
    song: (_, { id }) => Songs.find((song) => song.id === id),
    songs: () => Songs,
    album: (_, { id }) => Albums.find((album) => album.id === id),
    albums: () => Albums,
    playlist: (_, { id }) => Playlists.find((playlist) => playlist.id === id),
    artist: (_, { id }) => Artists.find((artist) => artist.id === id),
    artists: () => Artists,
    featured: () => ({
      playlists: FeaturedPlaylists,
      artists: Artists.filter(({ id }) => FeaturedArtists.includes(id)),
    }),
    search: (_, { query }) => ({
      albums: Albums.filter(({ title }) =>
        title.toLowerCase().includes(query.toLowerCase())
      ),
      artists: Artists.filter(({ name }) =>
        name.toLowerCase().includes(query.toLowerCase())
      ),
      songs: Songs.filter(({ title }) =>
        title.toLowerCase().includes(query.toLowerCase())
      ),
    }),
  },
  Mutation: {
    login: (_, { username_email, password }, { res }) => {
      const user = Users.find(
        (user) =>
          username_email === user.username || username_email === user.email
      );
      if (!user) {
        return { error: "Invalid Username or Email!" };
      } else if (!bcrypt.compareSync(password, user.password)) {
        return { error: "Invalid Password!" };
      } else {
        const token = jwt.sign({ user: username_email }, JWT_SECRET, {
          expiresIn: "7d",
        });
        res.cookie("auth", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });
        return { result: { id: user.id, username: user.username } };
      }
    },
    register: (_, { username, email, password }, { res }) => {
      const user = Users.find(
        (user) => username === user.username || email === user.email
      );
      if (user) {
        return { error: "Username or Email already taken!" };
      } else {
        const hash = bcrypt.hashSync(password, SALT);
        const id = Users.length + 1;
        Users.push({ id, username, email, password: hash });
        const token = jwt.sign({ user: username }, JWT_SECRET, {
          expiresIn: "7d",
        });
        res.cookie("auth", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });
        return { result: { id: id, username: username } };
      }
    },
    logout: (_, {}, { res }) => {
      res.cookie("auth", "expired", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
      return true;
    },
  },
  Album: {
    songs: (parent) => Songs.filter((song) => song.albumID === parent.id),
  },
  Song: {
    album: (parent) => Albums.find((album) => album.id === parent.albumID),
    artists: (parent) => {
      const artistIDs = [];
      SongsArtist.forEach((songartist) => {
        if (songartist.songID === parent.id) {
          artistIDs.push(songartist.artistID);
        }
      });
      return Artists.filter((artist) => artistIDs.includes(artist.id));
    },
  },
  Artist: {
    songs: (parent) => {
      const songIDs = [];
      SongsArtist.forEach((songartist) => {
        if (songartist.artistID === parent.id) {
          songIDs.push(songartist.songID);
        }
      });
      return Songs.filter((song) => songIDs.includes(song.id));
    },
  },
  Playlist: {
    songs: (parent) => Songs.filter(({ id }) => parent.songIDs.includes(id)),
  },
};

// Auth
function getClaims(req) {
  const cookies = cookieParser.parse(req.headers.cookie, { map: true });
  let token;
  try {
    token = jwt.verify(cookies.auth.value, JWT_SECRET);
  } catch (e) {
    return null;
  }
  return token;
}

// Rules
const isAuthenticated = rule()(async (_parent, _args, ctx) => {
  return ctx.claims !== null;
});

// Permissions
const permissions = shield({
  Query: {
    song: isAuthenticated,
    songs: isAuthenticated,
    album: isAuthenticated,
    albums: isAuthenticated,
    playlist: isAuthenticated,
    artist: isAuthenticated,
    artists: isAuthenticated,
    featured: isAuthenticated,
    search: isAuthenticated,
  },
});

const server = new ApolloServer({
  schema: applyMiddleware(
    buildFederatedSchema([{ typeDefs, resolvers }]),
    permissions
  ),
  context: ({ req, res }) => ({
    req,
    res,
    claims: getClaims(req),
  }),
  cors: {
    credentials: true,
    origin: "http://localhost:3000",
  },
});

server.listen();
console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
