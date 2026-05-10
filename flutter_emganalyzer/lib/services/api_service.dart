import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import '../app_config.dart';
import '../models/doctor_comment.dart';
import '../models/emg_session.dart';
import '../models/patient_row.dart';
import '../models/session_list_row.dart';
import '../models/session_summary.dart';
import '../models/user_model.dart';

class BackendApiException implements Exception {
  final String message;
  final int? statusCode;
  BackendApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

class ApiService {
  ApiService._internal();
  static final ApiService instance = ApiService._internal();

  late final Dio _dio;

  /// Human-readable API/network errors (avoids dumping raw [DioException] text in the UI).
  static String messageFromError(Object error) {
    if (error is BackendApiException) return error.message;
    if (error is DioException) {
      final inner = error.error;
      if (inner is BackendApiException) return inner.message;
      final data = error.response?.data;
      return _messageFromResponseData(data, error.response?.statusCode);
    }
    final s = error.toString();
    if (s.startsWith('Exception: ')) return s.substring(11);
    return s;
  }

  static String _messageFromResponseData(dynamic data, int? statusCode) {
    if (data is Map) {
      final m = data['message'] ?? data['error'];
      if (m != null) return m.toString();
    }
    if (data is String && data.isNotEmpty) {
      try {
        final j = jsonDecode(data);
        if (j is Map && j['message'] != null) return j['message'].toString();
      } catch (_) {
        if (data.length < 500) return data;
      }
    }
    final bytes = _asByteList(data);
    if (bytes != null) {
      try {
        final j = jsonDecode(utf8.decode(bytes));
        if (j is Map && j['message'] != null) return j['message'].toString();
      } catch (_) {}
    }
    return 'Request failed${statusCode != null ? ' ($statusCode)' : ''}';
  }

  static Uint8List? _asByteList(dynamic data) {
    if (data is Uint8List) return data;
    if (data is List<int>) return Uint8List.fromList(data);
    return null;
  }

  void init({String? baseUrl}) {
    final root = baseUrl ?? kApiBaseUrl;
    _dio = Dio(
      BaseOptions(
        baseUrl: root.endsWith('/') ? root.substring(0, root.length - 1) : root,
        connectTimeout: const Duration(seconds: 25),
        receiveTimeout: const Duration(seconds: 60),
        headers: {'Content-Type': 'application/json'},
        validateStatus: (code) => code != null && code < 600,
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onResponse: (response, handler) {
          final code = response.statusCode ?? 0;
          if (code >= 400) {
            final msg = _messageFromResponseData(response.data, code);
            handler.reject(
              DioException(
                requestOptions: response.requestOptions,
                response: response,
                type: DioExceptionType.badResponse,
                error: BackendApiException(msg, code),
              ),
            );
            return;
          }
          handler.next(response);
        },
      ),
    );
  }

  Dio get dio => _dio;

  Future<UserModel> login(String email, String password) async {
    final res = await _dio.post('/api/auth/login', data: {'email': email, 'password': password});
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true) {
      throw BackendApiException(map['message']?.toString() ?? 'Login failed', res.statusCode);
    }
    return UserModel.fromJson(Map<String, dynamic>.from(map['user'] as Map));
  }

