import 'package:flutter/material.dart';

import '../services/api_service.dart';

/// Session list row: open session + inline fatigue analysis (same flow as web list).
class FatigueSessionRow extends StatefulWidget {
  final String sessionId;
  final String doctorId;
  final String title;
  final String subtitle;
  final bool active;
  final VoidCallback onOpenSession;

  const FatigueSessionRow({
    super.key,
    required this.sessionId,
    required this.doctorId,
    required this.title,
    required this.subtitle,
    required this.active,
    required this.onOpenSession,
  });

  @override
  State<FatigueSessionRow> createState() => _FatigueSessionRowState();
}

class _FatigueSessionRowState extends State<FatigueSessionRow> {
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _payload;

  Future<void> _run() async {
    setState(() {
      _loading = true;
      _error = null;
      _payload = null;
    });
    try {
      final api = ApiService.instance;
      final res = await api.postFatigueAnalysis(sessionId: widget.sessionId, doctorId: widget.doctorId);
      if (!mounted) return;
      if (res['success'] == true) {
        setState(() => _payload = res);
      } else {
        setState(() => _error = res['message']?.toString() ?? 'Analysis failed');
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _dark(BuildContext ctx) => Theme.of(ctx).brightness == Brightness.dark;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).dividerColor.withValues(alpha: _dark(context) ? 0.2 : 0.35),
        ),
        color: _dark(context) ? const Color(0xFF1E293B).withValues(alpha: 0.72) : Colors.white.withValues(alpha: 0.78),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: InkWell(
                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(16), bottomLeft: Radius.circular(16)),
                  onTap: widget.onOpenSession,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                widget.title,
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                            if (widget.active)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(99),
                                  color: const Color(0xFF22C55E).withValues(alpha: 0.15),
                                ),
                                child: const Text(
                                  'Active',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF16A34A),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(widget.subtitle, style: Theme.of(context).textTheme.bodySmall),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            'View ›',
                            style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.error),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 10, top: 8, bottom: 8),
                child: FilledButton.tonalIcon(
                  onPressed: widget.doctorId.isEmpty || _loading ? null : _run,
                  icon: _loading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.analytics_outlined, size: 18),
                  label: const Text('Analysis'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED).withValues(alpha: 0.15),
                    foregroundColor: const Color(0xFF6D28D9),
                  ),
                ),
              ),
            ],
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          if (_payload != null && _payload!['success'] == true) _result(context, _payload!),
        ],
      ),
    );
  }

  Widget _result(BuildContext context, Map<String, dynamic> r) {
    final pred = r['prediction'];
    final probs = (r['probabilities'] as Map?)
            ?.map((k, v) => MapEntry(k.toString(), (v as num).toDouble())) ??
        {};
    final feats = r['features'] as Map?;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF7C3AED).withValues(alpha: 0.35)),
        color: const Color(0xFF7C3AED).withValues(alpha: 0.06),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.auto_awesome,
                size: 20,
                color: _dark(context) ? Colors.purple.shade200 : Colors.purple,
              ),
              const SizedBox(width: 8),
              Text(
                'Fatigue analysis',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            pred == 0
                ? 'Class 0 — lower fatigue signal (model)'
                : 'Class 1 — elevated fatigue signal (model)',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: _dark(context) ? Colors.purple.shade200 : Colors.deepPurple,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            probs.entries.map((e) => 'Class ${e.key}: ${(e.value * 100).toStringAsFixed(1)}%').join(' · '),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (feats != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _feat(context, 'RMS mV', '${feats['rmsMv']}')),
                Expanded(child: _feat(context, 'Dom. Hz', '${feats['dominantFreqHz']}')),
                Expanded(child: _feat(context, 'σ mV', '${feats['stdMv']}')),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _feat(BuildContext context, String label, String v) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.grey)),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
