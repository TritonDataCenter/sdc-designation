/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * This program fetches data over IP from PAPI, imgapi, and cnapi, and feeds it
 * to DAPI's package capacity simulation, then prints the results DAPI returns.
 *
 * Example to produce a CSV report:
 *
 * $ node package-capacity.js 10.0.108.70 10.0.108.60 10.0.108.61 -c | sort
 *
 * This program is similar to package-capacity-files.js, except it provides
 * image data to DAPI as well, and requires direct IP routes the the above
 * services. Generates (img num) x (pkg num) reports, which is much more
 * expensive that package-capacity-files.js's (pkg num) alone.
 *
 * Expect the results to take a while to generate -- potentially days. DAPI
 * needs to run through several million simulated allocations for a typical JPC
 * DC to produce this report.
 */



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



/*
 * Send data to a DAPI HTTP endpoint to start the package capacity calculations,
 * then accept the result and return to the callback.
 */

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



/*
 * Fetch JSON data from an HTTP endpoint, and return the data to callback.
 */

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



/*
 * Silly helper function which prints errors and terminates the program if there
 * was an error, then passes the remaining args to callback.
 */

function catchErr(callback) {
    return function (err, data) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        callback(err, data);
    };
}



/*
 * Fetch the necessary data from HTTP APIs, send the data to DAPI, accept the
 * results, print the report out.
 */

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

                        capacity.forEach(function (cap) {
                            console.log([cap.package_name, cap.package_version,
                                         cap.package_uuid, cap.image_name,
                                         cap.image_version, cap.image_uuid,
                                         cap.slots].join(','));
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
