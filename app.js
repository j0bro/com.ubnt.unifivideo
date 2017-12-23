'use strict';

const Homey = require('homey');

class UniFiVideo extends Homey.App {

    onInit() {
        this.log('UniFi Video is running...');
        
        if (Homey.env.DEBUG) {
            require('inspector').open(9229, '0.0.0.0');
        }
    }
}

module.exports = UniFiVideo;