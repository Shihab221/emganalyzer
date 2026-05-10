class SensorSample {
  final int emg;
  final int timestamp;

  const SensorSample({required this.emg, required this.timestamp});

  factory SensorSample.fromJson(Map<String, dynamic> j) => SensorSample(
        emg: (j['emg'] as num).toInt(),
        timestamp: (j['timestamp'] as num).toInt(),
      );
}
