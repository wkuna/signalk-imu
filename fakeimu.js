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


(module.exports = function() {

  // =====================================================SIMULATOR----------------------------
  function RandomScalar(min, max) {
    this.v = 0;
    this.c = 0;
    this.r = max - min;
    this.mean = (max+min)/2;
    this.min = min;
    this.max = max;
  }
  RandomScalar.prototype.next = function() {
    this.v = this.v - ((Math.random()-0.5-(this.v/(5*this.r))) * (this.v-this.r)/10);
    this.c = this.mean + this.v;
    if ( this.c > this.max ) {
      this.c = this.max;
    } else if ( this.c < this.min ) {
      this.c = this.min;
    } 
  };

  function RandomDirection() {
    this.v = 0;
    this.c = 0;
    this.r = Math.PI*2;

  }
  RandomDirection.prototype.next = function() {
    this.v = this.v - ((Math.random()-0.5) * Math.PI/90);
    while (this.v > this.r) {
        this.v  = this.v - this.r;
    }
    while(  this.v < 0) {
        this.v = this.v + this.r;
    }
    this.c = this.v;
  };

  function RandomPose() {
    this.x = new RandomScalar(-Math.PI/4,Math.PI/4);
    this.y = new RandomScalar(-Math.PI/4,Math.PI/4);
    this.z = new RandomDirection();
  }
  RandomPose.prototype.next = function() {
    this.x.next();
    this.y.next();
    this.z.next();
  };

  function RandomRateGyro() {
    this.x = new RandomScalar(-Math.PI/4,Math.PI/4);
    this.y = new RandomScalar(-Math.PI/4,Math.PI/4);
    this.z = new RandomScalar(-Math.PI/4,Math.PI/4);
  }
  RandomRateGyro.prototype.next = function() {
    this.x.next();
    this.y.next();
    this.z.next();
  };

  function FakeIMU() {
    this.pose = new RandomPose();
    this.gyro = new RandomRateGyro();
    this.pressure = new RandomScalar(950,1050);
    this.temperature = new RandomScalar(-5,40);
  }
  FakeIMU.prototype.getValue = function(cb) {
    this.pose.next();
    this.gyro.next();
    this.pressure.next();
    this.temperature.next();
    var data = {
      fusionPose : {
        x: this.pose.x.c,
        y: this.pose.y.c,
        z: this.pose.z.c
      },
      gyro : {
        x: this.gyro.x.c,
        y: this.gyro.y.c,
        z: this.gyro.z.c
      },
      pressure: this.pressure.c,
      temperature: this.temperature.c
    };
    cb(false,data);
  };

  return {
    FakeIMU : FakeIMU
  };
}());

