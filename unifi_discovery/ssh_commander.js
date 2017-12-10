const Buffer = require('buffer').Buffer;

class SshCommander {

    constructor(id, host, username, password, port, cmd, finish, progress) {
        this.id = id;
        this.sshPassword = password;
        this.stdoutAckCount = 0;
        this.stderrAckCount = 0;
        this.finish = finish;
        this.progress = progress;
        this.output = '';

        var argv = {};

        argv.writeWindow = 8 * 1024;

        argv.arguments = ['-o', 'StrictHostKeyChecking=no'];
        // this.argv.arguments.push('-v');
        argv.arguments.push('-p ' + port);
        argv.arguments.push(username + '@' + host);
        argv.arguments.push(cmd);

        var self = this;
        /*
        this.initPlugin(function () {
            self.sendToPlugin('startSession', [argv]);
        });

        setTimeout(function () {
            self.sendToPlugin('onClose', [0, 0]);
        }, 5000);
        */
    }

    doSshCmd(id, host, username, password, port, cmd, finish, progress) {
        return new SshCommander(id, host, username, password, port, cmd, finish, progress);
    }

    sendToPlugin(name, args) {
        var str = JSON.stringify({ name: name, arguments: args });
        this.plugin.postMessage(str);
    }

    sendString(string) {
        this.sendToPlugin('onRead', [0, Buffer.from(string).toString('base64')]);
    }

    handleMessage(e) {
        var msg = JSON.parse(e.data);
        msg.argv = msg.arguments;

        if (msg.name == 'write') {
            var fd = msg.argv[0],
                string = Buffer.from(msg.argv[1], 'base64').toString();

            var ackCount = (fd == 1 ?
                this.stdoutAckCount += string.length :
                this.stderrAckCount += string.length);

            this.sendToPlugin('onWriteAcknowledge', [fd, ackCount]);
            if (string.match(/.*password:/)) {
                this.sendString(this.sshPassword + '\n');
            } else if (!string.match(/.*Failed to add the host to the list of known hosts/)) {
                this.output += string;
                if (this.progress) {
                    if (this.output.match(/.*404 Not Found.*/)) {
                        this.errorOccurred = true;
                        this.progress(this.id, 'DOWNLOAD_FAILED', true);
                    } else if (this.output.match(/.*Invalid firmware.*/)) {
                        this.errorOccurred = true;
                        this.progress(this.id, 'INVALID_FIRMWARE', true);
                    } else if (this.output.match(/.*Saving to: `\/tmp\/fwupdate.bin'.*/)) {
                        this.progress(this.id, 'DOWNLOADING');
                    } else if (this.output.match(/.*`\/tmp\/fwupdate.bin' saved.*/)) {
                        this.progress(this.id, 'DOWNLOAD_COMPLETED');
                    }
                }
            }
        } else if (msg.name == 'printLog') {
            console.debug('plugin printLog: ' + msg.argv);
        } else if (msg.name == 'exit') {
            var code = msg.argv[0];
            var output = this.output.trim();
            // check if upgrade succeeded
            if (output.match(/.*Write failed: Bad file number/) && msg.argv[0] === 255 && this.progress) {
                code = 0;
            } else if (this.errorOccurred) {
                code = 100;
            }
            this.finish(this.id, code, output);
            this.sendToPlugin('onExitAcknowledge', []);
        }

    }

    /*
    initPlugin(onComplete) {
        this.plugin = window.document.createElement('embed');
        this.plugin.style.cssText = ('width: 0;' + 'height: 0;');

        this.plugin.setAttribute('src', '../plugin/pnacl/ssh_client.nmf');
        this.plugin.setAttribute('type', 'application/x-nacl');

        this.plugin.addEventListener('load', function () {
            onComplete();
        });
        this.plugin.addEventListener('message', this.handleMessage.bind(this));
        this.plugin.addEventListener('crash', function (e) {
            console.log('plugin crashed');
        });

        document.body.appendChild(this.plugin, document.body.lastChild);
        this.plugin.setAttribute('type', 'application/x-nacl');
    }
    */
}

module.exports = SshCommander;




