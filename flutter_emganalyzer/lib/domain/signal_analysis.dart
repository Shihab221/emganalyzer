import 'dart:math' as math;

import '../models/sensor_sample.dart';
import 'emg_calibration.dart';

const int displaySampleRateHz = 64;

double inferSampleRateHz(List<SensorSample> data) {
  if (data.length < 2) return 2;
  double sum = 0;
  int n = 0;
  for (var i = 1; i < data.length; i++) {
    final dt = (data[i].timestamp - data[i - 1].timestamp) / 1000;
    if (dt > 0.001 && dt < 10) {
      sum += dt;
      n++;
    }
  }
  if (n == 0) return 2;
  final hz = sum / n > 0 ? 1 / (sum / n) : 2;
  return (hz * 100).round() / 100;
}

({double value, int windowSize}) calculateRMS(List<SensorSample> data, [int windowSize = 50]) {
  if (data.isEmpty) return (value: 0.0, windowSize: windowSize);

  final recent = data.length <= windowSize ? data : data.sublist(data.length - windowSize);
  final mvs = recent.map((d) => rawEmgToMv(d.emg)).toList();
  final mu = mvs.fold<double>(0, (a, b) => a + b) / mvs.length;
  double sumSq = 0;
  for (final v in mvs) {
    final z = v - mu;
    sumSq += z * z;
  }
  final rms = math.sqrt(sumSq / mvs.length);
  return (value: (rms * 100).round() / 100, windowSize: mvs.length);
}

({List<double> frequencies, List<double> magnitudes, double dominantFrequency}) calculateFFT(
  List<SensorSample> data, [
  double sampleRate = 2,
]) {
  if (data.length < 4) {
    return (frequencies: <double>[], magnitudes: <double>[], dominantFrequency: 0.0);
  }

  final n = data.length;
  final samples = data.map((d) => rawEmgToAcMv(d.emg)).toList();
  final frequencies = <double>[];
  final magnitudes = <double>[];
  final numBins = n ~/ 2;

  var maxMag = 0.0;
  var dominant = 0.0;

  for (var k = 0; k < numBins; k++) {
    double real = 0, imag = 0;
    for (var t = 0; t < n; t++) {
      final angle = (2 * math.pi * k * t) / n;
      real += samples[t] * math.cos(angle);
      imag -= samples[t] * math.sin(angle);
    }
    final magnitude = math.sqrt(real * real + imag * imag) / n;
    final frequency = (k * sampleRate) / n;
    frequencies.add((frequency * 100).round() / 100);
    final magRounded = (magnitude * 100).round() / 100;
    magnitudes.add(magRounded);

    if (k > 0 && magRounded > maxMag) {
      maxMag = magRounded;
      dominant = frequencies[k];
    }
  }

  return (frequencies: frequencies, magnitudes: magnitudes, dominantFrequency: dominant);
}

({double min, double max, double mean, double stdDev}) calculateStats(List<SensorSample> data) {
  if (data.isEmpty) {
    return (min: 0.0, max: 0.0, mean: 0.0, stdDev: 0.0);
  }
  final values = data.map((d) => rawEmgToMv(d.emg)).toList();
  var min = values.first;
  var max = values.first;
  double sum = 0;
  for (final v in values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  final mean = sum / values.length;
  double varSum = 0;
  for (final v in values) {
    varSum += math.pow(v - mean, 2).toDouble();
  }
  final stdDev = math.sqrt(varSum / values.length);
  return (
    min: (min * 100).round() / 100,
    max: (max * 100).round() / 100,
    mean: (mean * 100).round() / 100,
    stdDev: (stdDev * 100).round() / 100,
  );
}
