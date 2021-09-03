import { GraphQLServer } from "graphql-yoga";

const Albums = require("./dummy-database/albums.json");
const Songs = require("./dummy-database/songs.json");
const Artists = require("./dummy-database/artists.json");
const SongsArtist = require("./dummy-database/songs-artists.json");

const typeDefs = `
  type Query {
    song(id: ID): Song!
    songs: [Song!]!
    album(id: ID): Album!
    albums: [Album!]!
    artist(id: ID): Artist!
    artists: [Artist!]!
  }

  type Album {
    id: ID!
    title: String!
    cover: String!
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
`;

const resolvers = {
  Query: {
    song: (_, { id }) => Songs.find((song) => song.id === id),
    songs: () => Songs,
    album: (_, { id }) => Albums.find((album) => album.id === id),
    albums: () => Albums,
    artist: (_, { id }) => Artists.find((artist) => artist.id === id),
    artists: () => Artists,
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
};

const server = new GraphQLServer({ typeDefs, resolvers });
server.start(() => console.log("Server is running on localhost:4000"));
