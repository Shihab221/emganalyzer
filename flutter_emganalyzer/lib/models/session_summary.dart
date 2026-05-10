class SessionSummary {
  final String id;
  final String patientId;
  final int startTime;

  const SessionSummary({
    required this.id,
    required this.patientId,
    required this.startTime,
  });

  factory SessionSummary.fromJson(Map<String, dynamic> j) => SessionSummary(
        id: j['id'] as String,
        patientId: j['patientId'] as String,
        startTime: (j['startTime'] as num).toInt(),
      );
}
