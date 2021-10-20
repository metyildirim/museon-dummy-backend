# museon-dummy-backend &middot; [![GitHub license](https://img.shields.io/badge/License-GPL3-blue.svg)](https://github.com/metyildirim/museon-dummy-backend/blob/master/LICENSE) [![CodeQL](https://github.com/metyildirim/museon-dummy-backend/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/metyildirim/museon-dummy-backend/actions/workflows/codeql-analysis.yml)
A GraphQL Server for [Museon](https://github.com/metyildirim/museon-web)

## Development

### Environments

- Copy `.env_template` to `.env` on same structure level.
- Fill required environment variables.

| Environment      | Type   | Recommendation for Development | Description                                |
| ---------------- | ------ | ------------------------------ | -------------------------------------------|
| JWT_SECRET       | String | topsecret                      | JWT secret key to encrypt & decrypt tokens |
| BCRYPT_SALT      | Number | 12                             | Salt value of bcrypt                       |
| PORT             | Number | 4000                           | The port of GraphQL Server                 |
| ORIGIN           | String | http://localhost:3000          | Allowed origin for CORS                    |

Installing dependencies:

```bash
$ npm install
```

Running server:

```bash
$ npm start
```

Now, server should be running on [http://localhost:4000/graphql](http://localhost:4000/graphql)

### Contributing

Please, follow these steps to contribute:

  1. Fork the repository
  2. Create a branch
  3. Commit your changes
  4. Create pull request
