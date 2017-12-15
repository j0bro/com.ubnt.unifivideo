'use strict';

const Homey = require('homey');

class UvcNvr extends Homey.Device {

    onInit() {
        this._apiKey = Homey.ManagerSettings.get('unifi_video_apikey') || '';
        this._data = this.getData();
    }

    onAdded() {
        this._systemInfo = this._getSystemInfo()
            .then(() => {
                this.log('Added NVR version:', this._systemInfo.version);
            });
    }

    _getSystemInfo() {
        return this._httpGet('http://' + this._data.ip + ':7080/api/2.0/sysinfo?apiKey=' + this._apiKey)
            .then((response) => {
                this._systemInfo = JSON.parse(response).data[0];
            })
            .catch((error) => this.error(error));
    }

    _httpGet(url) {
        return new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? require('https') : require('http');
            const request = lib.get(url, (response) => {
                if (response.statusCode < 200 || response.statusCode > 299) {
                    reject(new Error('Failed to load page, status code: ' + response.statusCode));
                }

                const body = [];

                response.on('data', (chunk) => body.push(chunk));
                response.on('end', () => resolve(body.join('')));
            });
            request.on('error', (err) => reject(err));
        });
    }
}

module.exports = UvcNvr;