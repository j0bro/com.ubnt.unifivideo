'use strict';

const http = require('http');
const { EventEmitter } = require('events');
const UfvDiscovery = require('./ufvdiscovery');
const UfvConstants = require('./ufvconstants');

const UFV_API_ENDPOINT = '/api/2.0/';
const UFV_API_PORT = 7080;

const UVC_NVR = 'UniFi Video';
const UVC_G3 = 'UVC G3';
const UVC_G3_DOME = 'UVC G3 Dome';
const UVC_G3_PRO = 'UVC G3 Pro';
const UVC_G4_PRO = 'UVC G4 Pro';

class UfvApi extends EventEmitter {

    _download(resource, params) {
        return this._get(resource, params, true);
    }

    _get(resource, params = {}, isBinary = false) {
        return new Promise((resolve, reject) => {
            if (!this._apihost) reject(new Error('Invalid API host.'));
            if (!this._apikey) reject(new Error('Invalid API key.'));

            let queryString = '?apiKey=' + this._apikey;

            for (var key in params) {
                let entry = '&' + key + '=' + params[key];
                queryString += entry;
            }

            let options = {
                host: this._apihost,
                port: UFV_API_PORT,
                path: UFV_API_ENDPOINT + resource + queryString,
                method: 'GET',
                headers: {
                    'Accept': isBinary ? '*/*' : 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            let req = http.request(options, res => {
                if (res.statusCode !== 200) {
                    reject(new Error('Failed to GET url: ' + options.host + options.path + ' (status code: ' + res.statusCode + ')'));
                }
                let data = [];

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

            let body = JSON.stringify(payload);

            let options = {
                host: this._apihost,
                port: UFV_API_PORT,
                path: UFV_API_ENDPOINT + resource + '?apiKey=' + this._apikey,
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            let req = http.request(options, res => {
                if (res.statusCode !== 200) {
                    reject(new Error('Failed to PUT to url: ' + options.host + options.path + ' (status code: ' + res.statusCode + ')'));
                }
                res.setEncoding('utf8');
                let data = [];

                res.on('data', chunk => data.push(chunk));
                res.on('end', () => resolve(data.join('')));
            });

            req.on('error', error => reject(error));
            req.write(body);
            req.end();
        });
    }

    Discover() {
        let discovery = new UfvDiscovery();

        discovery.on(UfvConstants.DEVICE, device => {
            console.log('Discovered device: ' + device.hostname);

            switch (device.platform) {
                case UVC_G3:
                case UVC_G3_PRO:
                case UVC_G3_DOME:
                case UVC_G4_PRO:
                    this.emit(UfvConstants.DEVICE_UVCG3, device);
                    break;

                case UVC_NVR:
                    this._apihost = device.ip;
                    this.emit(UfvConstants.API_HOST, this._apihost);
                    break;

                default:
                    console.log('Unsupported device: ' + device.platform);
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
                    let result = JSON.parse(response).data[0];

                    if (result) {
                        resolve(result);
                    } else {
                        reject('Error obtaining sysinfo.');
                    }
                })
                .catch(error => reject(error));
        });
    }

    GetServer() {
        return new Promise((resolve, reject) => {
            this._get('server')
                .then(response => {
                    let result = JSON.parse(response).data[0];

                    if (result) {
                        resolve(result);
                    } else {
                        reject('Error obtaining server.');
                    }
                })
                .catch(error => reject(error));
        });
    }

    GetCameras() {
        return new Promise((resolve, reject) => {
            this._get('camera')
                .then(response => {
                    let result = JSON.parse(response).data;

                    if (result) {
                        resolve(result);
                    } else {
                        reject('Error obtaining cameras.');
                    }
                })
                .catch(error => reject(error));
        });
    }

    FindCamera(macAddress) {
        return new Promise((resolve, reject) => {
            this.GetCameras()
                .then(cameras => {
                    for (var i = 0; i < cameras.length; i++) {
                        let camera = cameras[i];

                        if (camera.mac === macAddress) {
                            resolve(camera);
                        }
                    }
                    reject('No camera found with MAC address: ' + macAddress);
                })
                .catch(() => reject('No cameras available.'));
        });
    }

    Snapshot(camera, widthInPixels) {
        return new Promise((resolve, reject) => {
            if (!camera) reject('Invalid camera');

            let params = {
                'force': true
            };

            if (widthInPixels && widthInPixels > 0) {
                params.width = widthInPixels;
            }

            return this._download('snapshot/camera/' + camera._id, params)
                .then(buffer => resolve(buffer))
                .catch(error => reject('Error obtaining snapshot buffer: ' + error));
        });
    }

    SetRecordingMode(camera, isFullTimeEnabled = false, isMotionEnabled = false) {
        return new Promise((resolve, reject) => {
            let payload = {
                'name': camera.name,
                'recordingSettings': {
                    'fullTimeRecordEnabled': isFullTimeEnabled,
                    'motionRecordEnabled': isMotionEnabled,
                    'channel': 0
                }
            };

            return this._put('camera/' + camera._id, payload)
                .then(() => resolve('Recording mode successfully set.'))
                .catch(error => reject('Error setting recording mode: ' + error));
        });
    }

    SetApiKey(apikey) {
        console.log('SetApiKey: ' + apikey);
        this._apikey = apikey;
    }
    
    SetApiHost(apihost) {
        console.log('SetApiHost: ' + apihost);
        this._apihost = apihost;
    }
}

module.exports = UfvApi;