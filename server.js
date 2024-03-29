require("dotenv").config();

const { ApolloServer, gql } = require("apollo-server");
const { buildFederatedSchema } = require("@apollo/federation");
const { applyMiddleware } = require("graphql-middleware");
const { rule, shield } = require("graphql-shield");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const Users = require("./dummy-database/users.json");
const Songs = require("./dummy-database/songs.json");
const Artists = require("./dummy-database/artists.json");
const Albums = require("./dummy-database/albums.json");
const Playlists = require("./dummy-database/playlists.json");
const SongsArtist = require("./dummy-database/songs-artists.json");
const FeaturedArtists = require("./dummy-database/featured-artists.json");
const FeaturedPlaylists = require("./dummy-database/featured-playlists.json");
const UserLikesSongs = require("./dummy-database/user-likes-songs.json");

const SALT = Number(process.env.BCRYPT_SALT);
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = Number(process.env.PORT);
const ORIGIN = process.env.ORIGIN;

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
    likes(id: ID): [Song!]!
  }

  type Mutation {
    login(username_email: String!, password: String!): AuthResult!
    register(username: String!, email: String!, password: String!): AuthResult!
    logout: Boolean!
    addLike(songID: ID, userID: ID): LikeResult!
    removeLike(songID: ID, userID: ID): LikeResult!
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

  type LikeResult {
    result: String
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
      playlists: Playlists.filter(({ id }) => FeaturedPlaylists.includes(id)),
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
    likes: (_, { id }) => {
      const songIDs = [];
      UserLikesSongs.forEach(({ userID, songID }) => {
        if (userID === id) {
          songIDs.push(songID);
        }
      });
      return Songs.filter(({ id }) => songIDs.includes(id));
    },
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
        res.header("x-auth-token", token);
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
        res.header("x-auth-token", token);
        return { result: { id: id, username: username } };
      }
    },
    logout: () => {
      return true;
    },
    addLike: (_, { songID, userID }) => {
      if (
        UserLikesSongs.filter(
          (usersong) => usersong.userID === userID && usersong.songID === songID
        ).length > 0
      ) {
        return { error: "song already liked" };
      }
      UserLikesSongs.push({ songID: songID, userID: userID });
      return { result: "success" };
    },
    removeLike: (_, { songID, userID }) => {
      let index = -1;
      UserLikesSongs.forEach((usersong, idx) => {
        if (usersong.songID === songID && usersong.userID === userID) {
          index = idx;
        }
      });
      if (index >= 0) {
        UserLikesSongs.splice(index, 1);
        return { result: "success" };
      } else {
        return { error: "Couldn't find liked song" };
      }
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
  let token;
  try {
    token = jwt.verify(req.headers["x-auth-token"], JWT_SECRET);
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
    likes: isAuthenticated,
  },
  Mutation: {
    addLike: isAuthenticated,
    removeLike: isAuthenticated,
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
    origin: ORIGIN,
  },
});

server.listen({ port: PORT });
console.log(`🚀 Server is up and running on PORT:${PORT}`);
