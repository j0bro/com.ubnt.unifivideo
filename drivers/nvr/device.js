'use strict';

const Homey = require('homey');
const UfvConstants = require('../../lib/ufvconstants');

const Api = Homey.app.api;

class Nvr extends Homey.Device {
  async onInit() {
    Api.on(UfvConstants.EVENT_NVR_HEALTH, this._onHealthEvent.bind(this));
    Api.on(UfvConstants.EVENT_NVR_SERVER, this._onServerEvent.bind(this));
    Api.on(UfvConstants.EVENT_NVR_OTHER, this._onOtherEvent.bind(this));
  }

  _onHealthEvent(health) {
    this.log(`[NVR] HEALTH: status=[${health.status}], statusPhrase=[${health.statusPhrase}]`);
  }

  _onServerEvent(server) {
    this.log(`[NVR] SERVER: cpuLoad=[${server.systemInfo.cpuLoad}]`);
  }

  _onOtherEvent(other) {
    this.log(`[NVR] OTHER: ${JSON.stringify(other, null, 2)}]`);
  }
}

module.exports = Nvr;
