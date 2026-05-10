class DoctorComment {
  final String id;
  final String sessionId;
  final String doctorId;
  final String doctorName;
  final String content;
  final int timestamp;

  DoctorComment({
    required this.id,
    required this.sessionId,
    required this.doctorId,
    required this.doctorName,
    required this.content,
    required this.timestamp,
  });

  factory DoctorComment.fromJson(Map<String, dynamic> j) => DoctorComment(
        id: j['id'] as String,
        sessionId: j['sessionId'] as String,
        doctorId: j['doctorId'] as String,
        doctorName: j['doctorName'] as String,
        content: j['content'] as String,
        timestamp: (j['timestamp'] as num).toInt(),
      );
}
