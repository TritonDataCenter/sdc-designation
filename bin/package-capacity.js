var http = require('http');
var fs   = require('fs');



function getPapiData(ip, callback) {
    var path = 'http://' + ip + '/packages';
    getData(path, 'papi', callback);
}



function getImgapiData(ip, callback) {
    var path = 'http://' + ip + '/images';
    getData(path, 'imgapi', callback);
}



function getCnapiData(ip, callback) {
    var path = 'http://' + ip + '/servers?extras=disk,memory,sysinfo,vms';
    getData(path, 'cnapi', callback);
}



function getCapacity(ip, port, papiData, imgapiData, cnapiData, callback) {
    var reqData = '{"packages": ' + papiData + ', "images": ' + imgapiData +
                  ', "servers": ' + cnapiData + '}';

    var reqOptions = {
        hostname: ip,
        port: port,
        path: '/capacity',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    var req = http.request(reqOptions, function (res) {
        var code = res.statusCode;
        if (code !== 200)
            return callback('DAPI unexpectedly returned HTTP ' + code);

        res.setEncoding('utf8');

        var chunks = [];
        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function (chunk) {
            var capacityData = chunks.join('');
            callback(null, capacityData);
        });

        return null; // keep javascriptlint happy
    });

    req.on('error', function (e) {
        callback('Error contacting DAPI: ' + e.message);
    });

    req.write(reqData);
    req.end();
}



function getData(url, apiName, callback) {
    http.get(url, function (res) {
        var code = res.statusCode;
        if (code !== 200)
            return callback(apiName + ' unexpectedly returned HTTP ' + code);

        res.setEncoding('utf8');

        var chunks = [];
        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function (chunk) {
            var data = chunks.join('');
            callback(null, data);
        });

        return null; // keep javascriptlint happy
    }).on('error', function (e) {
        callback('Error contacting ' + apiName + ': ' + e.message);
    });
}



function catchErr(callback) {
    return function (err, data) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        callback(err, data);
    };
}



function main() {
    var papiIp   = process.argv[2];
    var imgapiIp = process.argv[3];
    var cnapiIp  = process.argv[4];
    var csv      = process.argv[5];

    if (!papiIp || !imgapiIp || !cnapiIp) {
        var script = process.argv[1].split('/').slice(-1)[0];
        console.error('Usage: ' + script + ' <papi IP> <imgapi IP> <cnapi IP>' +
                      ' [-c]');
        process.exit(1);
    }

    var configData = fs.readFileSync(__dirname + '/../config.json');
    var config = JSON.parse(configData);

    var dapiIp   = '127.0.0.1';
    var dapiPort = config.api.port || 80;

    getPapiData(papiIp, catchErr(function (papiErr, papiData) {
        getImgapiData(imgapiIp, catchErr(function (imgapiErr, imgapiData) {
            getCnapiData(cnapiIp, catchErr(function (cnapiErr, cnapiData) {
                getCapacity(dapiIp, dapiPort, papiData, imgapiData, cnapiData,
                            catchErr(function (capacityErr, capacityData) {
                    if (csv === '-c') {
                        var capacity = JSON.parse(capacityData).capacities;
                        capacity.forEach(function (pair) {
                            console.log(pair.package_uuid + ',' +
                                        pair.image_uuid + ',' + pair.slots);
                        });
                    } else {
                        console.log(capacityData);
                    }
                }));
            }));
        }));
    }));
}



main();
