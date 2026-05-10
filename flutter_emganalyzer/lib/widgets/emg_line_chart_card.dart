import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../domain/emg_calibration.dart';
import '../models/sensor_sample.dart';

class EmgLineChartCard extends StatelessWidget {
  final List<SensorSample> data;
  final String title;

  const EmgLineChartCard({super.key, required this.data, this.title = 'EMG waveform'});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return _shell(
        context,
        const Center(child: Text('Waiting for sensor data…')),
      );
    }
    final take = data.length > 300 ? data.sublist(data.length - 300) : data;
    final fmt = DateFormat('MMM d HH:mm:ss');
    final spots = List<FlSpot>.generate(
      take.length,
      (i) => FlSpot(i.toDouble(), rawEmgToMv(take[i].emg)),
    );
    double minY = spots.map((s) => s.y).reduce((a, b) => a < b ? a : b);
    double maxY = spots.map((s) => s.y).reduce((a, b) => a > b ? a : b);
    final pad = (maxY - minY).abs() < 0.01 ? 0.5 : (maxY - minY) * 0.1;
    minY -= pad;
    maxY += pad;

    return _shell(
      context,
      SizedBox(
        height: 220,
        child: LineChart(
          LineChartData(
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              horizontalInterval: (maxY - minY) / 4,
              getDrawingHorizontalLine: (v) => FlLine(
                color: Theme.of(context).dividerColor.withValues(alpha: 0.25),
                strokeWidth: 1,
              ),
            ),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 28,
                  interval: (spots.length / 4).clamp(1, double.infinity),
                  getTitlesWidget: (v, _) {
                    final idx = v.round().clamp(0, take.length - 1);
                    final t = DateTime.fromMillisecondsSinceEpoch(take[idx].timestamp);
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        DateFormat.Hms().format(t),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 9),
                      ),
                    );
                  },
                ),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 42,
                  getTitlesWidget: (v, _) => Text(
                    v.toStringAsFixed(1),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 9),
                  ),
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            minY: minY,
            maxY: maxY,
            lineBarsData: [
              LineChartBarData(
                spots: spots,
                isCurved: false,
                color: const Color(0xFFEF4444),
                barWidth: 2,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(
                  show: true,
                  color: const Color(0xFFEF4444).withValues(alpha: 0.08),
                ),
              ),
            ],
            lineTouchData: LineTouchData(
              enabled: true,
              touchTooltipData: LineTouchTooltipData(
                getTooltipItems: (touchedSpots) {
                  return touchedSpots.map((s) {
                    final i = s.x.round().clamp(0, take.length - 1);
                    final ts =
                        fmt.format(DateTime.fromMillisecondsSinceEpoch(take[i].timestamp));
                    return LineTooltipItem(
                      '$ts\n${s.y.toStringAsFixed(2)} mV',
                      TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 11),
                    );
                  }).toList();
                },
              ),
            ),
          ),
          duration: Duration.zero,
        ),
      ),
      subtitle: '${take.length} samples · mV (ADC scaled)',
    );
  }

  Widget _shell(BuildContext context, Widget child, {String? subtitle}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.65)),
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1E293B).withValues(alpha: 0.85)
            : Colors.white.withValues(alpha: 0.78),
        boxShadow: [
          BoxShadow(blurRadius: 16, color: Colors.black.withValues(alpha: 0.08), offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF97316)]),
                  boxShadow: [BoxShadow(color: const Color(0xFFDC2626).withValues(alpha: 0.3), blurRadius: 10)],
                ),
                child: const Icon(Icons.show_chart, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    if (subtitle != null)
                      Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}
