var fs = require('fs'),
    path = require('path'),
    _ = require('busyman'),
    expect = require('chai').expect,
    SmartObject = require('smartobject'),
    shepherd = require('coap-shepherd');

var CoapNode = require('../index');

var so = new SmartObject();

var node = new CoapNode('utNode', so);

try {
    fs.unlinkSync(path.resolve('./node_modules/coap-shepherd/lib/database/coap.db'));
} catch (e) {
    console.log(e);
}

describe('coap-node - Functional Check', function() {
    this.timeout(15000);

    before(function (done) {
        shepherd.start(function () {
            done();
        });
    });

    describe('#.register()', function() {
        it('should register device and return msg with status 2.01', function (done) {
            shepherd.permitJoin(300);

            var devRegHdlr = function (msg) {
                    switch(msg.type) {
                        case 'registered':
                            if (msg.data.clientName === 'utNode') {
                                shepherd.removeListener('ind', devRegHdlr);
                                done(); 
                            }
                            break;
                        default:
                            break;
                    }
                };

            shepherd.on('ind', devRegHdlr);

            node.register('127.0.0.1', 5683, function (err, msg) {
                var cn;
                if (msg.status === '2.01' || msg.status === '2.04') {
                    cn = shepherd.find('utNode');
                    expect(cn._registered).to.be.eql(true);
                }
            });
        });

        it('should register device again and return msg with status 2.04', function (done) {
            var devRegHdlr = function (msg) {
                switch(msg.type) {
                    case 'registered':
                        if (msg.data.clientName === 'utNode') {
                            shepherd.removeListener('ind', devRegHdlr);
                            done(); 
                        }
                        break;
                    default:
                        break;
                }
            };

            shepherd.on('ind', devRegHdlr);

            node.register('127.0.0.1', 5683, function (err, msg) {
                expect(msg.status).to.be.eql('2.04');
            });
        });
    });

    describe('#.setDevAttrs()', function() {
        it('should update device attrs and return msg with status 2.04', function (done) {
            var devUpdateHdlr = function (msg) {
                switch(msg.type) {
                    case 'update':
                        if (msg.data.device === 'utNode') {
                            expect(msg.data.lifetime).to.be.eql(60000);
                            shepherd.removeListener('ind', devUpdateHdlr);
                            done(); 
                        }
                        break;
                    default:
                        break;
                }
            };

            shepherd.on('ind', devUpdateHdlr);

            node.setDevAttrs({ lifetime: 60000 }, function (err, msg) {
                if (msg.status === '2.04') {
                    expect(node.lifetime).to.be.eql(60000);
                }
            });
        });

        it('should update device port and return msg with status 2.04', function (done) {
            node.setDevAttrs({}, function (err, msg) {
                if (msg.status === '2.04') {
                    done();
                }
            });
        });

        it('should return msg with status 4.00 when the attrs is bad', function (done) {
            node.setDevAttrs({ name: 'peter' }, function (err, msg) {
                if (msg.status === '4.00') {
                    done();
                }
            });
        });
    });

    describe('#.deregister()', function() {
        it('should deregister device and return msg with status 2.02', function (done) {
            var devDeregHdlr = function (msg) {
                var cn;

                switch(msg.type) {
                    case 'deregistered':
                        if (msg.data === 'utNode') {
                            shepherd.removeListener('ind', devDeregHdlr);
                            cn = shepherd.find('utNode');
                            expect(cn).to.be.eql(undefined);
                            done(); 
                        }
                        break;
                    default:
                        break;
                }
            };

            shepherd.on('ind', devDeregHdlr);

            node.deregister(function (err, msg) {
                expect(msg.status).to.be.eql('2.02');
            });
        });

        it('should return msg with status 4.04 when the device is not registered', function (done) {
            node.deregister(function (err, msg) {
                if (msg.status === '4.04') {
                    done();
                }
            });
        });

        it('should return msg with status 4.04 when the device is not registered', function (done) {
            node.setDevAttrs({ lifetime: 12000 }, function (err, msg) {
                if (msg.status === '4.04') {
                    done();
                }
            });
        });
    });

    after(function (done) {
        shepherd.stop(function () {
            done();
        });
    });
});