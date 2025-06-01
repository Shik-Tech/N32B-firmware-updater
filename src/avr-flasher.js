const { SerialPort } = require('serialport');
const fs = require('fs');
const EventEmitter = require('events');
const Avr109Chip = require('./avr109-chip');

class AvrFlasher extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            port: options.port || '',
            debug: options.debug || false
        };
        this.debug = this.options.debug ? console.log : () => {};
    }

    async flash(filePath) {
        try {
            // Read hex file
            const data = fs.readFileSync(filePath, 'utf8');
            
            // Find reset port
            const resetPort = await this._findResetPort();
            this.debug('Found reset port:', resetPort.path);

            // Perform reset
            await this._reset(resetPort.path);
            this.debug('Reset complete');

            // Wait for upload port
            const uploadPort = await this._findUploadPort();
            this.debug('Found upload port:', uploadPort.path);

            // Open upload port
            const serialPort = new SerialPort({
                path: uploadPort.path,
                baudRate: 57600,
                autoOpen: false
            });

            await new Promise((resolve, reject) => {
                serialPort.open((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Initialize chip
            const chip = new Avr109Chip(serialPort, {
                signature: 'CATERIN',
                debug: this.debug
            });

            // Prepare chip
            await new Promise((resolve, reject) => {
                chip.prepare((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Erase chip
            await new Promise((resolve, reject) => {
                chip.erase((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Program data
            await new Promise((resolve, reject) => {
                chip.program(data, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Verify data
            await new Promise((resolve, reject) => {
                chip.verify((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Exit programming mode
            await new Promise((resolve, reject) => {
                chip.exit((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Close port
            await new Promise((resolve) => {
                serialPort.close(() => resolve());
            });

            this.emit('complete');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async _findResetPort() {
        const ports = await SerialPort.list();
        const resetPort = ports.find(port => 
            ['2341', '1b4f', '1B4F', '1d50', '1D50'].includes(port.vendorId)
        );
        
        if (!resetPort) {
            throw new Error('Reset port not found');
        }
        
        return resetPort;
    }

    async _findUploadPort() {
        const ports = await SerialPort.list();
        const uploadPort = ports.find(port => 
            ['2341', '1b4f', '1B4F', '1d50', '1D50'].includes(port.vendorId)
        );
        
        if (!uploadPort) {
            throw new Error('Upload port not found');
        }
        
        return uploadPort;
    }

    async _reset(portPath) {
        const port = new SerialPort({
            path: portPath,
            baudRate: 1200,
            autoOpen: false
        });

        await new Promise((resolve, reject) => {
            port.open((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise((resolve) => {
            port.set({ dtr: false }, () => {
                setTimeout(() => {
                    port.close(() => resolve());
                }, 250);
            });
        });

        // Wait for port to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

module.exports = AvrFlasher; 