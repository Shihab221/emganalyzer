import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../domain/emg_calibration.dart';
import '../domain/signal_analysis.dart';
import '../models/sensor_sample.dart';
import '../models/user_model.dart';
import 'login_screen.dart';
import '../services/api_service.dart';
import '../services/auth_store.dart';
import '../theme/app_theme.dart';
import '../widgets/emg_line_chart_card.dart';

class PatientDashboardScreen extends StatefulWidget {
  static const route = '/dashboard';

  const PatientDashboardScreen({super.key});

  @override
  State<PatientDashboardScreen> createState() => _PatientDashboardScreenState();
}

class _PatientDashboardScreenState extends State<PatientDashboardScreen> {
  UserModel? _user;
  Map<String, dynamic>? _profile;
  List<SensorSample> _hist = [];
  SensorSample? _latest;
  bool _connected = false;
  Timer? _sensorTimer;

  bool _recording = false;
  int? _recordingStartMs;
  bool _recordingBusy = false;
  String? _lastSessionId;

  Timer? _wallTimer;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final u = await AuthStore.loadUser();
    if (!mounted) return;
    if (u == null || !u.isPatient) {
      Navigator.of(context).pushNamedAndRemoveUntil(LoginScreen.route, (_) => false);
      return;
    }
    setState(() => _user = u);
    await _loadProfile();
    await _syncRecording();
    _sensorTimer?.cancel();
    _sensorTimer =
        Timer.periodic(const Duration(milliseconds: 300), (_) => _pollSensor());
    await _pollSensor();
  }

  Future<void> _loadProfile() async {
    if (_user == null) return;
    try {
      final r = await ApiService.instance.fetchPatientProfile(_user!.id);
      if (mounted && r['success'] == true && r['profile'] != null) {
        setState(() => _profile = Map<String, dynamic>.from(r['profile'] as Map));
      }
    } catch (_) {}
  }

  Future<void> _syncRecording() async {
    if (_user == null) return;
    try {
      final data = await ApiService.instance.getRecording(_user!.id);
      if (data['success'] == true &&
          data['recording'] == true &&
          data['startedAt'] != null) {
        setState(() {
          _recording = true;
          _recordingStartMs = (data['startedAt'] as num).toInt();
        });
      } else {
        setState(() {
          _recording = false;
          _recordingStartMs = null;
        });
      }
    } catch (_) {}
    _kickWallTimer();
  }

  void _kickWallTimer() {
    _wallTimer?.cancel();
    if (!_recording) return;
    _wallTimer = Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (!mounted || !_recording) {
        _wallTimer?.cancel();
        return;
      }
      setState(() {});
    });
  }

  Future<void> _pollSensor() async {
    try {
      final tuple = await ApiService.instance.fetchSensorLive();
      final latestMap = tuple.latest;
      final histRaw = tuple.history;
      if (latestMap == null || latestMap is! Map) {
        if (mounted) setState(() => _connected = false);
        return;
      }
      final cur = SensorSample.fromJson(Map<String, dynamic>.from(latestMap));
      final h = histRaw
          .map((e) => SensorSample.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      if (mounted) {
        setState(() {
          _connected = true;
          _latest = cur;
          _hist = h;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _connected = false);
    }
  }

  Future<void> _start() async {
    if (_user == null || _recordingBusy) return;
    setState(() => _recordingBusy = true);
    try {
      final data = await ApiService.instance.postRecordingStart(_user!.id);
      if (data['success'] == true) {
        final st = data['startedAt'];
        setState(() {
          _recording = true;
          _recordingStartMs =
              st != null ? (st as num).toInt() : DateTime.now().millisecondsSinceEpoch;
          _lastSessionId = null;
        });
        _kickWallTimer();
      }
    } finally {
      if (mounted) setState(() => _recordingBusy = false);
    }
  }

  Future<void> _stop() async {
    if (_user == null || _recordingBusy) return;
    setState(() => _recordingBusy = true);
    try {
      final data = await ApiService.instance.postRecordingStop(_user!.id);
      if (data['success'] == true && data['session'] != null) {
        final sid =
            Map<String, dynamic>.from(data['session'] as Map)['id'] as String?;
        setState(() {
          _recording = false;
          _recordingStartMs = null;
          if (sid != null) _lastSessionId = sid;
        });
        _wallTimer?.cancel();
      }
    } finally {
      if (mounted) setState(() => _recordingBusy = false);
    }
  }

  Future<void> _downloadLast() async {
    if (_lastSessionId == null) return;
    try {
      final bytes =
          await ApiService.instance.downloadCsvBytes(_lastSessionId!);
      final dir = await getTemporaryDirectory();
      final safe = _lastSessionId!.replaceAll(RegExp(r'[^\w.-]'), '_');
      final file = File('${dir.path}/emg_$safe.csv');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles([XFile(file.path)], text: 'EMG session CSV');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  void dispose() {
    _sensorTimer?.cancel();
    _wallTimer?.cancel();
    super.dispose();
  }

  int _elapsedSec() {
    if (!_recording || _recordingStartMs == null) return 0;
    return DateTime.now()
        .difference(DateTime.fromMillisecondsSinceEpoch(_recordingStartMs!))
        .inSeconds
        .abs();
  }

  List<SensorSample> _rmsInput() {
    final base = _hist.isNotEmpty
        ? List<SensorSample>.from(_hist)
        : (_latest != null ? <SensorSample>[_latest!] : <SensorSample>[]);
    if (base.length > 512) return base.sublist(base.length - 512);
    return base;
  }

  List<SensorSample> _chartData() {
    if (_hist.isEmpty && _latest != null) return [_latest!];
    if (_hist.length <= 320) return List<SensorSample>.from(_hist);
    return List<SensorSample>.from(_hist.sublist(_hist.length - 320));
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final latestMv =
        _latest != null ? (rawEmgToMv(_latest!.emg) * 100).round() / 100 : null;
    final rmsData = calculateRMS(_rmsInput());

    return Scaffold(
      body: Container(
        decoration: AppTheme.screenBackdrop(dark),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async {
              await _pollSensor();
              await _syncRecording();
              await _loadProfile();
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                Row(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        gradient: const LinearGradient(
                          colors: [Color(0xFFEF4444), Color(0xFFF97316)],
                        ),
                      ),
                      child: const Icon(Icons.monitor_heart_outlined, color: Colors.white),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Live dashboard',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          Row(
                            children: [
                              Icon(
                                _connected ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                                color: _connected ? Colors.teal : Colors.grey,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _connected
                                      ? 'Sensor stream reachable'
                                      : 'No live samples yet (ESP32 inactive?)',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(onPressed: _boot, icon: const Icon(Icons.refresh)),
                    TextButton.icon(
                      onPressed: () async {
                        await AuthStore.clear();
                        if (!context.mounted) return;
                        Navigator.of(context)
                            .pushNamedAndRemoveUntil(LoginScreen.route, (_) => false);
                      },
                      icon: const Icon(Icons.logout, size: 18),
                      label: const Text('Logout'),
                    ),
                  ],
                ),
                if (_profile != null) ...[
                  const SizedBox(height: 14),
                  _profileBanner(context),
                ],
                const SizedBox(height: 12),
                Text(
                  DateFormat.yMMMMd().add_Hms().format(DateTime.now()),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _recordingBusy || _recording ? null : _start,
                        icon: Icon(_recordingBusy ? Icons.hourglass_bottom : Icons.play_arrow),
                        label: Text(_recordingBusy ? '…' : 'Start'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.tonalIcon(
                        onPressed: _recordingBusy || !_recording ? null : _stop,
                        icon: const Icon(Icons.stop),
                        label: const Text('Stop'),
                      ),
                    ),
                  ],
                ),
                if (_recording)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                      'Recording… ${_elapsedSec()} s',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                const SizedBox(height: 14),
                if (_lastSessionId != null && !_recording)
                  OutlinedButton.icon(
                    onPressed: _downloadLast,
                    icon: const Icon(Icons.download),
                    label: const Text('Download last session CSV'),
                  ),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.65,
                  children: [
                    _miniCard(
                      context,
                      'EMG (latest)',
                      latestMv != null ? '$latestMv' : '—',
                      'mV',
                      Colors.red,
                    ),
                    _miniCard(context, 'Buffer', '${_hist.length}', 'pts', Colors.blue),
                    _miniCard(
                      context,
                      'Duration',
                      '${_recording ? _elapsedSec() : '—'}',
                      'sec',
                      Colors.green,
                    ),
                    _miniCard(
                      context,
                      'Display rate',
                      '$displaySampleRateHz',
                      'Hz',
                      Colors.amber.shade700,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                EmgLineChartCard(data: _chartData()),
                const SizedBox(height: 14),
                Text(
                  'Rolling RMS (window ${rmsData.windowSize}): ${rmsData.value.toStringAsFixed(2)} mV',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _profileBanner(BuildContext context) {
    final n = (_profile?['name'] ?? _user?.name ?? '').toString();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.2)),
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1E293B).withValues(alpha: 0.82)
            : Colors.white.withValues(alpha: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            n,
            style:
                Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          Text(
            '${_profile?['gender']} · ${_profile?['age']} yrs · ${_profile?['heightM']} m · ${_profile?['weightKg']} kg · BMI ${_profile?['bmi']}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _miniCard(BuildContext ctx, String t, String v, String u, Color c) =>
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Theme.of(ctx).brightness == Brightness.dark
              ? const Color(0xFF1E293B).withValues(alpha: 0.75)
              : Colors.white.withValues(alpha: 0.78),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.widgets, color: c, size: 20),
            const Spacer(),
            Text(t, style: Theme.of(ctx).textTheme.labelSmall),
            Text(
              '$v $u',
              style: Theme.of(ctx).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
}