  Future<UserModel> register(Map<String, dynamic> body) async {
    final res = await _dio.post('/api/auth/register', data: body);
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true) {
      throw BackendApiException(map['message']?.toString() ?? 'Registration failed', res.statusCode);
    }
    return UserModel.fromJson(Map<String, dynamic>.from(map['user'] as Map));
  }

  Future<List<PatientRow>> fetchPatients() async {
    final res = await _dio.get('/api/patients');
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true) throw BackendApiException('Failed to load patients');
    final list = map['patients'] as List<dynamic>? ?? [];
    return list.map((e) => PatientRow.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<SessionSummary>> fetchAllSessions() async {
    final res = await _dio.get('/api/sessions');
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true) throw BackendApiException('Failed to load sessions');
    final list = map['sessions'] as List<dynamic>? ?? [];
    return list.map((e) => SessionSummary.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<SessionListRow>> fetchPatientSessions(String patientId) async {
    final res = await _dio.get('/api/sessions', queryParameters: {'patientId': patientId});
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true) throw BackendApiException('Failed to load sessions');
    final list = map['sessions'] as List<dynamic>? ?? [];
    return list.map((e) => SessionListRow.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<EmgSession> fetchSession(String sessionId) async {
    final res = await _dio.get('/api/sessions', queryParameters: {'sessionId': sessionId});
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true || map['session'] == null) {
      throw BackendApiException(map['message']?.toString() ?? 'Session not found', res.statusCode);
    }
    return EmgSession.fromJson(Map<String, dynamic>.from(map['session'] as Map));
  }

  Future<Map<String, dynamic>> postFatigueAnalysis({
    required String sessionId,
    required String doctorId,
  }) async {
    final res = await _dio.post('/api/fatigue-analysis', data: {'sessionId': sessionId, 'doctorId': doctorId});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<DoctorComment>> fetchComments(String sessionId) async {
    final res = await _dio.get('/api/comments', queryParameters: {'sessionId': sessionId});
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true) throw BackendApiException(map['message']?.toString() ?? 'Failed comments');
    final list = map['comments'] as List<dynamic>? ?? [];
    return list.map((e) => DoctorComment.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> postComment({
    required String sessionId,
    required String doctorId,
    required String doctorName,
    required String content,
  }) async {
    final res = await _dio.post(
      '/api/comments',
      data: {
        'sessionId': sessionId,
        'doctorId': doctorId,
        'doctorName': doctorName,
        'content': content,
      },
    );
    final map = Map<String, dynamic>.from(res.data as Map);
    if (map['success'] != true) throw BackendApiException(map['message']?.toString() ?? 'Comment failed');
  }

  Future<({dynamic latest, List<dynamic> history})> fetchSensorLive() async {
    final res = await _dio.get('/api/sensor-data');
    final map = Map<String, dynamic>.from(res.data as Map);
    final hist = map['history'] as List<dynamic>? ?? [];
    return (latest: map['latest'], history: hist);
  }

  Future<Map<String, dynamic>> getRecording(String patientId) async {
    final res = await _dio.get('/api/recording', queryParameters: {'patientId': patientId});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> postRecordingStart(String patientId) async {
    final res =
        await _dio.post('/api/recording', data: {'patientId': patientId, 'action': 'start'});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> postRecordingStop(String patientId) async {
    final res = await _dio.post('/api/recording', data: {'patientId': patientId, 'action': 'stop'});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> fetchPatientProfile(String patientId) async {
    final res = await _dio.get('/api/patient-profile', queryParameters: {'patientId': patientId});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Uint8List> downloadCsvBytes(String sessionId) async {
    final res = await _dio.get<List<int>>(
      '/api/csv',
      queryParameters: {'sessionId': sessionId},
      options: Options(responseType: ResponseType.bytes),
    );
    if (res.statusCode != 200 || res.data == null) {
      throw BackendApiException('CSV download failed', res.statusCode);
    }
    final bytes = Uint8List.fromList(res.data!);
    if (bytes.isNotEmpty && bytes.length < 400 && bytes[0] == 0x7B) {
      try {
        final j = jsonDecode(utf8.decode(bytes));
        if (j is Map && j['success'] == false) {
          throw BackendApiException(j['message']?.toString() ?? 'CSV export failed', res.statusCode);
        }
      } catch (e) {
        if (e is BackendApiException) rethrow;
      }
    }
    return bytes;
  }

  String? parseFilenameFromHeaders(Headers h) {
    final cd = h.value('content-disposition');
    if (cd == null) return null;
    final m = RegExp(r'filename="([^"]+)"').firstMatch(cd);
    return m?.group(1);
  }
}
