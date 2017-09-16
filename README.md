# signalk-imu
SignalK plugin to read IMU from an I2C connected 10DOF sensor. Uses https://github.com/RTIMULib/RTIMULib2

This SignalK plugin uses RTIMULib2 to provide 10Dof IMU sensor data from any IMU that library supports. 
The 10Dof Sensors are widely available on eBay for a few $, communicate over i2C. The plugin was developed 
with a 10DOF L3GD20 LSM303D BMP180 boar, giving 3D acceleration, Gyro, magnetics plus temperature and pressure.
The temperature measurements are good for measuring the temperature of the box, but not isolated enough to measure
the temperature of anything else.

Before using, the sensors must be calibrated using the process provided by RTIMULib2
