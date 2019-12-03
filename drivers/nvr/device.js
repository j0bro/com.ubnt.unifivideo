'use strict';

const Homey = require('homey');
const Api = Homey.app.api;
const UfvConstants = require('../../lib/ufvconstants');
const fetch = require('node-fetch');

class Nvr extends Homey.Device {

    async onInit() {
        let apiHost = Homey.ManagerSettings.get(UfvConstants.API_HOST);
        let apiKey = Homey.ManagerSettings.get(UfvConstants.API_KEY);

        Api.SetApiHost(apiHost);
        Api.SetApiKey(apiKey);

        Api.on(UfvConstants.API_HOST, this._updateModel.bind(this));
        Api.on(UfvConstants.API_KEY, this._updateModel.bind(this));
    }

    _updateModel() {
        Api.GetSysInfo()
            .then(sysinfo => {
                if (Homey.env.DEBUG) {
                    this.log('[DEVICE] UVC-NVR found running UniFi Video version: ' + sysinfo.version);
                }
            })
            .catch(this.error.bind(this, '[sysinfo]'));

        Api.GetServer()
            .then(server => {
                if (Homey.env.DEBUG) {
                    this.log('[DEVICE] Server name: ' + server.name + ', address: ' + server.host);
                }
            })
            .catch(this.error.bind(this, '[server]'));

        Api.GetCameras()
            .then(cameras => {
                this._cameras = cameras;

                if (Homey.env.DEBUG) {
                    for (let i = 0; i < this._cameras.length; i++) {
                        let camera = this._cameras[i];

                        this.log('[DEVICE] Camera name: ' + camera.name
                            + ', model: ' + camera.model
                            + ', address: ' + camera.host);
                    }
                }
            })
            .catch(this.error.bind(this, '[camera]'));
    }
}

module.exports = Nvr;
