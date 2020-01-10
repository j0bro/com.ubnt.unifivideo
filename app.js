'use strict';

const Homey = require('homey');
const UfvApi = require('./lib/ufvapi');
const UfvConstants = require('./lib/ufvconstants');

class UniFiVideo extends Homey.App {
  onInit() {
    // Register snapshot image token
    this.snapshotToken = new Homey.FlowToken('ufv_snapshot', {
      type: 'image',
      title: 'Snapshot',
    });
    Homey.ManagerFlow.registerToken(this.snapshotToken);

    // Enable remote debugging, if applicable
    if (Homey.env.DEBUG) {
      // eslint-disable-next-line global-require
      require('inspector').open(9229, '0.0.0.0');
    }

    // Single API instance for all devices
    this.api = new UfvApi();

    // Subscribe to connection events
    this.api.on(UfvConstants.EVENT_CONNECTION_ERROR, this._onEventConnectionError.bind(this));
    this.api.on(UfvConstants.EVENT_CONNECTION_CLOSED, this._onEventConnectionClosed.bind(this));

    // Subscribe to settings updates
    Homey.ManagerSettings.on('set', key => {
      if (key === 'ufv:credentials' || key === 'ufv:nvrip') {
        this._subscribeToEvents();
      }
    });

    // Subscribe to NVR discovery
    this.api.on(UfvConstants.DEVICE_NVR, nvr => {
      Homey.ManagerSettings.set('ufv:nvrip', nvr.ip);
    });

    // Discover NVR
    this.api.discover();

    this.log('[APP] UniFi Video is running.');
  }

  _subscribeToEvents() {
    const nvrip = Homey.ManagerSettings.get('ufv:nvrip');
    if (!nvrip) {
      this.log('NVR IP address not set.');
      return;
    }

    const credentials = Homey.ManagerSettings.get('ufv:credentials');
    if (!credentials) {
      this.log('Credentials not set.');
      return;
    }

    this.log('Subscribing to events.');
    this.api.login(credentials.username, credentials.password)
      .then(() => this.api.subscribe())
      .catch(error => this.log(error));
  }

  _onEventConnectionClosed() {
    this.log('Event connection closed, retrying in 5s...');
    setTimeout(() => this._subscribeToEvents(), 5000);
  }

  _onEventConnectionError(error) {
    this.log(`Event connection error: ${error.message}, retrying in 5s...`);
    setTimeout(() => this._subscribeToEvents(), 5000);
  }
}

module.exports = UniFiVideo;
