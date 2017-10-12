'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var qs = _interopDefault(require('qs'));
var objectAssign = _interopDefault(require('object-assign'));
require('whatwg-fetch');

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var STORAGE_KEY = '__SKYGEAR_EVENT_TRACKING__';
var DEFAULT_MAX_LENGTH = 1000;
var DEFAULT_FLUSH_LIMIT = 10;
var DEFAULT_UPLOAD_LIMIT = 20;
var DEFAULT_TIMER_INTERVAL = 30 * 1000; // in ms
var DEFAULT_MOUNT_PATH = '/skygear_event_tracking';

function _hasWindow() {
  return typeof window !== 'undefined';
}

function getPagePathname() {
  if (_hasWindow()) {
    return window.location.pathname;
  }
  return null;
}

function getPageSearch() {
  if (_hasWindow() && window.location.search) {
    return window.location.search;
  }
  return null;
}

function getPageURL() {
  if (_hasWindow()) {
    return window.location.href;
  }
  return null;
}

function getPageReferrer() {
  if (_hasWindow() && window.document.referrer) {
    return window.document.referrer;
  }
  return null;
}

function getUTMCampaign() {
  if (_hasWindow() && window.location.search) {
    var obj = qs.parse(window.location.search.slice(1));
    if (obj.utm_campaign) {
      return obj.utm_campaign;
    }
  }
  return null;
}

function getUTMChannel() {
  if (_hasWindow() && window.location.search) {
    var obj = qs.parse(window.location.search.slice(1));
    if (obj.utm_channel) {
      return obj.utm_channel;
    }
  }
  return null;
}

function getUserAgent() {
  if (_hasWindow() && window.navigator.userAgent) {
    return window.navigator.userAgent;
  }
  return null;
}

var WindowLocalStorage = function () {
  function WindowLocalStorage() {
    _classCallCheck(this, WindowLocalStorage);
  }

  _createClass(WindowLocalStorage, [{
    key: 'setItem',
    value: function setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        // ignore
      }
    }
  }, {
    key: 'getItem',
    value: function getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
  }]);

  return WindowLocalStorage;
}();

var Executor = function () {
  function Executor() {
    _classCallCheck(this, Executor);

    this._promise = Promise.resolve();
  }

  _createClass(Executor, [{
    key: 'submit',
    value: function submit(task) {
      this._promise = this._promise.then(task, task);
    }
  }]);

  return Executor;
}();

