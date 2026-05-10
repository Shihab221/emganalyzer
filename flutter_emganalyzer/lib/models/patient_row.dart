class PatientRow {
  final String id;
  final String name;
  final String email;
  final int? age;
  final String? gender;
  final double? heightM;
  final double? weightKg;
  final double? bmi;
  final bool isRecording;
  final String? activeSessionId;
  final int createdAt;

  const PatientRow({
    required this.id,
    required this.name,
    required this.email,
    this.age,
    this.gender,
    this.heightM,
    this.weightKg,
    this.bmi,
    required this.isRecording,
    this.activeSessionId,
    required this.createdAt,
  });

  factory PatientRow.fromJson(Map<String, dynamic> j) => PatientRow(
        id: j['id'] as String,
        name: j['name'] as String,
        email: j['email'] as String,
        age: j['age'] != null ? (j['age'] as num).toInt() : null,
        gender: j['gender'] as String?,
        heightM: j['heightM'] != null ? (j['heightM'] as num).toDouble() : null,
        weightKg: j['weightKg'] != null ? (j['weightKg'] as num).toDouble() : null,
        bmi: j['bmi'] != null ? (j['bmi'] as num).toDouble() : null,
        isRecording: j['isRecording'] as bool? ?? false,
        activeSessionId: j['activeSessionId'] as String?,
        createdAt: (j['createdAt'] as num).toInt(),
      );
}
