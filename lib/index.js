'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* eslint-disable no-param-reassign, no-shadow */

var _require = require('os'),
    hostname = _require.hostname;

var hoek = require('hoek');
var Stream = require('stream');
var Raven = require('raven');

var internals = {
  defaults: {
    name: hostname(),
    logger: '',
    release: '',
    environment: ''
  }
};

var GoodSentry = function (_Stream$Writable) {
  _inherits(GoodSentry, _Stream$Writable);

  function GoodSentry() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$dsn = _ref.dsn,
        dsn = _ref$dsn === undefined ? null : _ref$dsn,
        _ref$config = _ref.config,
        config = _ref$config === undefined ? {} : _ref$config,
        _ref$captureUncaught = _ref.captureUncaught,
        captureUncaught = _ref$captureUncaught === undefined ? false : _ref$captureUncaught;

    _classCallCheck(this, GoodSentry);

    var _this = _possibleConstructorReturn(this, (GoodSentry.__proto__ || Object.getPrototypeOf(GoodSentry)).call(this, { objectMode: true, decodeStrings: false }));

    var settings = hoek.applyToDefaults(internals.defaults, config);
    var args = dsn === null ? [settings] : [dsn, settings];

    _this._client = Raven.config.apply(Raven, args);
    if (captureUncaught) {
      _this._client.install();
    }
    return _this;
  }

  _createClass(GoodSentry, [{
    key: '_write',
    value: function _write(data, encoding, cb) {
      // Normalize event tags - if its a string then wrap in an array, default to an empty array
      var _data$tags = data.tags,
          tags = _data$tags === undefined ? [] : _data$tags;

      tags = typeof tags === 'string' ? [tags] : tags;

      var additionalData = {
        level: function () {
          var tags = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

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
        }(tags),
        tags: tags.filter(function (tag) {
          return ['fatal', 'error', 'warning', 'info', 'debug'].indexOf(tag) === -1;
        }).reduce(function (acc, curr) {
          acc[curr] = true;
          return acc;
        }, {}),
        extra: {
          event: data.event
        }
      };

      var error = data.error || data.data && (data.data.error || data.data.err);
      if (error) {
        if (data.data) {
          Object.keys(data.data).forEach(function (key) {
            if (data.data[key] !== error) {
              additionalData.extra[key] = data.data[key];
            }
          });
        }
        this._client.captureException(error, additionalData, cb());
      } else {
        this._client.captureMessage(data.data, additionalData, cb());
      }
    }
  }]);

  return GoodSentry;
}(Stream.Writable);

module.exports = GoodSentry;
