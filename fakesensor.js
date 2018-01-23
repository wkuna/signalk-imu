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


(function() {

  function BNO055(config) {
      this.config = config;
      this.reg = []; // array of registers.
      for (var i = 0; i < 10; i++) {
        this.reg[i] = new RandomScalar(-128,128);
      };
      this.calib = 0;
      var self = this;    
      setInterval(() => {
        for (var i = 0; i < 10; i++) {
          self.reg[i].next();
        };
      }, 150);
  }


  // go through the startup process by incrementing the calib byte.
  BNO055.prototype.startup = function(first_argument) {
    var self = this;    
    if ( this.calib < 0xff ) {
      this.calib++;
      setTimeout(() => {
        self.startup();
      }, 10)
    }
  };

  BNO055.prototype.beginNDOF = function(cb) {
    this.calib = 0;
    this.startup();
    setTimeout(() => {
      cb(null, true);
    }, 100);
  };

  BNO055.prototype.getSystemStatus = function(cb) {

    setTimeout(() => {
      var selfTestResult = 0x0F;
      cb(null, {selfTestResult: selfTestResult.toString(2), systemStatus: 0x00, systemErr: "All Ok"});
    }, 10);
  };

  BNO055.prototype.getCalibrationStatus = function(cb) {
    var self = this;
    setTimeout(() => {
      cb(null, {
        systemStatus: (self.calib&0xC0)>>6,
        gyroStatus: (self.calib&0x30)>>4,
        accelerometerStatus: (self.calib&0x0C)>>2,
        magnetometerStatus: (self.calib&0x03)
      });
    }, 10);
  };

  BNO055.prototype.getTemperature = function(cb) {
    var self = this;
    setTimeout(() => {
      cb(null, self.reg[9].v);
    }, 10);
  };

  BNO055.prototype.getEuler = function(cb) {
    var self = this;
    setTimeout(() => {
      cb(null, {heading: self.reg[0].v/16.0, roll: self.reg[1].v/16.0, pitch: self.reg[2].v/16.0});
    }, 10);
  };

  BNO055.prototype.getLinearAcceleration = function(cb) {
    var self = this;
    setTimeout(() => {
      cb(null, {x: self.reg[3].v / 100.0, y: self.reg[4].v / 100.0, z: self.reg[5].v / 100.0 });
    }, 10);
  };

  BNO055.prototype.getGyroscope = function(cb) {
    var self = this;
    setTimeout(() => {
      cb(null, {x: self.reg[6].v / 900.0, y: self.reg[7].v / 900.0, z: self.reg[8].v / 900.0 });
    }, 10);
  };


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


  module.exports = BNO055;


}());

