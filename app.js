'use strict';

const Homey = require('homey');
const UfvApi = require('./lib/ufvapi');
const UfvConstants = require('./lib/ufvconstants');

class UniFiVideo extends Homey.App {
  async onInit() {
    // 1 pristine start - no devices paired yet
    // 1.1 user pairs NVR
    // 1.1.1 discover NVR
    // 1.1.2 login
    // 1.1.3 get bootstrap
    // 1.1.4 save NVR
    // 1.1.5 pair NVR
    // 1.2 user pairs Camera
    // 1.2.1 -> 1.1.1 thru 1.1.5
    // 1.2.2 pair camera(s)
    // 2 subsequent starts - NVR saved and logged in
    // 2.1 user pairs NVR
    // 2.1.1 -> 1.1.1 thru 1.1.5
    // 2.2 user pairs Camera
    // 2.2.1 select paired NVR
    // 2.2.2 get cameras
    // 2.2.3 pair camera(s)
    // 3.1 user deletes NVR
    // 3.1.1 invalidate paired camera(s)
    // 3.2 user deletes camera
    // 3.2.1 delete camera

    // Register snapshot image token
    this.snapshotToken = new Homey.FlowToken('ufv_snapshot', {
      type: 'image',
      title: 'Snapshot',
    });
    Homey.ManagerFlow.registerToken(this.snapshotToken);

    // Single API instance for all devices
    this.api = new UfvApi();

    // Subscribe to connection events
    this.api.on(UfvConstants.EVENT_CONNECTION_ERROR, this._onConnectionError.bind(this));
    this.api.on(UfvConstants.EVENT_CONNECTION_CLOSED, this._onConnectionClosed.bind(this));

    // Subscribe to NVR events
    this.api.on(UfvConstants.EVENT_NVR_CAMERA, this._onNvrCamera.bind(this));
    this.api.on(UfvConstants.EVENT_NVR_HEALTH, this._onNvrHealth.bind(this));
    this.api.on(UfvConstants.EVENT_NVR_MOTION, this._onNvrMotion.bind(this));
    this.api.on(UfvConstants.EVENT_NVR_SERVER, this._onNvrServer.bind(this));

    // Subscribe to credentials updates
    Homey.ManagerSettings.on('set', key => {
      if (key === 'ufv:credentials') {
        this._login();
      }
    });
    this._login();

    // Enable remote debugging, if applicable
    if (Homey.env.DEBUG) {
      // eslint-disable-next-line global-require
      require('inspector').open(9229, '0.0.0.0');
    }
    this.log('UniFi Video is running.');
  }

  _login() {
    this.log('Logging in...');

    // Validate NVR IP address
    const nvrip = Homey.ManagerSettings.get('ufv:nvrip');
    if (!nvrip) {
      this.log('NVR IP address not set.');
      return;
    }

    // Validate NVR credentials
    const credentials = Homey.ManagerSettings.get('ufv:credentials');
    if (!credentials) {
      this.log('Credentials not set.');
      return;
    }

    // Log in to NVR
    this.api.login(nvrip, credentials.username, credentials.password)
      .then(() => {
        this.log('Logged in.');
        this.api.subscribe();
      })
      .catch(error => this.log(error));
  }

  _onConnectionError(error) {
    this.log(`Connection error: ${error.message}, retrying in 5s...`);
    setTimeout(() => this._login(), 5000);
  }

  _onConnectionClosed() {
    this.log('Connection closed, retrying in 5s...');
    setTimeout(() => this._login(), 5000);
  }

  _onNvrCamera(camera) {
    Homey.ManagerDrivers.getDriver('camera').onCamera(camera);
  }

  _onNvrHealth(health) {
    Homey.ManagerDrivers.getDriver('nvr').onHealth(health);
  }

  _onNvrMotion(motion) {
    Homey.ManagerDrivers.getDriver('camera').onMotion(motion);
  }

  _onNvrServer(server) {
    Homey.ManagerDrivers.getDriver('nvr').onServer(server);
  }
}

module.exports = UniFiVideo;
