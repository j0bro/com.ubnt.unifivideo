'use strict';

const Homey = require('homey');
const UfvApi = require('./lib/ufvapi');

class UniFiVideo extends Homey.App {

    onInit() {
        this.ufv = new UfvApi();
        this.ufv.SetApiKey(Homey.ManagerSettings.get('unifi_video_apikey') || '');

        this.snapshotToken = new Homey.FlowToken('unifi_video_snapshot', {
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