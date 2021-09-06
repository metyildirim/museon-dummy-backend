import { GraphQLServer } from "graphql-yoga";

const Songs = require("./dummy-database/songs.json");
const Artists = require("./dummy-database/artists.json");
const Albums = require("./dummy-database/albums.json");
const Playlists = require("./dummy-database/playlists.json");
const SongsArtist = require("./dummy-database/songs-artists.json");
const FeaturedArtists = require("./dummy-database/featured-artists.json");
const FeaturedPlaylists = require("./dummy-database/featured-playlists.json");

const typeDefs = `
  type Query {
    song(id: ID): Song!
    songs: [Song!]!
    album(id: ID): Album!
    albums: [Album!]!
    playlist(id: ID): Playlist!
    artist(id: ID): Artist!
    artists: [Artist!]!
    featured: Featured!
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

const server = new GraphQLServer({ typeDefs, resolvers });
server.start(() => console.log("Server is running on localhost:4000"));
