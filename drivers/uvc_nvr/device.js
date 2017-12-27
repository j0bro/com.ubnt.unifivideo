'use strict';

const Homey = require('homey');

class UvcNvr extends Homey.Device {

    onInit() {
        this._apiKey = Homey.ManagerSettings.get('unifi_video_apikey') || '';
        this._data = this.getData();

        new Homey.FlowCardAction('take_snapshot_nvr')
            .register()
            .registerRunListener((args, state) => {
                this.takeSnapshot(args.camera.mac, args.width);

                return Promise.resolve(true);
            })
            .getArgument('camera')
            .registerAutocompleteListener((query, args) => {
                return this._cameras;
            });
    }

    onAdded() {
        this._get('sysinfo')
            .then((response) => {
                this._systemInfo = JSON.parse(response).data[0];

                this.log('UVC-NVR version: ' + this._systemInfo.version
                    + ', running on: ' + this._systemInfo.platform);
            });

        this._get('server')
            .then((response) => {
                this._server = JSON.parse(response).data[0];

                this.log('Server name: ' + this._server.name
                    + ', model: ' + this._server.model
                    + ', address: ' + this._server.host);
            });

        this._get('camera')
            .then((response) => {
                this._cameras = JSON.parse(response).data;

                for (let i = 0; i < this._cameras.length; i++) {
                    let camera = this._cameras[i];

                    this.log('Camera name: ' + camera.name
                        + ', model: ' + camera.model
                        + ', address: ' + camera.host);
                }
            });
    }

    takeSnapshot(macAddr, widthInPixels) {
        let params = {
            'force': true
        };

        if (widthInPixels && widthInPixels > 0) {
            params.width = widthInPixels;
        }

        this._findCamera(macAddr)
            .then((camera) => {
                this._getBinary('snapshot/camera/' + camera._id, params)
                    .then(buffer => this._onSnapshot(camera, buffer))
                    .catch(this.error.bind(this, 'snapshot.getbinary'));
            })
            .catch(this.error.bind(this, 'camera.find'));
    }

    _findCamera(macAddr) {
        return new Promise((resolve, reject) => {
            if (!this._cameras) {
                reject('No cameras available.');
            }

            for (var i = 0; i < this._cameras.length; i++) {
                let camera = this._cameras[i];

                if (camera.mac === macAddr) {
                    resolve(camera);
                }
            }
            reject('No camera found with MAC address: ' + macAddr);
        });
    }

    _onSnapshot(camera, buffer) {
        let img = new Homey.Image('jpg');

        img.setBuffer(buffer);
        img.register()
            .then(() => {
                let token = new Homey.FlowToken('unifi_video_snapshot', {
                    type: 'image',
                    title: 'Snapshot'
                });

                token
                    .register()
                    .then(() => {
                        token.setValue(img);
                    })
                    .catch(this.error.bind(this, 'token.register'));

                new Homey.FlowCardTrigger('snapshot_created')
                    .register()
                    .trigger({
                        'snapshot_token': img,
                        'snapshot_camera': camera.name
                    });
            })
            .catch(this.error.bind(this, 'snapshot.register'));
    }

    _get(endpoint, params, isBinary = false) {
        let queryString = '?apiKey=' + this._apiKey;

        for (var key in params) {
            let entry = '&' + key + '=' + params[key];
            queryString += entry;
        }

        let url = 'http://' + this._data.ip + ':7080/api/2.0/' + endpoint + queryString;

        return new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? require('https') : require('http');

            const request = lib.get(url, (response) => {
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

    _getBinary(endpoint, params) {
        return this._get(endpoint, params, true);
    }
}

module.exports = UvcNvr;
