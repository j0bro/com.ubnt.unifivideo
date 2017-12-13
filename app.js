'use strict';

const Homey = require('homey');

class UniFiVideo extends Homey.App {
	
    onInit() {
        this.log('UniFi Video is running...');
    }
}

module.exports = UniFiVideo;