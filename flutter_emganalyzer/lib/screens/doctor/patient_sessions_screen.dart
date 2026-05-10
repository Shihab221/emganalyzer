import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/patient_row.dart';
import '../../models/session_list_row.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_store.dart';
import '../../theme/app_theme.dart';
import '../../widgets/fatigue_session_row.dart';
import 'doctor_session_detail_screen.dart';

class PatientSessionsScreen extends StatefulWidget {
  static const route = '/doctor/patient';

  final String patientId;

  const PatientSessionsScreen({super.key, required this.patientId});

  @override
  State<PatientSessionsScreen> createState() => _PatientSessionsScreenState();
}

class _PatientSessionsScreenState extends State<PatientSessionsScreen> {
  PatientRow? _patient;
  UserModel? _doctor;
  List<SessionListRow> _sessions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final doc = await AuthStore.loadUser();
      final api = ApiService.instance;
      final patients = await api.fetchPatients();
      final sessions = await api.fetchPatientSessions(widget.patientId);
      PatientRow? p;
      for (final e in patients) {
        if (e.id == widget.patientId) {
          p = e;
          break;
        }
      }
      if (p == null) throw Exception('Patient not found');
      if (mounted) {
        setState(() {
          _doctor = doc;
          _patient = p;
          _sessions = sessions;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  String _fmtRange(SessionListRow s) {
    final start = DateTime.fromMillisecondsSinceEpoch(s.startTime);
    final df = DateFormat.yMMMd().add_Hms();
    final end = s.endTime != null ? DateFormat.Hms().format(DateTime.fromMillisecondsSinceEpoch(s.endTime!)) : '…';
    return '${df.format(start)} → $end';
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Container(
        decoration: AppTheme.screenBackdrop(dark),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back),
                    ),
                    const Icon(Icons.history, color: Color(0xFF10B981)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _patient?.name ?? 'Patient',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Sessions (newest first). Tap a row to view charts and comments.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
                  ],
                ),
              ),
              if (_patient != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: dark ? 0.1 : 0.6)),
                      color: dark ? const Color(0xFF1E293B).withValues(alpha: 0.82) : Colors.white.withValues(alpha: 0.75),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Email: ${_patient!.email}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            if (_patient!.age != null) Text('${_patient!.age} yrs'),
                            if (_patient!.gender != null)
                              Text(_patient!.gender!.substring(0, 1).toUpperCase() + _patient!.gender!.substring(1)),
                            if (_patient!.heightM != null) Text('${_patient!.heightM} m'),
                            if (_patient!.weightKg != null) Text('${_patient!.weightKg} kg'),
                            if (_patient!.bmi != null) Text('BMI ${_patient!.bmi}'),
                            if (_patient!.isRecording)
                              const Text(
                                'Currently recording',
                                style: TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.w600),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? Center(child: Text(_error!))
                        : _sessions.isEmpty
                            ? const Center(child: Text('No sessions yet for this patient.'))
                            : RefreshIndicator(
                                onRefresh: _load,
                                child: ListView.builder(
                                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                  itemCount: _sessions.length,
                                  itemBuilder: (context, index) {
                                    final s = _sessions[index];
                                    final durMs = (s.endTime ?? (s.isActive ? DateTime.now().millisecondsSinceEpoch : s.startTime)) -
                                        s.startTime;
                                    final durSec = durMs < 0 ? 0 : durMs ~/ 1000;
                                    return FatigueSessionRow(
                                      doctorId: _doctor?.id ?? '',
                                      title: _fmtRange(s),
                                      subtitle: '${s.dataCount ?? '—'} samples · $durSec s',
                                      active: s.isActive,
                                      sessionId: s.id,
                                      onOpenSession: () {
                                        Navigator.of(context).pushNamed(
                                          DoctorSessionDetailScreen.route,
                                          arguments: {
                                            'patientId': widget.patientId,
                                            'sessionId': s.id,
                                          },
                                        );
                                      },
                                    );
                                  },
                                ),
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
