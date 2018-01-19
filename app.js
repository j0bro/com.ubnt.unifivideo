'use strict';

const Homey = require('homey');
const UfvApi = require('./lib/ufvapi');

class UniFiVideo extends Homey.App {

    onInit() {
        this.ufv = new UfvApi();
        this.ufv.SetApiKey(Homey.ManagerSettings.get('ufv_apikey') || '');
        this.ufv.Discover();

        Homey.ManagerSettings.on('set', key => {
            switch (key) {
                case 'ufv_apikey':
                    this.ufv.SetApiKey(Homey.ManagerSettings.get('ufv_apikey'));
                    break;
                case 'ufv_nvr_ip':
                    this.ufv.SetNvrIp(Homey.ManagerSettings.get('ufv_nvr_ip'));
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
        this.log('UniFi Video is running.');
    }
}

module.exports = UniFiVideo;