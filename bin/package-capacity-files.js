/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * This program takes data from a couple files, feeds it to DAPI's package
 * capacity simulation, then prints the results DAPI returns. The two files
 * it takes are a packages ldif and cnapi dump.
 *
 * Example to produce a CSV report:
 *
 * $ sdc-ldap s 'objectclass=sdcpackage' > packages.ldif
 * $ sdc-cnapi --no-headers /servers?extras=all > cnapi.json
 * $ node package-capacity-files.js packages.ldif cnapi.json -c | sort
 *
 * This program is similar to package-capacity.js, except it assumes images
 * have no attributes, and doesn't depend on a direct connection to papi or
 * imgapi.
 *
 * Expect the results to take a while to generate -- potentially hours. DAPI
 * needs to run through several hundred thousand or more simulated allocations
 * for a typical JPC DC to produce the report.
 */



var http = require('http');
var fs   = require('fs');




/*
 * Takes an array of ldif lines, then combines and converts those lines into
 * an array of JS objects which represent the same data -- bundle lines from
 * the same ldif object into a JS object, convert string representations of
 * numbers into JS numbers, same for booleans, turn multiple ldif keys into
 * a JS array, and so forth.
 */

function convertPackageLdif(ldif) {
    var packages = [];

    var lookup = {};
    ldif.forEach(function (line) {
        if (line === '') {
            if (Object.keys(lookup).length > 0) {
                packages.push(formatElements(lookup));
                lookup = {};
            }
            return;
        }

        var match = line.match(/^([^:]+?): (.+)$/);

        if (match) {
            var name  = match[1];
            var value = match[2];
            var orig  = lookup[name];

            if (orig) {
                if (Array.isArray(orig)) {
                    orig.push(value);
                } else {
                    lookup[name] = [orig, value];
                }
            } else {
                lookup[name] = value;
            }
        }
    });

    return packages;
}



/*
 * LDIF represents data differently than JS does. Convert pkg into a JSON format
 * which DAPI expects.
 */

function formatElements(pkg) {
    Object.keys(pkg).forEach(function (key) {
        var value = pkg[key];

        if (!isNaN(value))
            pkg[key] = +value;

        if (Array.isArray(value))
            pkg[key] = JSON.stringify(value);

        if (value === 'true')
            pkg[key] = true;

        if (value === 'false')
            pkg[key] = false;
    });

    return pkg;
}



/*
 * Send data to a DAPI HTTP endpoint to start the package capacity calculations,
 * then accept the result and return to the callback.
 */

function getCapacity(ip, port, cnapiJson, packageJson, callback) {
    var reqData = '{"packages": ' + packageJson + ', "images": [{}]' +
                  ', "servers": ' + cnapiJson + '}';

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
 * Load the necessary data from files, convert to a format DAPI understands,
 * send the data to DAPI, accept the results, print the report out.
 */

function main() {
    var packagePath = process.argv[2];
    var cnapiPath   = process.argv[3];
    var csv         = process.argv[4] == '-c' || process.argv[5] == '-c';
    var g3          = process.argv[4] == '-g3' || process.argv[5] == '-g3';

    if (!packagePath || !cnapiPath) {
        var script = process.argv[1].split('/').slice(-1)[0];
        console.error('Usage:',  script, '<package ldif file>',
                      '<cnapi json file> [-c] [-g3]');
        process.exit(1);
    }

    var cnapiJson = fs.readFileSync(cnapiPath, 'utf8');

    var packageLdif = fs.readFileSync(packagePath, 'utf8').split('\n');
    var packageData = convertPackageLdif(packageLdif);

    // only check capacity for active g3-* packages if -g3 was specified
    if (g3) {
        packageData = packageData.filter(function (p) {
            return p.active && p.name && p.name.match(/^g3/);
        });
    }

    var packageJson = JSON.stringify(packageData);

    var configJson = fs.readFileSync(__dirname + '/../config.json');
    var config = JSON.parse(configJson);

    var dapiIp   = '127.0.0.1';
    var dapiPort = config.api.port || 80;

    getCapacity(dapiIp, dapiPort, cnapiJson, packageJson,
                function (err, capacityData) {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        if (csv) {
            var capacity = JSON.parse(capacityData).capacities;

            capacity.forEach(function (cap) {
                console.log([cap.package_name, cap.package_version,
                             cap.package_uuid, cap.slots].join(','));
            });
        } else {
            console.log(capacityData);
        }
    });
}



main();
