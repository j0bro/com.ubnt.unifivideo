/* eslint-disable no-console */

'use strict';

const http = require('http');
const WebSocket = require('ws');
const { EventEmitter } = require('events');
const UfvConstants = require('./ufvconstants');

class UfvEvents extends EventEmitter {
  _connectWs(host, cookie) {
    let keepalive = null;
    const url = `wss://${host}:7443/ws/update?compress=false`;
    const connection = new WebSocket(url, {
      rejectUnauthorized: false,
      headers: {
        Cookie: cookie,
      },
    });

    connection.onopen = () => {
      keepalive = setInterval(() => connection.send('ping'), 5000);
    };

    connection.onerror = error => {
      this.emit(UfvConstants.EVENT_CONNECTION_ERROR, error);
      clearInterval(keepalive);
    };

    connection.onclose = () => {
      this.emit(UfvConstants.EVENT_CONNECTION_CLOSED, null);
      clearInterval(keepalive);
    };

    connection.onmessage = e => {
      if (e.data === 'pong') {
        this.emit(UfvConstants.EVENT_CONNECTION_KEEPALIVE, null);
        return;
      }

      const evt = JSON.parse(e.data);

      switch (evt.dataType) {
        case 'camera':
          this.emit(UfvConstants.EVENT_NVR_CAMERA, evt.data);
          break;
        case 'health':
          this.emit(UfvConstants.EVENT_NVR_HEALTH, evt.data);
          break;
        case 'motion':
          this.emit(UfvConstants.EVENT_NVR_MOTION, evt.data);
          break;
        case 'recording':
          this.emit(UfvConstants.EVENT_NVR_RECORDING, evt.data);
          break;
        case 'server':
          this.emit(UfvConstants.EVENT_NVR_SERVER, evt.data);
          break;
        default:
          break;
      }
    };
  }

  _getSessionCookie(response) {
    let cookie = '';
    response.rawHeaders.forEach((item, index) => {
      if (item.toLowerCase() === 'set-cookie') {
        cookie = response.rawHeaders[index + 1];
      }
    });
    return cookie;
  }

  start(host, username, password) {
    const options = {
      host,
      port: 7080,
      path: '/api/2.0/login',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      if (res.statusCode !== 200) {
        const error = new Error(`Request failed: ${options.host}${options.path} (status code: ${res.statusCode})`);
        this.emit(UfvConstants.EVENT_CONNECTION_ERROR, error);
        return;
      }
      const data = [];

      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        this._connectWs(host, this._getSessionCookie(res));
      });
    });

    req.on('error', error => {
      this.emit(UfvConstants.EVENT_CONNECTION_ERROR, error);
    });

    const credentials = {
      email: username,
      password,
    };
    req.write(JSON.stringify(credentials));
  }
}

module.exports = UfvEvents;
