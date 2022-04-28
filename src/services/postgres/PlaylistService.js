const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async addPlaylist({ name, owner }) {
    const idplaylist = `playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING idplaylist',
      values: [idplaylist, name, owner],
    };
    const result = await this._pool.query(query);
    if (!result.rows[0].idplaylist) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }
    return result.rows[0].idplaylist;
  }

  async getPlaylist(owner) {
    const query = {
      text: 'SELECT * FROM playlists INNER JOIN users ON users.id = playlists.owner  WHERE owner = $1',
      // text: 'SELECT * FROM playlists WHERE owner = $1',
      values: [owner],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Anda tidak memiliki playlist');
    }
    return result.rows;
  }

  async verifyPlaylistOwner(playlistId, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE idplaylist = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
    const playlist = result.rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async deletePlaylist(playlistId, userId) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 AND user_id = $1  RETURNING id',
      values: [playlistId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
  }

  async postSongsToPlaylist(playlistId, songId) {
    const id = `list-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan ke playlist');
    }
    return result.rows[0].id;
  }

  async getPlaylistById(playlistId) {
    const query = {
      text: 'SELECT * FROM playlists INNER JOIN users ON users.id = playlists.owner WHERE idplaylist = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);
    if (!result.rows) {
      throw NotFoundError('Anda tidak memiliki playlist by getPlaylistById');
    }
    return result.rows[0];
  }

  async getPlaylistWithSong(playlistId) {
    const query = {
      text: 'SELECT * FROM playlist_songs INNER JOIN songs ON songs.id = playlist_songs.song_id WHERE playlist_id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rows) {
      throw NotFoundError('Anda tidak memiliki playlist by getPlaylistWithSong');
    }
    return result.rows;
  }

  async deleteSongFromList(songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE song_id = $1',
      values: [songId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal dihapus dari playlist');
    }
  }

  async checkSongOnList(playlistId, songId) {
    const query = {
      text: 'SELECT * FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (result.rowCount) {
      throw new InvariantError('Lagu sudah ada dalam playlist');
    }
  }

  async addActivities(playlistId, songId, userId, action) {
    const id = `activity-${nanoid(16)}`;
    const time = new Date().toISOString();
    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4, $5, $6)',
      values: [id, playlistId, songId, userId, action, time],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new InvariantError('Gagal menambahkan aktifitas');
    }
  }

  async getActivites(id) {
    const query = {
      text: 'SELECT * FROM playlist_song_activities WHERE playlist_id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('tidak ada aktifitas');
    }
    return result.rows;
  }
}

module.exports = PlaylistService;
