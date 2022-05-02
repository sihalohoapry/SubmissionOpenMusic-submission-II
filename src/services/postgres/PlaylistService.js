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
      text: 'SELECT * FROM playlists INNER JOIN users ON playlists.owner = users.id WHERE owner = $1',
      // text: 'SELECT * FROM playlists WHERE owner = $1',
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async deletePlaylist(playlistId) {
    const query = {
      text: 'DELETE FROM playlists WHERE idplaylist = $1 RETURNING idplaylist',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
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

  async postSongsToPlaylist(playlistId, songId) {
    const id = `list-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
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

  async deleteSongFromList(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal dihapus dari playlist coy');
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

  async checkSongAvaible(songId) {
    const query = {
      text: 'SELECT id FROM songs WHERE id = $1',
      values: [songId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Lagu tidak terdaftar');
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

  async getActivites(playlistId) {
    const query = {
      text: 'SELECT * FROM playlist_song_activities INNER JOIN users ON playlist_song_activities.user_id = users.id INNER JOIN songs ON playlist_song_activities.song_id = songs.id WHERE playlist_id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    // if (!result.rows.length) {
    //   throw new NotFoundError('tidak ada aktifitas');
    // }
    return result.rows;
  }
}

module.exports = PlaylistService;
