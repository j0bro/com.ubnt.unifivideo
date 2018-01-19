'use strict';

const Homey = require('homey');
const UfvApi = require('./lib/ufvapi');

const UFV_API_KEY = 'ufv_apikey';
const UFV_NVR = 'ufv_nvr';
const UFV_NVR_IP = 'ufv_nvr_ip';
const UFV_NVR_UPDATED = 'ufv_nvr_updated';

class UniFiVideo extends Homey.App {

    onInit() {
        this.ufv = new UfvApi();        
        this.ufv.on(UFV_NVR_UPDATED, nvr => Homey.ManagerSettings.set(UFV_NVR, nvr));
        this.ufv.Discover();

        Homey.ManagerSettings.on('set', key => {
            switch (key) {
                case UFV_API_KEY:
                    this.ufv.SetApiKey(Homey.ManagerSettings.get(UFV_API_KEY));
                    break;

                case UFV_NVR_IP:
                    this.ufv.SetNvrIp(Homey.ManagerSettings.get(UFV_NVR_IP));
                    break;
            }
        });

        this.snapshotToken = new Homey.FlowToken('ufv_snapshot', {
            type: 'image',
            title: 'Snapshot'
        });

        Homey.ManagerFlow.registerToken(this.snapshotToken);

        if (Homey.env.DEBUG) {
            require('inspector').open(9229, '0.0.0.0');
        }
        this.log('[APP] UniFi Video is running.');
    }
}

module.exports = UniFiVideo;