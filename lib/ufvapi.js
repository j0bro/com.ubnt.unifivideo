/* eslint-disable no-console */

'use strict';

const http = require('http');
const WebSocket = require('ws');
const { EventEmitter } = require('events');
const UfvDiscovery = require('./ufvdiscovery');
const UfvConstants = require('./ufvconstants');

const UFV_API_ENDPOINT = '/api/2.0';
const UFV_API_PORT = 7080;

class UfvApi extends EventEmitter {
  constructor() {
    super();
    this._apikey = null;
    this._cookie = null;
  }

  _download(resource, params) {
    return this._get(resource, params, true);
  }

  _get(resource, params = {}, isBinary = false) {
    return new Promise((resolve, reject) => {
      if (!this._host) reject(new Error('Invalid host.'));
      if (!this._cookie) reject(new Error('Not logged in.'));

      // eslint-disable-next-line no-param-reassign
      params.apiKey = this._apikey;

      const options = {
        host: this._host,
        port: UFV_API_PORT,
        path: `${UFV_API_ENDPOINT}/${resource}${this._toQueryString(params)}`,
        method: 'GET',
        headers: {
          Accept: isBinary ? '*/*' : 'application/json',
          'Content-Type': 'application/json',
          Cookie: this._cookie,
        },
      };

      const req = http.request(options, res => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to GET url: ${options.host}${options.path} (status code: ${res.statusCode})`));
        }
        const data = [];

        res.on('data', chunk => data.push(chunk));
        res.on('end', () => {
          if (isBinary) {
            resolve(Buffer.concat(data));
          } else {
            resolve(data.join(''));
          }
        });
      });

      req.on('error', error => reject(error));
      req.end();
    });
  }

  _put(resource, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this._host) reject(new Error('Invalid host.'));
      if (!this._cookie) reject(new Error('Not logged in.'));

      const body = JSON.stringify(payload);

      const params = {
        apiKey: this._apikey,
      };

      const options = {
        host: this._host,
        port: UFV_API_PORT,
        path: `${UFV_API_ENDPOINT}/${resource}${this._toQueryString(params)}}`,
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Cookie: this._cookie,
        },
      };

      const req = http.request(options, res => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to PUT to url: ${options.host}${options.path} (status code: ${res.statusCode})`));
        }
        res.setEncoding('utf8');
        const data = [];

