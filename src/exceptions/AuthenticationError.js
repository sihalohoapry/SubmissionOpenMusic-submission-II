const ClientError = require('./ClientError');

class AuthenticationError extends ClientError {
  constructor(message) {
    super(message, 401);
    this.name = 'Authentications';
  }
}

module.exports = AuthenticationError;
