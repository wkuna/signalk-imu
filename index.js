/*jshint node:true */
"use strict";
/*
 * Copyright 2017 Ian Boston <ianboston@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Bacon = require('baconjs');
const fs = require('fs');
const async = require('async');

// These values were generated using calibrate_mag.js - you will want to create your own.
var MAG_CALIBRATION = {
  min: { x: -36.44921875, y: -13.0625, z: -102.65625 },
  max: { x: 112.875, y: 129.4375, z: 62.734375 },
  offset: { x: 38.212890625, y: 58.1875, z: -19.9609375 },
  scale:
  {
    x: 1.5309467130562169,
    y: 1.6042626096491228,
    z: 1.3822272083136513
  }
}

// These values were generated using calibrate_gyro.js - you will want to create your own.
// NOTE: These are temperature dependent.
var GYRO_OFFSET = { x: 0.2880610687022899,
  y: -0.06345038167938938,
  z: 0.11358778625954198 };

// These values were generated using calibrate_accel.js - you will want to create your own.
var ACCEL_CALIBRATION = {
  offset: {
    x: 0.00943176,
    y: 0.00170817,
    z: 0.05296142
  },
  scale: {
    x: [-0.9931640, 1.0102189],
    y: [-0.9981974, 1.0055884],
    z: [-0.9598844, 1.0665967]
  }
};



module.exports = function (app) {
  var motionInterval;
  var mpu9255;
  if (fs.existsSync('/sys/class/i2c-adapter')) {
    // 1 wire is enabled a
    mpu9255 = require('mpu9255');

    console.log("signalk-imu: MPU9255 avaiable. ");
  }

  var plugin = {};

  function p(num) {
    if (num === undefined) {
      return '       ';
    }
    var str = num.toFixed(3);
    while (str.length <= 7) {
      str = ' ' + str;
    }
    return str + ' ';
  }

  function calcHeading(x, y) {
    var heading = Math.atan2(y, x);


    return heading;
  }

  plugin.start = function (config) {
    // console.log("IMU Config ", JSON.stringify(config));
    // Instantiate and initialize.
    var mpu = new mpu9255({
      // i2c path (default is '/dev/i2c-1')
      device: '/dev/i2c-1',

      // Enable/Disable debug mode (default false)
      DEBUG: true,

      // Set the Gyroscope sensitivity (default 0), where:
      //      0 => 250 degrees / second
      //      1 => 500 degrees / second
      //      2 => 1000 degrees / second
      //      3 => 2000 degrees / second
      GYRO_FS: 0,

      // Set the Accelerometer sensitivity (default 2), where:
      //      0 => +/- 2 g
      //      1 => +/- 4 g
      //      2 => +/- 8 g
      //      3 => +/- 16 g
      ACCEL_FS: 0,

      scaleValues: true,

      UpMagneto: true,

      magCalibration: MAG_CALIBRATION,

      gyroBiasOffset: GYRO_OFFSET,

      accelCalibration: ACCEL_CALIBRATION
    });

    console.log("Initializing ...");
    var kalmanX = new mpu.Kalman_filter();
    var kalmanY = new mpu.Kalman_filter();

    if (mpu.initialize()) {
      motionInterval = setInterval(function () {
        var values = mpu.getMotion9();
        var end = new Date().getTime();

        console.log(values)

        var delta = {
          "context": "vessels." + app.selfId,
          "updates": [
            {
              "source": {
                "src": "MPU9255"
              },
              "timestamp": end,
              "values": [
                {
                  "path": "environment.inside.temperature",
                  "value": mpu.getTemperatureCelsiusDigital()
                },
                {
                  "path": "navigation.rateOfTurn",
                  "value": values[5]
                },
                {
                  "path": "navigation.gyro.roll",
                  "value": values[3]
                },
                {
                  "path": "navigation.gyro.pitch",
                  "value": values[4]
                },
                {
                  "path": "navigation.gyro.yaw",
                  "value": values[5]
                },
                {
                  "path": "navigation.accel.x",
                  "value": values[0]
                },
                {
                  "path": "navigation.accel.y",
                  "value": values[1]
                },
                {
                  "path": "navigation.accel.z",
                  "value": values[2]
                },
                {
                  "path": "navigation.headingMagnetic",
                  "value": calcHeading(values[6], values[7]),
                }
              ]
            }
          ]
        };
        app.handleMessage(plugin.id, delta);
      }, config.motionPeriod);
    } else {
      console.log("init returning false")
    }
    console.log(motionInterval);
  }

  plugin.stop = function () {
    if (plugin.environmentInterval !== undefined) {
      clearInterval(plugin.environmentInterval);
    }
    if (motionInterval !== undefined) {
      clearInterval(motionInterval);
    }
  }

  plugin.id = "mpu9255-imu"
  plugin.name = "IMU Source"
  plugin.description = "Plugin that reads IMU data"

  plugin.schema = {
    title: "IMU Source",
    description: "This plugin reads data from a I2C attached MPU9255 device. The device should be set up so that the MPU9255 on the chip is towards the bow.",
    type: "object",
    properties: {
      motionPeriod: {
        title: "Period of motion readings in ms",
        type: "integer",
        default: 1000
      }
    }
  }

  plugin.uiSchema = {
    "ui:order": [
      'motionPeriod'
    ]
  };


  return plugin;
}