        res.on('data', chunk => data.push(chunk));
        res.on('end', () => resolve(data.join('')));
      });

      req.on('error', error => reject(error));
      req.write(body);
      req.end();
    });
  }

  _toQueryString(obj) {
    if (obj === null || typeof obj === 'undefined' || Object.keys(obj).length === 0) {
      return '';
    }
    return `?${Object.keys(obj).map(k => `${k}=${encodeURIComponent(obj[k])}`).join('&')}`;
  }

  discover() {
    const discovery = new UfvDiscovery();

    discovery.on(UfvConstants.DEVICE_ANY, device => {
      console.log(`Discovered device: ${device.hostname} (${device.platform})`);

      switch (device.platform) {
        case UfvConstants.PLATFORM_UVC_G3:
        case UfvConstants.PLATFORM_UVC_G3_PRO:
        case UfvConstants.PLATFORM_UVC_G3_DOME:
        case UfvConstants.PLATFORM_UVC_G3_FLEX:
        case UfvConstants.PLATFORM_UVC_G3_MICRO:
        case UfvConstants.PLATFORM_UVC_G4_PRO:
          this.emit(UfvConstants.DEVICE_CAMERA, device);
          break;

        case UfvConstants.PLATFORM_UVC_NVR:
          this._host = device.ip;
          this.emit(UfvConstants.DEVICE_NVR, device);
          break;

        default:
          console.warn(`Unsupported device: ${device.platform}`);
          break;
      }
    });

    discovery.scan()
      .then(() => console.log('Done scanning for devices.'))
      .catch(error => console.error(error));
  }

  login(username, password) {
    console.log('Logging in.');

    return new Promise((resolve, reject) => {
      if (this._cookie) resolve('Already logged in.');
      if (!this._host) reject(new Error('Invalid host.'));

      const options = {
        host: this._host,
        port: UFV_API_PORT,
        path: `${UFV_API_ENDPOINT}/login`,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, res => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed: ${options.host}${options.path} (status code: ${res.statusCode})`));
          return;
        }
        const body = [];

        res.on('data', chunk => body.push(chunk));
        res.on('end', () => {
          const json = JSON.parse(body);

          // Obtain session cookie
          res.rawHeaders.forEach((item, index) => {
            if (item.toLowerCase() === 'set-cookie') {
              this._cookie = res.rawHeaders[index + 1];
            }
          });

          if (this._cookie === null) {
            reject(new Error('Invalid session cookie.'));
          }

          // Obtain API key
          const userdata = json.data.find(user => {
            return user.account.username === username;
          });

          if (typeof userdata !== 'undefined') {
            this._apikey = userdata.apiKey;
          }

          if (this._apikey === null) {
            reject(new Error(`API key not found for user ${username}`));
          }

          // Everything OK
          resolve('Logged in.');
        });
      });

      req.on('error', error => {
        reject(error);
      });

      const credentials = {
        email: username,
        password,
      };
      req.write(JSON.stringify(credentials));
    });
  }

  subscribe() {
    return new Promise((resolve, reject) => {
      if (!this._host) reject(new Error('Invalid host.'));
      if (!this._cookie) reject(new Error('Not logged in.'));

      let keepalive = null;
      const connection = new WebSocket(`wss://${this._host}:7443/ws/update?compress=false`, {
        rejectUnauthorized: false,
        headers: {
          Cookie: this._cookie,
        },
      });

      connection.onopen = () => {
        const ping = () => connection.send('ping');
        keepalive = setInterval(ping, 5000);
        ping();

        resolve('Subscribed.');
      };

      connection.onerror = error => {
        clearInterval(keepalive);
        reject(error);
      };

      connection.onclose = () => {
        this.emit(UfvConstants.EVENT_CONNECTION_CLOSED, null);
        clearInterval(keepalive);
      };

      connection.onmessage = e => {
        if (e.data === 'pong') {
          this.emit(UfvConstants.EVENT_CONNECTION_KEEPALIVE, null);
          return;
        }

        const evt = JSON.parse(e.data);

        switch (evt.dataType) {
          case 'camera':
            this.emit(UfvConstants.EVENT_NVR_CAMERA, evt.data);
            break;
          case 'health':
            this.emit(UfvConstants.EVENT_NVR_HEALTH, evt.data);
            break;
          case 'motion':
            this.emit(UfvConstants.EVENT_NVR_MOTION, evt.data);
            break;
          case 'recording':
            this.emit(UfvConstants.EVENT_NVR_RECORDING, evt.data);
            break;
          case 'server':
            this.emit(UfvConstants.EVENT_NVR_SERVER, evt.data);
            break;
          default:
            this.emit(UfvConstants.EVENT_NVR_OTHER, evt.data);
            break;
        }
      };
    });
  }

  getSysInfo() {
    return new Promise((resolve, reject) => {
      this._get('sysinfo')
        .then(response => {
          const result = JSON.parse(response).data[0];

          if (result) {
            resolve(result);
          } else {
            reject(new Error('Error obtaining sysinfo.'));
          }
        })
        .catch(error => reject(error));
    });
  }

  getServer() {
    return new Promise((resolve, reject) => {
      this._get('server')
        .then(response => {
          const result = JSON.parse(response).data[0];

          if (result) {
            resolve(result);
          } else {
            reject(new Error('Error obtaining server.'));
          }
        })
        .catch(error => reject(error));
    });
  }

  findCameraById(id) {
    return new Promise((resolve, reject) => {
      this._get(`camera/${id}`)
        .then(response => {
          const result = JSON.parse(response).data;

          if (result) {
            resolve(result);
          } else {
            reject(new Error('Error obtaining cameras.'));
          }
        })
        .catch(error => reject(error));
    });
  }

  getCameras() {
    return new Promise((resolve, reject) => {
      this._get('camera')
        .then(response => {
          const result = JSON.parse(response).data;

          if (result) {
            resolve(result);
          } else {
            reject(new Error('Error obtaining cameras.'));
          }
        })
        .catch(error => reject(error));
    });
  }

  snapshot(id, widthInPixels = 1920) {
    return new Promise((resolve, reject) => {
      if (!id) reject(new Error('Invalid camera identifier.'));

      const params = {
        apiKey: this._apikey,
        force: true,
        width: widthInPixels,
      };

      return this._download(`snapshot/camera/${id}`, params)
        .then(buffer => resolve(buffer))
        .catch(error => reject(new Error(`Error obtaining snapshot buffer: ${error}`)));
    });
  }

  createSnapshotUrl(camera, widthInPixels = 1920) {
    return new Promise((resolve, reject) => {
      if (!this._host) reject(new Error('Invalid host.'));
      if (!camera) reject(new Error('Invalid camera'));

      const params = {
        apiKey: this._apikey,
        force: true,
        width: widthInPixels,
      };
      resolve(`http://${this._host}:${UFV_API_PORT}${UFV_API_ENDPOINT}/snapshot/camera/${camera._id}${this._toQueryString(params)}`);
    });
  }

  setRecordingMode(camera, isFullTimeEnabled = false, isMotionEnabled = false) {
    return new Promise((resolve, reject) => {
      const payload = {
        name: camera.name,
        recordingSettings: {
          fullTimeRecordEnabled: isFullTimeEnabled,
          motionRecordEnabled: isMotionEnabled,
          channel: 0,
        },
      };

      return this._put(`camera/${camera._id}`, payload)
        .then(() => resolve('Recording mode successfully set.'))
        .catch(error => reject(new Error(`Error setting recording mode: ${error}`)));
    });
  }

  getApiHost() {
    return this._host;
  }
}

module.exports = UfvApi;
