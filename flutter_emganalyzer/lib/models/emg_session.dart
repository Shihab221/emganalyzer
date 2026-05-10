import 'sensor_sample.dart';

class EmgSession {
  final String id;
  final String patientId;
  final String patientName;
  final int? patientAge;
  final String? patientGender;
  final double? patientHeightM;
  final double? patientWeightKg;
  final double? patientBmi;
  final int startTime;
  final int? endTime;
  final List<SensorSample> data;
  final bool isActive;

  const EmgSession({
    required this.id,
    required this.patientId,
    required this.patientName,
    this.patientAge,
    this.patientGender,
    this.patientHeightM,
    this.patientWeightKg,
    this.patientBmi,
    required this.startTime,
    this.endTime,
    required this.data,
    required this.isActive,
  });

  factory EmgSession.fromJson(Map<String, dynamic> j) {
    final raw = j['data'] as List<dynamic>? ?? [];
    return EmgSession(
      id: j['id'] as String,
      patientId: j['patientId'] as String,
      patientName: j['patientName'] as String,
      patientAge: j['patientAge'] != null ? (j['patientAge'] as num).toInt() : null,
      patientGender: j['patientGender'] as String?,
      patientHeightM: j['patientHeightM'] != null ? (j['patientHeightM'] as num).toDouble() : null,
      patientWeightKg:
          j['patientWeightKg'] != null ? (j['patientWeightKg'] as num).toDouble() : null,
      patientBmi: j['patientBmi'] != null ? (j['patientBmi'] as num).toDouble() : null,
      startTime: (j['startTime'] as num).toInt(),
      endTime: j['endTime'] != null ? (j['endTime'] as num).toInt() : null,
      data: raw
          .map((e) => SensorSample.fromJson(e as Map<String, dynamic>))
          .toList(),
      isActive: j['isActive'] as bool? ?? false,
    );
  }
}
