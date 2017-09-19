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

const debug = require('debug')('signalk-imu');
const Bacon = require('baconjs');


module.exports = function(app) {
  var plugin = {};
  var unsubscribes = [];

  const stats = require('./stats');

  function Pose(n) {
    // pitch and role should never (hopefully) wrap, so standard stats are Ok.
    // yaw may go -170 +170 which should give a mean of -180 or +180, not 0,
    // hence an angular mean is required.
      this.roll = new stats.Stats(n, "pose.roll");
      this.pitch = new stats.Stats(n, "pose.pitch");
      this.yaw = new stats.AngleStats(n, "pose.yaw");
  }
  Pose.prototype.set = function(vec) {
    this.roll.set(vec.x);
    this.pitch.set(vec.y);
    this.yaw.set(vec.z);
  };
  Pose.prototype.yawToHeading = function(deviation) {
    var heading = this.yaw.c - deviation;
    if ( this.yaw < Math.PI/2) {
      heading = heading + 1.5*Math.PI;
    } else {
      heading = heading - Math.PI/2;
    }
    if ( heading < 0) {
      heading = heading + 2*Math.PI;
    }
    if ( heading > 2*Math.PI) {
      heading = heading - 2*Math.PI;
    }
    return heading;
  }

  function RateGyro(n) {
    // Although rate gyro is r/s the r/s is not circular so a standard statistic is appropriate.
      this.roll = new stats.Stats(n, "rate.roll");
      this.pitch = new stats.Stats(n, "rate.pitch");
      this.yaw = new stats.Stats(n,"rate.yaw");
  }
  RateGyro.prototype.set = function(vec) {
    this.roll.set(vec.x);
    this.pitch.set(vec.y);
    this.yaw.set(vec.z);
  };


  function convertToK(v) {
    return v+273.15;
  }

  function convertToPa(hpa) {
    return hpa*100;
  }



  plugin.start = function(config) {
    console.log("IMU Config ", JSON.stringify(config));
    var IMU;
    if ( config.testing ) { 
      const fakeimu = require('./fakeimu');
        IMU = new fakeimu.FakeIMU();
        console.log("Created IMU as ", IMU);
    } else {
        const nodeimu  = require('nodeimu');
        IMU = new nodeimu.IMU();        
    }

    var pose = new Pose(5);
    var heading = new stats.AngleStats(30, "heading");
    var rateGyro = new RateGyro(5);
    var offsetRadians = config.offset*Math.PI/180;
    plugin.motionInterval = setInterval(function() {
      IMU.getValue(function(e, data) {
        if (e) {
          console.log(e);
          return;
        }

        // TODO, check that these are the best data sources, need to the read the RTIMULib codebase.
        pose.set(data.fusionPose);
        rateGyro.set(data.gyro);
        heading.set(pose.yawToHeading(offsetRadians));


        var delta = {
          "context": "vessels." + app.selfId,
          "updates": [
            {
              "source": {
                "src": "imu_sensor"
              },
              "timestamp": (new Date()).toISOString(),
              "values": [
                  {
                    "path": "navigation.headingMagnetic",
                    "value": heading.mean().toPrecision(4)
                  },
                  {
                    "path": "navigation.rateOfTurn",
                    "value": rateGyro.yaw.mean().toPrecision(4)
                  },
                  {
                    "path": "navigation.attitude.roll",
                    "value": pose.roll.mean().toPrecision(4),
                  },
                  {
                    "path": "navigation.attitude.pitch",
                    "value": pose.pitch.mean().toPrecision(4),
                  },
                  {
                    "path": "navigation.attitude.yaw",
                    "value": pose.yaw.mean().toPrecision(4),
                  }
                ]
            }
          ]
        }        
        console.log("got motion delta: " + JSON.stringify(delta))
        app.handleMessage(plugin.id, delta);
      })
    }, config.motionPeriod);

    plugin.environmentInterval = setInterval(function() {
      IMU.getValue(function(e, data) {
        if (e) {
          console.log(e);
          return;
        }
        var values = [];
        if ( data.temperature ) {
          values.push({"path": "environment.inside.temperature", "value": convertToK(data.temperature).toPrecision(4)} );
        }
        if ( data.pressure ) {
          values.push({"path": "environment.outside.pressure", "value": convertToPa(data.pressure).toPrecision(4)} );
        }
        if ( data.humidity ) {

        }
        var delta = {
          "context": "vessels." + app.selfId,
          "updates": [
            {
              "source": {
                "src": "imu_sensor"
              },
              "timestamp": (new Date()).toISOString(),
              "values": values
            }
          ]
        }        
        console.log("got env delta: " + JSON.stringify(delta))
        app.handleMessage(plugin.id, delta);
      })
    }, config.environmentPeriod*1000);

    
    debug("started");
  }

  plugin.stop = function() {
    if ( plugin.environmentInterval !== undefined ) {
      plugin.environmentInterval.clearInterval();
    }
    if ( plugin.motionInterval !== undefined ) {
      plugin.motionInterval.clearInterval();    
    }
    debug("stopped");
  }

  plugin.id = "sk-imu"
  plugin.name = "IMU Source"
  plugin.description = "Plugin that reads IMU data"

  plugin.schema = {
    title: "IMU Source",
    type: "object",
    properties: {
      testing: {
       title: "Testing",
          type: "boolean",
          default: true
      },
      motionPeriod : {
        title: "Period of motion readings in ms",
        type: "integer",
        default: 1000
      },
      environmentPeriod : {
        title: "Period of environment readings in s",
        type: "integer",
        default: 10
      },
      offset : {
        title: "Compass Sensor offset (degrees)",
        type: "integer",
        default: 0
      }

    }
  }



  plugin.uiSchema = {
    "ui:order": [
    'motionPeriod',
    'environmentPeriod',
    'offset',
    'testing'
    ]
  };


  return plugin;
}
