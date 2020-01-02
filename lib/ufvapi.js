/* eslint-disable no-console */

'use strict';

const http = require('http');
const { EventEmitter } = require('events');
const UfvDiscovery = require('./ufvdiscovery');
const UfvConstants = require('./ufvconstants');

const UFV_API_ENDPOINT = '/api/2.0/';
const UFV_API_PORT = 7080;

class UfvApi extends EventEmitter {
  _download(resource, params) {
    return this._get(resource, params, true);
  }

  _get(resource, params = {}, isBinary = false) {
    return new Promise((resolve, reject) => {
      if (!this._apihost) reject(new Error('Invalid API host.'));
      if (!this._apikey) reject(new Error('Invalid API key.'));

      let queryString = `?apiKey=${this._apikey}`;
      queryString += Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');

      const options = {
        host: this._apihost,
        port: UFV_API_PORT,
        path: UFV_API_ENDPOINT + resource + queryString,
        method: 'GET',
        headers: {
          Accept: isBinary ? '*/*' : 'application/json',
          'Content-Type': 'application/json',
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
      if (!this._apihost) reject(new Error('Invalid API host.'));
      if (!this._apikey) reject(new Error('Invalid API key.'));

      const body = JSON.stringify(payload);

      const options = {
        host: this._apihost,
        port: UFV_API_PORT,
        path: `${UFV_API_ENDPOINT + resource}?apiKey=${this._apikey}`,
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
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

  Discover() {
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
          this._apihost = device.ip;
          this.emit(UfvConstants.API_HOST, this._apihost);
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

  GetSysInfo() {
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

  GetServer() {
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

  GetCameras() {
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

  FindCamera(macAddress) {
    return new Promise((resolve, reject) => {
      this.GetCameras()
        .then(cameras => {
          for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];

            if (camera.mac === macAddress) {
              resolve(camera);
            }
          }
          reject(new Error(`No camera found with MAC address: ${macAddress}`));
        })
        .catch(() => reject(new Error('No cameras available.')));
    });
  }

  Snapshot(camera, widthInPixels) {
    return new Promise((resolve, reject) => {
      if (!camera) reject(new Error('Invalid camera'));

      const params = {
        force: true,
      };

      if (widthInPixels && widthInPixels > 0) {
        params.width = widthInPixels;
      }

      return this._download(`snapshot/camera/${camera._id}`, params)
        .then(buffer => resolve(buffer))
        .catch(error => reject(new Error(`Error obtaining snapshot buffer: ${error}`)));
    });
  }

  SnapshotUrl(camera, widthInPixels, force = false) {
    return new Promise((resolve, reject) => {
      if (!camera) reject(new Error('Invalid camera'));
      if (!this._apihost) reject(new Error('Invalid API host.'));
      if (!this._apikey) reject(new Error('Invalid API key.'));

      let queryString = `?force=true&apiKey=${this._apikey}&width=${widthInPixels}`;

      if (widthInPixels && widthInPixels > 0) {
        queryString = `${queryString}&width=${widthInPixels}`;
      }

      if (force) {
        queryString = `${queryString}&force=true`;
      }

      const url = `http://${this._apihost}:${UFV_API_PORT}${UFV_API_ENDPOINT}snapshot/camera/${camera._id}${queryString}`;

      resolve(url);
    });
  }

  SetRecordingMode(camera, isFullTimeEnabled = false, isMotionEnabled = false) {
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

  SetApiKey(apikey) {
    console.log(`SetApiKey: ${apikey}`);
    this._apikey = apikey;
  }

  SetApiHost(apihost) {
    console.log(`SetApiHost: ${apihost}`);
    this._apihost = apihost;
  }

  GetApiHost() {
    return this._apihost;
  }
}

module.exports = UfvApi;
