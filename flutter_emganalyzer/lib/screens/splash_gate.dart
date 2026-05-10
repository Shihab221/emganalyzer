import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../app_config.dart';
import '../models/user_model.dart';
import '../services/auth_store.dart';
import '../theme/app_theme.dart';
import 'doctor/doctor_home_screen.dart';
import 'login_screen.dart';
import 'patient_dashboard_screen.dart';

/// Chooses Login vs role home from SharedPreferences — mirror web bootstrap.
class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  @override
  void initState() {
    super.initState();
    _go();
  }

  Future<void> _go() async {
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!apiBaseUrlConfigured) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Configure API_BASE_URL (dart-define) or edit lib/app_config.dart with your Vercel URL.',
            ),
            backgroundColor: Colors.amber.shade800,
            duration: const Duration(seconds: 10),
          ),
        );
      }
    });
    final UserModel? u = await AuthStore.loadUser();
    if (!mounted) return;
    if (u == null) {
      Navigator.of(context).pushReplacementNamed(LoginScreen.route);
      return;
    }
    if (u.isDoctor) {
      Navigator.of(context).pushReplacementNamed(DoctorHomeScreen.route);
    } else {
      Navigator.of(context).pushReplacementNamed(PatientDashboardScreen.route);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: AppTheme.screenBackdrop(Theme.of(context).brightness == Brightness.dark),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  gradient: const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF97316)]),
                  boxShadow: [BoxShadow(color: const Color(0xFFDC2626).withValues(alpha: 0.35), blurRadius: 20)],
                ),
                child: const Icon(Icons.monitor_heart_outlined, color: Colors.white, size: 36),
              ),
              const SizedBox(height: 20),
              Text('EMG Analyzer', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              const CircularProgressIndicator(),
            ],
          ),
        ),
      ),
    );
  }
}
