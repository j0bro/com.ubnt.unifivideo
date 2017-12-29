'use strict';

const { EventEmitter } = require('events');
const UfvDiscovery = require('./ufvdiscovery');

const UVC_NVR = 'UniFi Video';
const UVC_G3 = 'UVC G3';

class UfvApi extends EventEmitter {

    constructor() {
        super();

        let discovery = new UfvDiscovery();

        discovery.on('device', device => {
            if (device && device.platform === UVC_NVR) {
                this._nvr = device;
                this.emit('nvr', this._nvr);
            }
        });

        discovery.start();
    }

    _getBinary(endpoint, params) {
        return this._get(endpoint, params, true);
    }

    _get(endpoint, params = {}, isBinary = false) {
        return new Promise((resolve, reject) => {
            if (!this._apiKey) reject('API key not set.');

            let queryString = '?apiKey=' + this._apiKey;

            for (var key in params) {
                let entry = '&' + key + '=' + params[key];
                queryString += entry;
            }
            let url = 'http://' + this._nvr.ip + ':7080/api/2.0/' + endpoint + queryString;

            let lib = url.startsWith('https') ? require('https') : require('http');
            let request = lib.get(url, (response) => {
                if (response.statusCode < 200 || response.statusCode > 299) {
                    reject(new Error('Failed to load page, status code: ' + response.statusCode));
                }
                let data = [];

                response.on('data', (chunk) => data.push(chunk));
                response.on('end', () => {
                    if (isBinary) {
                        resolve(Buffer.concat(data));
                    } else {
                        resolve(data.join(''));
                    }
                });
            });
            request.on('error', (err) => reject(err));
        });
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

            return this._getBinary('snapshot/camera/' + camera._id, params)
                .then(buffer => resolve(buffer))
                .catch(() => reject('Error obtaining snapshot buffer.'));
        });
    }

    SetApiKey(apiKey) {
        if (!apiKey || apiKey === '') {
            throw 'Invalid API key.';
        }
        this._apiKey = apiKey;
    }
}

module.exports = UfvApi;