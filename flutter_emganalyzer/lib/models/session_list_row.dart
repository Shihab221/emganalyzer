class SessionListRow {
  final String id;
  final String patientId;
  final String patientName;
  final int? patientAge;
  final String? patientGender;
  final int startTime;
  final int? endTime;
  final bool isActive;
  final int? dataCount;

  SessionListRow({
    required this.id,
    required this.patientId,
    required this.patientName,
    this.patientAge,
    this.patientGender,
    required this.startTime,
    this.endTime,
    required this.isActive,
    this.dataCount,
  });

  factory SessionListRow.fromJson(Map<String, dynamic> j) => SessionListRow(
        id: j['id'] as String,
        patientId: j['patientId'] as String,
        patientName: j['patientName'] as String,
        patientAge: j['patientAge'] != null ? (j['patientAge'] as num).toInt() : null,
        patientGender: j['patientGender'] as String?,
        startTime: (j['startTime'] as num).toInt(),
        endTime: j['endTime'] != null ? (j['endTime'] as num).toInt() : null,
        isActive: j['isActive'] as bool? ?? false,
        dataCount: j['dataCount'] != null ? (j['dataCount'] as num).toInt() : null,
      );
}
