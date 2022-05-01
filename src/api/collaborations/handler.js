const ClientError = require('../../exceptions/ClientError');

class CollaborationsHandler {
  constructor(collaborationsService, playlistsService, validator) {
    this._collaborationsService = collaborationsService;
    this._playlistsService = playlistsService;
    this._validator = validator;

    this.postCollaborationHandler = this.postCollaborationHandler.bind(this);
    this.deleteCollaborationHandler = this.deleteCollaborationHandler.bind(this);
  }

  async postCollaborationHandler(request, h) {
    try {
      this._validator.validateCollaborationPayload(request.payload);
      const { id: owner } = request.auth.credentials;
      const { playlistId, userId } = request.payload;
      await this._collaborationsService.verifyUser(userId);
      await this._playlistsService.verifyPlaylistOwner(playlistId, owner);
      // eslint-disable-next-line max-len
      const collaborationId = await this._collaborationsService.addCollaboration(playlistId, userId);
      const res = h.response({
        status: 'success',
        data: {
          collaborationId,
        },
      });
      res.code(201);
      return res;
    } catch (error) {
      if (error instanceof ClientError) {
        const res = h.response({
          status: 'fail',
          message: error.message,
        });
        res.code(error.statusCode);
        return res;
      }
      const res = h.response({
        status: 'error',
        message: 'Maaf terjadi kesalahan pada server kami',
      });
      res.code(500);
      console.error(error);
      return res;
    }
  }

  async deleteCollaborationHandler(request, h) {
    try {
      this._validator.validateCollaborationPayload(request.payload);
      const { id: owner } = request.auth.credentials;
      const { playlistId, userId } = request.payload;
      await this._playlistsService.verifyPlaylistOwner(playlistId, owner);
      await this._collaborationsService.deleteCollaboration(playlistId, userId);
      return {
        status: 'success',
        message: 'Berhasil menghapus kolaborator',
      };
    } catch (error) {
      if (error instanceof ClientError) {
        const res = h.response({
          status: 'fail',
          message: error.message,
        });
        res.code(error.statusCode);
        return res;
      }
      const res = h.response({
        status: 'error',
        message: 'Maaf terjadi kesalahan pada server kami',
      });
      res.code(500);
      return res;
    }
  }
}

module.exports = CollaborationsHandler;
