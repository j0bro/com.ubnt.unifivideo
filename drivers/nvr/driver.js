'use strict';

const Homey = require('homey');
const UfvConstants = require('../../lib/ufvconstants');

class NvrDriver extends Homey.Driver {
  onInit() {
    this.nvr = null;
    this.api = Homey.app.api;
    this.nvr = null;
  }

  async onPairListDevices(data, callback) {
    this.api.on(UfvConstants.DEVICE_NVR, nvr => {
      this.nvr = nvr;

      callback(null, [
        {
          name: nvr.hostname,
          data: { id: String(nvr.mac) },
        },
      ]);
    });

    this.api.discover();
  }

  onHealth(health) {
    if (!this.nvr) return;

    const device = this.getDevice({ id: String(this.nvr.mac) });
    if (device instanceof Error) return;

    device.onHealth(health);
  }

  onServer(server) {
    if (!this.nvr) return;

    const device = this.getDevice({ id: String(this.nvr.mac) });
    if (device instanceof Error) return;

    device.onServer(server);
  }
}

module.exports = NvrDriver;
