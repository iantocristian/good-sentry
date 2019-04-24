/* eslint-disable no-param-reassign, no-shadow */

const { hostname } = require('os');
const hoek = require('hoek');
const Stream = require('stream');
const Raven = require('raven');

const internals = {
  defaults: {
    name: hostname(),
    logger: '',
    release: '',
    environment: '',
  },
};

class GoodSentry extends Stream.Writable {
  constructor({ dsn = null, config = {}, tags = {}, captureUncaught = false } = {}) {
    super({ objectMode: true, decodeStrings: false });

    const settings = hoek.applyToDefaults(internals.defaults, config);
    const args = dsn === null ? [settings] : [dsn, settings];

    this._client = Raven.config(...args);
    if (captureUncaught) {
      this._client.install();
    }

    this._tags = tags;
  }

  _write(data, encoding, cb) {
    // Normalize event tags - if its a string then wrap in an array, default to an empty array
    let { tags = [] } = data;
    tags = typeof tags === 'string' ? [tags] : tags;

    const additionalData = {
      level: ((tags = []) => {
        if (hoek.contain(tags, ['fatal'], { part: true })) {
          return 'fatal';
        }
        if (hoek.contain(tags, ['err', 'error'], { part: true })) {
          return 'error';
        }
        if (hoek.contain(tags, ['warn', 'warning'], { part: true })) {
          return 'warning';
        }
        if (hoek.contain(tags, ['info'], { part: true })) {
          return 'info';
        }

        return 'debug';
      })(tags),
      tags: tags
        .filter(
          tag =>
            ['fatal', 'error', 'warning', 'info', 'debug'].indexOf(tag) === -1,
        )
        .filter(
          tag => this._tags.include ? (this._tags.include.indexOf(tag) > -1) :
            this._tags.exclude ? (this._tags.exclude.indexOf(tag) === -1) : true
        )
        .reduce((acc, curr) => {
          acc[curr] = true;
          return acc;
        }, {}),
      extra: {
        event: data.event,
      },
    };

    const error = data.error || (data.data && (data.data.error || data.data.err));
    if (error) {
      if (data.data) {
        Object.keys(data.data).forEach((key) => {
          if (data.data[key] !== error) {
            additionalData.extra[key] = data.data[key];
          }
        });
      }
      this._client.captureException(error, additionalData, () => cb());
    }
    else {
      this._client.captureMessage(data.data, additionalData, () => cb());
    }
  }
}

module.exports = GoodSentry;
