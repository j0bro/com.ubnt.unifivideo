/* eslint-disable no-console */

'use strict';

const UfvApi = require('./ufvapi');
const UfvConstants = require('./ufvconstants');
const UfvEvents = require('./ufvevents');

const api = new UfvApi();

const log = msg => {
  const t = new Date().toLocaleTimeString();
  console.info(`[${t}] ${msg}`);
};

api.on(UfvConstants.API_HOST, apihost => {
  const events = new UfvEvents();
  const start = () => events.start(apihost, 'homey', 'superslim');

  events.on(UfvConstants.EVENT_CONNECTION_KEEPALIVE, () => {
    log('CONNECTION KEEPALIVE');
  });

  events.on(UfvConstants.EVENT_CONNECTION_CLOSED, () => {
    log('CONNECTION CLOSED; retrying in 5s...');
    setTimeout(start, 5000);
  });

  events.on(UfvConstants.EVENT_CONNECTION_ERROR, error => {
    log(`CONNECTION ERROR: ${error.message}`);
  });

  events.on(UfvConstants.EVENT_NVR_CAMERA, camera => {
    log(`CAMERA: name=[${camera.name}], recordingIndicator=[${camera.recordingIndicator}]`);
  });

  events.on(UfvConstants.EVENT_NVR_HEALTH, health => {
    log(`HEALTH: status=[${health.status}], statusPhrase=[${health.statusPhrase}]`);
  });

  events.on(UfvConstants.EVENT_NVR_MOTION, motion => {
    if (motion.endTime === 0) {
      log(`MOTION STARTED: cameraId=[${motion.cameraId}]`);
    } else {
      log(`MOTION ENDED: cameraId=[${motion.cameraId}]`);
    }
  });

  events.on(UfvConstants.EVENT_NVR_RECORDING, recording => {
    log(`RECORDING: eventType=[${recording.eventType}], cameraName=[${recording.meta.cameraName}]`);
  });

  events.on(UfvConstants.EVENT_NVR_SERVER, server => {
    log(`SERVER: cpuLoad=[${server.systemInfo.cpuLoad}]`);
  });

  start();
});

api.Discover();
