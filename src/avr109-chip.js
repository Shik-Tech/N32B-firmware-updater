const EventEmitter = require('events');
const intelHex = require('intel-hex');

class Avr109Chip extends EventEmitter {
    constructor(serialport, options = {}) {
        super();
        this.options = options || {};
        this.sp = serialport;
        this.signature = this.options.signature || 'CATERIN';
        this.debug = this.options.debug || (() => {});
        this.cmds = [];
        this.running = false;
        this.flashChunkSize = 0;
        this.bytes = [];
        this.totalBytes = 0;
        this.chunksSent = [];
    }

    c(value, callback, expectedResponseLength) {
        this.cmds.push({
            value: value,
            callback: callback,
            expectedResponseLength: expectedResponseLength
        });
        return this;
    }

    run(fn) {
        if (this.running) return;
        
        const cmd = this.cmds.shift();
        if (!cmd) {
            fn && fn();
            return;
        }

        this.running = true;
        // this.debug('Send:', cmd.value);
        
        let response = Buffer.alloc(0);
        const onData = (data) => {
            response = Buffer.concat([response, data]);
            
            if (cmd.expectedResponseLength === undefined || 
                cmd.expectedResponseLength <= response.length) {
                this.sp.removeListener('data', onData);
                this.running = false;
                
                if (cmd.callback) {
                    cmd.callback(response);
                }
                
                if (this.cmds.length > 0) {
                    this.run(fn);
                } else {
                    fn && fn();
                }
            }
        };

        this.sp.on('data', onData);
        this.sp.write(cmd.value);
    }

    prepare(fn) {
        this.c('S', (data) => {
            if (data.toString() !== this.signature) {
                fn(new Error('Invalid device signature'));
                return;
            }
        })
        .c('V')
        .c('v')
        .c('p')
        .c('a')
        .c('b', (data) => {
            if ((data.toString() || 'X')[0] !== 'Y') {
                fn(new Error('Buffered memory access not supported'));
                return;
            }
            this.flashChunkSize = data.readUInt16BE(1);
        })
        .c('t')
        .c('TD')
        .c('P')
        .c('F')
        .c('F')
        .c('F')
        .c('N')
        .c('N')
        .c('N')
        .c('Q')
        .c('Q')
        .c('Q')
        .c([0x41, 0x03, 0xfc])
        .c([0x67, 0x00, 0x01, 0x45])
        .c([0x41, 0x03, 0xff])
        .c([0x67, 0x00, 0x01, 0x45])
        .c([0x41, 0x03, 0xff])
        .c([0x67, 0x00, 0x01, 0x45])
        .c([0x41, 0x03, 0xff])
        .c([0x67, 0x00, 0x01, 0x45]);

        this.run(() => {
            fn(null, this);
        });
    }

    erase(fn) {
        this.c('e', () => {
            fn && fn();
        });
        this.run();
    }

    program(data, fn) {
        this.c([0x41, 0x00, 0x00], () => {
            const converter = intelHex.parse(data);
            this.bytes = converter.data;
            this.totalBytes = converter.data.length;
            this.chunksSent = [];
            
            // this.debug('Programming', this.totalBytes, 'bytes');
            
            for (let i = 0; i < this.bytes.length; i += this.flashChunkSize) {
                const chunk = Array.prototype.slice.call(this.bytes.slice(i, i + this.flashChunkSize));
                this.chunksSent.push(chunk);
                this.c([0x42, (chunk.length >> 8) & 0xFF, chunk.length & 0xFF, 0x46].concat(chunk));
            }
        });

        this.run(() => {
            this.bytes = [...this.chunksSent.flat()];
            fn && fn();
        });
    }

    verify(fn) {
        this.c([0x41, 0x00, 0x00], () => {
            const compare = (deviceData) => {
                if (!this.bytes.length) {
                    fn && fn();
                    return;
                }

                const deviceDataLength = deviceData.length;
                const localChunk = this.bytes.splice(0, deviceDataLength);

                for (let i = 0; i < localChunk.length; i++) {
                    if (localChunk[i] !== deviceData.readUInt8(i)) {
                        fn(new Error('Verification failed'));
                        return;
                    }
                }

                if (this.bytes.length > 0) {
                    const readSize = Math.min(this.flashChunkSize, this.bytes.length);
                    this.c([0x67, (readSize >> 8) & 0xFF, readSize & 0xFF, 0x46], compare, readSize);
                    this.run();
                } else {
                    fn && fn();
                }
            };

            const firstReadSize = Math.min(this.flashChunkSize, this.bytes.length);
            this.c([0x67, (firstReadSize >> 8) & 0xFF, firstReadSize & 0xFF, 0x46], compare, firstReadSize);
            this.run();
        });
        
        this.run();
    }

    exit(fn) {
        this.c('E', () => {
            fn && fn();
        });
        this.run();
    }
}

module.exports = Avr109Chip; 