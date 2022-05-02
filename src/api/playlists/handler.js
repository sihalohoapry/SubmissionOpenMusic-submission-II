const ClientError = require('../../exceptions/ClientError');

class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    this.postPlaylistHandler = this.postPlaylistHandler.bind(this);
    this.getPlaylistHandler = this.getPlaylistHandler.bind(this);
    this.deletePlaylistHandler = this.deletePlaylistHandler.bind(this);
    this.postPlaylistSongHandler = this.postPlaylistSongHandler.bind(this);
    this.getPlaylistAndSongHandler = this.getPlaylistAndSongHandler.bind(this);
    this.deleteSongPlaylistHandler = this.deleteSongPlaylistHandler.bind(this);
    this.getActivitiesHandler = this.getActivitiesHandler.bind(this);
  }

  async postPlaylistHandler(request, h) {
    try {
      this._validator.validatePlaylistPayload(request.payload);
      const { name } = request.payload;
      const { id: owner } = request.auth.credentials;
      const playlistId = await this._service.addPlaylist({ name, owner });

      const res = h.response({
        status: 'success',
        message: 'Berhasil menambahkan playlist',
        data: {
          playlistId,
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
        message: 'Maaf, terjadi kesalahan pada server kami',
      });
      res.code(500);
      console.error(error);
      return res;
    }
  }

  async getPlaylistHandler(request, h) {
    try {
      const { id: owner } = request.auth.credentials;
      const playlists = await this._service.getPlaylist(owner);
      return {
        status: 'success',
        data: {
          playlists: playlists.map((playlist) => ({
            id: playlist.idplaylist,
            name: playlist.name,
            username: playlist.username,
          })),
        },
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
        message: 'Maaf, terjadi kesalahan pada server kami',
      });
      res.code(500);
      console.error(error);
      return res;
    }
  }

  async deletePlaylistHandler(request, h) {
    try {
      const { playlistId } = request.params;
      const { id: owner } = request.auth.credentials;
      await this._service.verifyPlaylistOwner(playlistId, owner);
      await this._service.deletePlaylist(playlistId);

      return {
        status: 'success',
        message: 'Playlist berhasil di hapus',
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
        message: 'Maaf, terjadi kesalahan dalam server kami',
      });
      res.code(500);
      console.log(error);
      return res;
    }
  }

  async postPlaylistSongHandler(request, h) {
    try {
      this._validator.validatePlaylistSongPayload(request.payload);
      const { songId } = request.payload;
      const { playlistId } = request.params;
      const { id: owner } = request.auth.credentials;
      await this._service.verifyPlaylistAccess(playlistId, owner);
      await this._service.checkSongAvaible(songId);
      await this._service.checkSongOnList(playlistId, songId);
      const song = await this._service.postSongsToPlaylist(playlistId, songId);
      this._service.addActivities(playlistId, songId, owner, 'add');
      const res = h.response({
        status: 'success',
        message: 'Berhasil menambahkan lagu ke playlist',
        data: {
          song,
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
        message: 'Maaf terjadi masalah pada server kami',
      });
      res.code(500);
      console.error(error);
      return res;
    }
  }

  async getPlaylistAndSongHandler(request, h) {
    try {
      const { playlistId } = request.params;
      const { id: owner } = request.auth.credentials;
      await this._service.verifyPlaylistAccess(playlistId, owner);
      const playlist = await this._service.getPlaylistById(playlistId);
      const playlistSongs = await this._service.getPlaylistWithSong(playlistId);
      const res = h.response({
        status: 'success',
        data: {
          playlist: {
            id: playlist.idplaylist,
            name: playlist.name,
            username: playlist.username,
            songs: playlistSongs.map((list) => ({
              id: list.id,
              title: list.title,
              performer: list.performer,
            })),
          },
        },
      });
      res.code(200);
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
      return res;
    }
  }

  async deleteSongPlaylistHandler(request, h) {
    try {
      this._validator.validatePlaylistSongPayload(request.payload);
      const { songId } = request.payload;
      const { playlistId } = request.params;
      const { id: credentialId } = request.auth.credentials;
      await this._service.verifyPlaylistAccess(playlistId, credentialId);
      await this._service.deleteSongFromList(playlistId, songId);
      this._service.addActivities(playlistId, songId, credentialId, 'delete');
      return {
        status: 'success',
        message: 'berhasil menghapus lagu',
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

  async getActivitiesHandler(request, h) {
    try {
      const { playlistId } = request.params;
      const { id: userId } = request.auth.credentials;
      await this._service.verifyPlaylistAccess(playlistId, userId);
      const result = await this._service.getActivites(playlistId);
      const res = h.response({
        status: 'success',
        data: {
          playlistId,
          activities: result.map((list) => ({
            username: list.username,
            title: list.title,
            action: list.action,
            time: list.time,
          })),
        },
      });
      res.code(200);
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
      return res;
    }
  }
}

module.exports = PlaylistsHandler;
