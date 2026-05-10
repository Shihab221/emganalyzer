import 'package:flutter/material.dart';

import '../../models/patient_row.dart';
import '../../models/session_summary.dart';
import '../../services/api_service.dart';
import '../../services/auth_store.dart';
import '../../theme/app_theme.dart';
import '../../widgets/patient_roster_tile.dart';
import '../login_screen.dart';
import 'patient_sessions_screen.dart';

class DoctorHomeScreen extends StatefulWidget {
  static const route = '/doctor';

  const DoctorHomeScreen({super.key});

  @override
  State<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends State<DoctorHomeScreen> {
  bool _loading = true;
  String? _error;
  List<PatientRow> _patients = [];
  List<SessionSummary> _sessions = [];

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
      final api = ApiService.instance;
      final pr = await api.fetchPatients();
      final sr = await api.fetchAllSessions();
      if (mounted) {
        setState(() {
          _patients = pr;
          _sessions = sr;
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

  int _count(String patientId) => _sessions.where((s) => s.patientId == patientId).length;

  int? _last(String patientId) {
    final list = _sessions.where((s) => s.patientId == patientId).toList();
    if (list.isEmpty) return null;
    return list.map((x) => x.startTime).reduce((a, b) => a > b ? a : b);
  }

  List<PatientRow> get _sorted {
    final copy = [..._patients];
    copy.sort((a, b) {
      if (a.isRecording != b.isRecording) return a.isRecording ? -1 : 1;
      final la = _last(a.id) ?? 0;
      final lb = _last(b.id) ?? 0;
      if (la != lb) return lb.compareTo(la);
      return b.createdAt.compareTo(a.createdAt);
    });
    return copy;
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Container(
        decoration: AppTheme.screenBackdrop(dark),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _load,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(18),
                            gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF0D9488)]),
                            boxShadow: [
                              BoxShadow(color: const Color(0xFF059669).withValues(alpha: 0.35), blurRadius: 16),
                            ],
                          ),
                          child: const Icon(Icons.medical_services_rounded, color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Patients',
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'Open a patient to review sessions, comments, and fatigue analysis.',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
                        TextButton.icon(
                          onPressed: () async {
                            await AuthStore.clear();
                            if (context.mounted) {
                              Navigator.of(context).pushNamedAndRemoveUntil(LoginScreen.route, (_) => false);
                            }
                          },
                          icon: const Icon(Icons.logout, size: 18),
                          label: const Text('Logout'),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_loading)
                  const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
                else if (_error != null)
                  SliverFillRemaining(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(_error!, textAlign: TextAlign.center),
                      ),
                    ),
                  )
                else if (_sorted.isEmpty)
                  const SliverFillRemaining(child: Center(child: Text('No registered patients.')))
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) {
                          final p = _sorted[i];
                          return PatientRosterTile(
                            patient: p,
                            sessionCount: _count(p.id),
                            lastSessionMs: _last(p.id),
                            onTap: () => Navigator.of(context).pushNamed(PatientSessionsScreen.route, arguments: p.id),
                          );
                        },
                        childCount: _sorted.length,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
