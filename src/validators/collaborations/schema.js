const Joi = require('joi');

const CollaborationPayloadScema = Joi.object({
  playlistId: Joi.string().required(),
  userId: Joi.string().required(),
});

module.exports = { CollaborationPayloadScema };
