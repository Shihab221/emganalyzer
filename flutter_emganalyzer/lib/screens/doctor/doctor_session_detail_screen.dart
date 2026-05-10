import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../domain/signal_analysis.dart';
import '../../models/doctor_comment.dart';
import '../../models/emg_session.dart';
import '../../models/sensor_sample.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_store.dart';
import '../../theme/app_theme.dart';
import '../../widgets/emg_line_chart_card.dart';
import '../../domain/emg_calibration.dart';

class DoctorSessionDetailScreen extends StatefulWidget {
  static const route = '/doctor/session';

  final String patientId;
  final String sessionId;

  const DoctorSessionDetailScreen({super.key, required this.patientId, required this.sessionId});

  @override
  State<DoctorSessionDetailScreen> createState() => _DoctorSessionDetailScreenState();
}

class _DoctorSessionDetailScreenState extends State<DoctorSessionDetailScreen> {
  EmgSession? _session;
  UserModel? _doctor;
  bool _loading = true;
  String? _error;

  bool _analysisBusy = false;
  String? _analysisErr;
  Map<String, dynamic>? _analysis;

  final _commentCtrl = TextEditingController();
  List<DoctorComment> _comments = [];
  bool _commentsBusy = false;
  Timer? _pollTimer;

  Future<void> _bootstrap() async {
    final d = await AuthStore.loadUser();
    if (mounted) setState(() => _doctor = d);
    await _load();
    if (mounted) await _loadComments();
    if (_session?.isActive ?? false) {
      _pollTimer?.cancel();
      _pollTimer = Timer.periodic(const Duration(seconds: 1), (_) async {
        if (!mounted) return;
        if (!(_session?.isActive ?? false)) {
          _pollTimer?.cancel();
          return;
        }
        await _load(silent: true);
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final s = await ApiService.instance.fetchSession(widget.sessionId);
      if (mounted) setState(() => _session = s);
    } catch (e) {
      if (mounted) setState(() => _error = ApiService.messageFromError(e));
    } finally {
      if (mounted && !silent) setState(() => _loading = false);
    }
  }

  Future<void> _runAnalysis() async {
    if (_doctor == null) return;
    setState(() {
      _analysisBusy = true;
      _analysisErr = null;
      _analysis = null;
    });
    try {
      final r = await ApiService.instance.postFatigueAnalysis(
        sessionId: widget.sessionId,
        doctorId: _doctor!.id,
      );
      if (mounted) {
        if (r['success'] == true) {
          setState(() => _analysis = r);
        } else {
          setState(() => _analysisErr = r['message']?.toString() ?? 'Failed');
        }
      }
    } catch (e) {
      if (mounted) setState(() => _analysisErr = ApiService.messageFromError(e));
    } finally {
      if (mounted) setState(() => _analysisBusy = false);
    }
  }

  Future<void> _loadComments() async {
    setState(() => _commentsBusy = true);
    try {
      final c = await ApiService.instance.fetchComments(widget.sessionId);
      if (mounted) setState(() => _comments = c);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.messageFromError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _commentsBusy = false);
    }
  }

  Future<void> _postComment() async {
    if (_doctor == null || _commentCtrl.text.trim().isEmpty) return;
    try {
      await ApiService.instance.postComment(
        sessionId: widget.sessionId,
        doctorId: _doctor!.id,
        doctorName: _doctor!.name,
        content: _commentCtrl.text.trim(),
      );
      _commentCtrl.clear();
      await _loadComments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.messageFromError(e))),
        );
      }
    }
  }

  Future<void> _downloadCsv() async {
    try {
      final bytes = await ApiService.instance.downloadCsvBytes(widget.sessionId);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/emg_${widget.sessionId}.csv');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles([XFile(file.path)], text: 'EMG session CSV');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.messageFromError(e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final s = _session;
    return Scaffold(
      body: Container(
        decoration: AppTheme.screenBackdrop(dark),
        child: SafeArea(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : s == null
                      ? const Center(child: Text('Not found'))
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                children: [
                                  IconButton(
                                    onPressed: () => Navigator.of(context).pop(),
                                    icon: const Icon(Icons.arrow_back),
                                  ),
                                  Expanded(
                                    child: Text(
                                      s.patientName,
                                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  IconButton(onPressed: () => _load(), icon: const Icon(Icons.refresh)),
                                ],
                              ),
                              if (s.patientId != widget.patientId)
                                const Text('Warning: session patient id mismatch URL.',
                                    style: TextStyle(color: Colors.red)),
                              _infoCard(context, s),
                              const SizedBox(height: 12),
                              Wrap(
                                alignment: WrapAlignment.end,
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (s.data.isNotEmpty)
                                    FilledButton.icon(
                                      onPressed: _downloadCsv,
                                      style: FilledButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
                                      icon: const Icon(Icons.download, size: 18),
                                      label: const Text('Download CSV'),
                                    ),
                                  FilledButton.icon(
                                    onPressed: _analysisBusy || s.data.isEmpty ? null : _runAnalysis,
                                    style: FilledButton.styleFrom(backgroundColor: const Color(0xFF7C3AED)),
                                    icon: _analysisBusy
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                          )
                                        : const Icon(Icons.analytics_outlined, size: 18),
                                    label: const Text('Analysis'),
                                  ),
                                ],
                              ),
                              if (_analysisBusy) const LinearProgressIndicator(minHeight: 2),
                              if (_analysisErr != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(_analysisErr!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                                ),
                              if (_analysis != null && _analysis!['success'] == true)
                                _analysisBox(context, _analysis!),
                              const SizedBox(height: 12),
                              _statGrid(context, s.data),
                              EmgLineChartCard(
                                data: _decimate(s.data, 1200),
                                title: 'Recorded EMG',
                              ),
                              const SizedBox(height: 12),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: _rmsCard(context, s.data)),
                                  const SizedBox(width: 12),
                                  Expanded(child: _fftMini(context, s.data)),
                                ],
                              ),
                              const SizedBox(height: 16),
                              _commentsSection(context),
                            ],
                          ),
                        ),
        ),
      ),
    );
  }

  List<SensorSample> _decimate(List<SensorSample> d, int maxN) {
    if (d.length <= maxN) return d;
    final step = (d.length / maxN).ceil();
    final out = <SensorSample>[];
    for (var i = 0; i < d.length; i += step) {
      out.add(d[i]);
    }
    return out;
  }

  Widget _infoCard(BuildContext context, EmgSession s) {
    final df = DateFormat.yMMMMd().add_Hms();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.3)),
        color: darkSurface(context),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Started: ${df.format(DateTime.fromMillisecondsSinceEpoch(s.startTime))}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (s.endTime != null)
            Text('Ended: ${df.format(DateTime.fromMillisecondsSinceEpoch(s.endTime!))}', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          Text('Status: ${s.isActive ? 'Recording' : 'Completed'} · ${s.data.length} samples',
              style: Theme.of(context).textTheme.titleMedium),
        ],
      ),
    );
  }

  Color darkSurface(BuildContext ctx) =>
      Theme.of(ctx).brightness == Brightness.dark ? const Color(0xFF1E293B).withValues(alpha: 0.82) : Colors.white.withValues(alpha: 0.76);

  Widget _statGrid(BuildContext context, List<SensorSample> data) {
    final latest = data.isEmpty ? null : rawEmgToMv(data.last.emg);
    final dur = data.isEmpty
        ? 0
        : () {
            final end = (_session!.endTime ?? (_session!.isActive ? DateTime.now().millisecondsSinceEpoch : _session!.startTime));
            return ((end - _session!.startTime) / 1000).floor().clamp(0, 1 << 31);
          }();

    Widget tile(String title, String v, String u, IconData ic, Color c) => Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: darkSurface(context),
            border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(ic, color: c, size: 22),
              const SizedBox(height: 8),
              Text(title, style: Theme.of(context).textTheme.labelSmall),
              Text(
                '$v $u'.trim(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        );

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.55,
      children: [
        tile('Latest', latest != null ? latest.toStringAsFixed(2) : '—', 'mV', Icons.flash_on, Colors.red),
        tile('Samples', '${data.length}', 'pts', Icons.show_chart, Colors.blue),
        tile('Duration', '$dur', 'sec', Icons.timer, Colors.green),
        tile('Display rate', '$displaySampleRateHz', 'Hz', Icons.speed, Colors.amber.shade700),
      ],
    );
  }

  Widget _rmsCard(BuildContext context, List<SensorSample> data) {
    final rms = calculateRMS(data);
    final st = calculateStats(data);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: darkSurface(context),
        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('RMS analysis', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('Window: ${rms.windowSize} samples (AC coupling, mean removed)'),
          Text('Min / Max: ${st.min} / ${st.max} mV'),
        ],
      ),
    );
  }

  Widget _fftMini(BuildContext context, List<SensorSample> data) {
    final rate = inferSampleRateHz(data);
    final fft = calculateFFT(data, rate > 0.1 ? rate : 1);
    final n = fft.frequencies.length.clamp(0, 14);
    return Container(
      padding: const EdgeInsets.all(12),
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: darkSurface(context),
        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('FFT (bins)', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          Expanded(
            child: n == 0
                ? const Center(child: Text('Insufficient data'))
                : BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: math.max(
                              fft.magnitudes.take(n).fold<double>(
                                    0,
                                    (p, v) => v > p ? v : p,
                                  ) *
                                  1.15,
                              1e-6,
                            ),
                      barGroups: List.generate(
                        n,
                        (i) => BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: fft.magnitudes[i],
                              width: 10,
                              color: const Color(0xFF06B6D4),
                            ),
                          ],
                        ),
                      ),
                      titlesData: FlTitlesData(
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (v, __) =>
                                Text(v.toInt().toString(), style: const TextStyle(fontSize: 8)),
                          ),
                        ),
                        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      ),
                      gridData: FlGridData(show: true, horizontalInterval: 1),
                      borderData: FlBorderData(show: false),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _analysisBox(BuildContext ctx, Map<String, dynamic> r) {
    final pred = r['prediction'];
    final probs = (r['probabilities'] as Map?)
            ?.map((k, v) => MapEntry(k.toString(), (v as num).toDouble())) ??
        {};
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF7C3AED).withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Fatigue analysis', style: Theme.of(ctx).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          Text(pred == 0 ? 'Class 0 (lower fatigue signal)' : 'Class 1 (elevated signal)'),
          Text(probs.entries.map((e) => '${e.key}: ${(e.value * 100).toStringAsFixed(1)}%').join(' · ')),
        ],
      ),
    );
  }

  Widget _commentsSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: darkSurface(context),
        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Doctor comments', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          if (_commentsBusy) const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator(minHeight: 2)),
          ..._comments.map(
            (c) => Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.doctorName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(DateFormat.yMd().add_jm().format(DateTime.fromMillisecondsSinceEpoch(c.timestamp))),
                  Text(c.content),
                  const Divider(),
                ],
              ),
            ),
          ),
          TextField(
            controller: _commentCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Add a clinical note…',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          FilledButton(onPressed: _postComment, child: const Text('Post comment')),
        ],
      ),
    );
  }
}