var Writer = function () {
  function Writer(syncStorage, endpoint) {
    var _this = this;

    _classCallCheck(this, Writer);

    this._syncStorage = syncStorage;
    this._endpoint = endpoint;
    this._events = [];
    this._executor = new Executor();
    this._executor.submit(function () {
      return _this._restore().then(function () {
        return _this._dropIfNeeded();
      }).then(function () {
        return _this._flushIfHasSomeEvents();
      });
    });
    this._timerToken = setInterval(function () {
      _this._executor.submit(function () {
        return _this._flushIfHasSomeEvents();
      });
    }, DEFAULT_TIMER_INTERVAL);
  }

  _createClass(Writer, [{
    key: '_restore',
    value: function _restore() {
      var value = this._syncStorage.getItem(STORAGE_KEY);
      if (value) {
        try {
          var json = JSON.parse(value);
          if (json && json.events && Array.isArray(json.events)) {
            var jsonArray = json.events;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = jsonArray[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var eventJson = _step.value;

                var event = this._fromJSONObject(eventJson);
                if (event) {
                  this._events.push(event);
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
      return Promise.resolve();
    }
  }, {
    key: '_serializeDateToJSONObject',
    value: function _serializeDateToJSONObject(date) {
      return {
        $type: 'date',
        $date: date.toISOString()
      };
    }
  }, {
    key: '_parseDateFromJSONObject',
    value: function _parseDateFromJSONObject(dateObject) {
      if (dateObject.$type === 'date') {
        if (typeof dateObject.$date === 'string') {
          var maybeDate = new Date(Date.parse(dateObject.$date));
          if (!isNaN(maybeDate.getTime())) {
            return maybeDate;
          }
        }
      }
      return null;
    }
  }, {
    key: '_fromJSONObject',
    value: function _fromJSONObject(eventJson) {
      var output = {};
      var keys = Object.keys(eventJson);
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = keys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _key = _step2.value;

          var _value = eventJson[_key];
          if (typeof _value === 'boolean') {
            output[_key] = _value;
          } else if (typeof _value === 'number') {
            output[_key] = _value;
          } else if (typeof _value === 'string') {
            output[_key] = _value;
          } else if ((typeof _value === 'undefined' ? 'undefined' : _typeof(_value)) === 'object' && _value !== null) {
            var date = this._parseDateFromJSONObject(_value);
            if (date) {
              output[_key] = date;
            }
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return output;
    }
  }, {
    key: '_toJSONObject',
    value: function _toJSONObject(event) {
      var output = {};
      var keys = Object.keys(event);
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = keys[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _key2 = _step3.value;

          var _value2 = event[_key2];
          if (typeof _value2 === 'boolean') {
            output[_key2] = _value2;
          } else if (typeof _value2 === 'number') {
            output[_key2] = _value2;
          } else if (typeof _value2 === 'string') {
            output[_key2] = _value2;
          } else if (_value2 instanceof Date) {
            output[_key2] = this._serializeDateToJSONObject(_value2);
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return output;
    }
  }, {
    key: '_serializeEvents',
    value: function _serializeEvents(events) {
      var root = {
        events: []
      };
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = events[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var event = _step4.value;

          var eventJSON = this._toJSONObject(event);
          if (eventJSON) {
            root.events.push(eventJSON);
          }
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      return root;
    }
  }, {
    key: '_persist',
    value: function _persist() {
      var serializedFormat = this._serializeEvents(this._events);
      var value = JSON.stringify(serializedFormat);
      this._syncStorage.setItem(STORAGE_KEY, value);
      return Promise.resolve();
    }
  }, {
    key: '_dropIfNeeded',
    value: function _dropIfNeeded() {
      if (this._events.length > DEFAULT_MAX_LENGTH) {
        var originalLength = this._events.length;
        var startIndex = originalLength - DEFAULT_MAX_LENGTH;
        this._events = this._events.slice(startIndex);
      }
      return Promise.resolve();
    }
  }, {
    key: '_flushIfHasSomeEvents',
    value: function _flushIfHasSomeEvents() {
      if (this._events.length <= 0) {
        return Promise.resolve();
      }
      return this._flush();
    }
  }, {
    key: '_flushIfEnough',
    value: function _flushIfEnough() {
      if (this._events.length < DEFAULT_FLUSH_LIMIT) {
        return Promise.resolve();
      }
      return this._flush();
    }
  }, {
    key: '_flush',
    value: function _flush() {
      var _this2 = this;

      var events = this._events.slice(0, DEFAULT_UPLOAD_LIMIT);
      if (events.length <= 0) {
        return Promise.resolve();
      }
      var serializedFormat = this._serializeEvents(events);
      var value = JSON.stringify(serializedFormat);
      return fetch(this._endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: value,
        mode: 'cors'
      }).then(function () {
        _this2._events = _this2._events.slice(events.length);
        return _this2._persist();
      }, function (error) {
        return Promise.reject(error);
      });
    }
  }, {
    key: '_addAndDrop',
    value: function _addAndDrop(event) {
      this._events.push(event);
      return this._dropIfNeeded();
    }
  }, {
    key: '_doWrite',
    value: function _doWrite(event) {
      var _this3 = this;

      return this._addAndDrop(event).then(function () {
        return _this3._persist();
      }).then(function () {
        return _this3._flushIfEnough();
      });
    }
  }, {
    key: 'write',
    value: function write(event) {
      var _this4 = this;

      this._executor.submit(function () {
        return _this4._doWrite(event);
      });
    }
  }]);

  return Writer;
}();

var SkygearEventTracker = function () {
  function SkygearEventTracker(container) {
    _classCallCheck(this, SkygearEventTracker);

    this._container = container;
    var endpoint = this._container.endPoint.replace(/\/$/, '') + DEFAULT_MOUNT_PATH;
    this._writer = new Writer(new WindowLocalStorage(), endpoint);
  }

  _createClass(SkygearEventTracker, [{
    key: '_generateEnvironmentContext',
    value: function _generateEnvironmentContext() {
      return {
        _page_path: getPagePathname(),
        _page_search: getPageSearch(),
        _page_url: getPageURL(),
        _page_referrer: getPageReferrer(),
        _utm_campaign: getUTMCampaign(),
        _utm_channel: getUTMChannel(),
        _user_agent: getUserAgent()
      };
    }
  }, {
    key: '_sanitizeUserDefinedAttributes',
    value: function _sanitizeUserDefinedAttributes(attributes) {
      if (!attributes) {
        return {};
      }
      var output = {};
      var keys = Object.keys(attributes);
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = keys[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var _key3 = _step5.value;

          var _value3 = attributes[_key3];
          if (typeof _value3 === 'boolean') {
            output[_key3] = _value3;
          } else if (typeof _value3 === 'number') {
            output[_key3] = _value3;
          } else if (typeof _value3 === 'string') {
            output[_key3] = _value3;
          }
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      return output;
    }
  }, {
    key: 'track',
    value: function track(eventName, attributes) {
      if (!eventName) {
        return;
      }
      var sanitizedAttributes = this._sanitizeUserDefinedAttributes(attributes);
      var environmentContext = this._generateEnvironmentContext();
      var baseEvent = {
        _tracked_at: new Date(),
        _event_raw: eventName,
        _user_id: this._container.currentUser && this._container.currentUser.id
      };
      var event = objectAssign({}, sanitizedAttributes, environmentContext, baseEvent);
      this._writer.write(event);
    }
  }]);

  return SkygearEventTracker;
}();

exports.SkygearEventTracker = SkygearEventTracker;
