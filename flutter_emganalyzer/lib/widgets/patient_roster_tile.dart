import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/patient_row.dart';

class PatientRosterTile extends StatelessWidget {
  final PatientRow patient;
  final int sessionCount;
  final int? lastSessionMs;
  final VoidCallback onTap;

  const PatientRosterTile({
    super.key,
    required this.patient,
    required this.sessionCount,
    required this.lastSessionMs,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final lastLabel = lastSessionMs != null
        ? DateFormat.yMMMd().add_jm().format(DateTime.fromMillisecondsSinceEpoch(lastSessionMs!))
        : null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(29.6),
          topRight: Radius.circular(14),
          bottomLeft: Radius.circular(29.6),
          bottomRight: Radius.circular(14),
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.fromLTRB(26, 20, 20, 20),
          decoration: BoxDecoration(
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(29.6),
              topRight: Radius.circular(14),
              bottomLeft: Radius.circular(29.6),
              bottomRight: Radius.circular(14),
            ),
            border: Border.all(
              color: isDark ? const Color(0xFF34D399).withValues(alpha: 0.22) : const Color(0xFFA7F3D0),
            ),
            gradient: LinearGradient(
              colors: isDark
                  ? [
                      const Color(0xFF0F172A).withValues(alpha: 0.92),
                      const Color(0xFF064E3B).withValues(alpha: 0.35),
                      const Color(0xFF0F172A).withValues(alpha: 0.90),
                    ]
                  : [
                      Colors.white.withValues(alpha: 0.94),
                      const Color(0xFFECFDF5).withValues(alpha: 0.88),
                      const Color(0xFFF8FAFC).withValues(alpha: 0.92),
                    ],
              begin: const Alignment(-0.9, -0.2),
              end: const Alignment(1, 1),
            ),
            boxShadow: [
              BoxShadow(
                blurRadius: 24,
                offset: const Offset(0, 10),
                color: isDark
                    ? Colors.black.withValues(alpha: 0.45)
                    : const Color(0xFF10B981).withValues(alpha: 0.12),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: Container(
                  width: 6,
                  decoration: const BoxDecoration(
                    borderRadius:
                        BorderRadius.only(topLeft: Radius.circular(28), bottomLeft: Radius.circular(28)),
                    gradient: LinearGradient(
                      colors: [Color(0xFF34D399), Color(0xFF14B8A6), Color(0xFF0EA5E9)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 10),
                child: LayoutBuilder(
                  builder: (context, c) {
                    final narrow = c.maxWidth < 420;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 52,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(16),
                                      topRight: Radius.circular(16),
                                      bottomLeft: Radius.circular(16),
                                      bottomRight: Radius.circular(6),
                                    ),
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF14B8A6), Color(0xFF059669)],
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF0D9488).withValues(alpha: 0.35),
                                        blurRadius: 8,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.7), width: 3),
                                  ),
                                  child: const Icon(Icons.person_rounded, color: Colors.white, size: 26),
                                ),
                                if (patient.isRecording)
                                  Positioned(
                                    right: -2,
                                    top: -2,
                                    child: Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: const Color(0xFF34D399),
                                        border: Border.all(color: Colors.white, width: 2),
                                        boxShadow: [
                                          BoxShadow(
                                            color: const Color(0xFF34D399).withValues(alpha: 0.8),
                                            blurRadius: 8,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          patient.name,
                                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                                fontWeight: FontWeight.w600,
                                                letterSpacing: -0.3,
                                              ),
                                        ),
                                      ),
                                      if (patient.isRecording) ...[
                                        const SizedBox(width: 8),
                                        Text(
                                          'LIVE',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 1.2,
                                            color:
                                                isDark ? const Color(0xFF5EEAD4) : const Color(0xFF0F766E),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    patient.email,
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55),
                                        ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 10,
                                    runSpacing: 6,
                                    children: [
                                      if (patient.age != null) _chip(context, '${patient.age} yrs', isDark),
                                      if (patient.gender != null)
                                        _chip(context, patient.gender!.toUpperCase(), isDark),
                                      if (patient.heightM != null) _chip(context, '${patient.heightM} m', isDark),
                                      if (patient.weightKg != null) _chip(context, '${patient.weightKg} kg', isDark),
                                      if (patient.bmi != null) _chip(context, 'BMI ${patient.bmi}', isDark, accent: true),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (narrow)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: _statsAndCta(context, isDark, lastLabel),
                          )
                        else
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Expanded(
                                child: Wrap(
                                  spacing: 12,
                                  runSpacing: 8,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: _statsWidgets(context, isDark, lastLabel),
                                ),
                              ),
                              ..._ctaOnly(),
                            ],
                          ),
                        if (narrow) ...[
                          const SizedBox(height: 12),
                          Row(mainAxisAlignment: MainAxisAlignment.end, children: _ctaOnly()),
                        ],
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _statsWidgets(BuildContext context, bool isDark, String? lastLabel) {
    return [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF020617).withValues(alpha: 0.35) : Colors.white.withValues(alpha: 0.65),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              blurRadius: 4,
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.monitor_heart_outlined, size: 18, color: Color(0xFFEF4444)),
            const SizedBox(width: 6),
            Text(
              '$sessionCount',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(width: 4),
            Text(
              sessionCount == 1 ? 'session' : 'sessions',
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
      if (lastLabel != null)
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.schedule, size: 16, color: isDark ? const Color(0xFF2DD4BF) : const Color(0xFF0D9488)),
            const SizedBox(width: 6),
            Text(lastLabel, style: Theme.of(context).textTheme.bodySmall),
          ],
        )
      else
        Text(
          'No sessions yet',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontStyle: FontStyle.italic,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45),
              ),
        ),
    ];
  }

  List<Widget> _ctaOnly() {
    return [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          gradient: const LinearGradient(colors: [Color(0xFF0D9488), Color(0xFF059669)]),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0D9488).withValues(alpha: 0.35),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Open', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            SizedBox(width: 6),
            Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
          ],
        ),
      ),
    ];
  }

  List<Widget> _statsAndCta(BuildContext context, bool isDark, String? lastLabel) => [
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: _statsWidgets(context, isDark, lastLabel),
        ),
      ];

  Widget _chip(BuildContext context, String text, bool isDark, {bool accent = false}) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 10,
        letterSpacing: 0.8,
        fontWeight: FontWeight.w600,
        color: accent
            ? (isDark ? const Color(0xFF5EEAD4) : const Color(0xFF0F766E))
            : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45),
      ),
    );
  }
}
