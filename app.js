'use strict';

const Homey = require('homey');

class UniFiVideo extends Homey.App {

    onInit() {
        this.snapshotToken = new Homey.FlowToken('unifi_video_snapshot', {
            type: 'image',
            title: 'Snapshot'
        });

        Homey.ManagerFlow.registerToken(this.snapshotToken);

        if (Homey.env.DEBUG) {
            require('inspector').open(9229, '0.0.0.0');
        }

        this.log('UniFi Video is running...');
    }
}

module.exports = UniFiVideo;