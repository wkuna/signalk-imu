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

  function Stats(n, name) {
    this.acc = new Array(n);
    this.acc.fill(0,0,n);
    this.h = 0;
    this.n = 0;
    this.c = 0;
    this.name = name;
  }
  Stats.prototype.set = function(v) {
    this.acc[this.h] = v;
    this.c = v;
    if ( this.n < this.acc.length) {
      this.n++;
    }
    this.h++;
    if ( this.h >= this.acc.length ) {
      this.h = 0;
    }
  }
  Stats.prototype.mean = function() {
    if ( this.n == 0) {
      return 0;
    }
    var v = 0;
    for (var i = 0; i < this.n; i++) {
      v = v + this.acc[i];
    }
    return v/this.n;
  }
  Stats.prototype.stdev = function(mean) {
    if ( this.n == 0) {
      return 0;
    }
    var m = mean || this.mean();
    var v = 0;
    for (var i = 0; i < this.n; i++) {
      var d = mean - this.acc[i];
      v = v + d*d;
    }
    return v/this.n;
  };


  function AngleStats(n, name) {
    this.name = name;
    this.c   = 0;
    this.cos = new Stats(n, name + ".cos");
    this.sin = new Stats(n, name + ".sin");
  }
  AngleStats.prototype.set = function(v) {
    this.c = v;
    this.cos.set(Math.cos(v));
    this.sin.set(Math.sin(v));
  };
  AngleStats.prototype.mean = function() {
    if (this.cos.n === 0) {
      return 0;
    }
    return Math.atan2(this.sin.mean(), this.cos.mean());
  }
  AngleStats.prototype.stdev = function(first_argument) {
    var cosmean = this.cos.mean();
    var sinmean = this.sin.mean();
    var cosstdev = this.cos.stdev(cosmean);
    var sinstdev = this.sin.stdev(sinmean);
    return Math.sqrt(cosstdev*cosstdev+sinstdev*sinstdev);
  };


  return {
    Stats : Stats,
    AngleStats: AngleStats
  };
}());

