/* eslint-disable no-console */

'use strict';

const Homey = require('homey');
const UfvApi = require('./lib/ufvapi');
const UfvConstants = require('./lib/ufvconstants');

class UniFiVideo extends Homey.App {
  onInit() {
    this.api = new UfvApi();

    this.api.on(UfvConstants.API_HOST, apihost => {
      console.log('Saving API host in settings.');
      Homey.ManagerSettings.set(UfvConstants.API_HOST, apihost);
    });

    this.api.on(UfvConstants.API_KEY, apikey => {
      console.log('Saving API key in settings.');
      Homey.ManagerSettings.set(UfvConstants.API_KEY, apikey);
    });

    this.api.Discover();

    this.snapshotToken = new Homey.FlowToken('ufv_snapshot', {
      type: 'image',
      title: 'Snapshot',
    });

    Homey.ManagerFlow.registerToken(this.snapshotToken);

    if (Homey.env.DEBUG) {
      // eslint-disable-next-line global-require
      require('inspector').open(9229, '0.0.0.0');
    }
    this.log('[APP] UniFi Video is running.');
  }
}

module.exports = UniFiVideo;
