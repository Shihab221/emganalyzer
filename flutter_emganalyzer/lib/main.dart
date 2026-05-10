import 'package:flutter/material.dart';

import 'app_config.dart';
import 'screens/doctor/doctor_home_screen.dart';
import 'screens/doctor/doctor_session_detail_screen.dart';
import 'screens/doctor/patient_sessions_screen.dart';
import 'screens/login_screen.dart';
import 'screens/patient_dashboard_screen.dart';
import 'screens/splash_gate.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ApiService.instance.init(baseUrl: kApiBaseUrl);
  runApp(const EmgAnalyzerApp());
}

class EmgAnalyzerApp extends StatelessWidget {
  const EmgAnalyzerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EMG Analyzer',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(context),
      darkTheme: AppTheme.dark(context),
      themeMode: ThemeMode.system,
      home: const SplashGate(),
      routes: {
        LoginScreen.route: (_) => const LoginScreen(),
        DoctorHomeScreen.route: (_) => const DoctorHomeScreen(),
        PatientDashboardScreen.route: (_) => const PatientDashboardScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == PatientSessionsScreen.route) {
          final id = settings.arguments as String;
          return MaterialPageRoute(
            builder: (_) => PatientSessionsScreen(patientId: id),
          );
        }
        if (settings.name == DoctorSessionDetailScreen.route) {
          final args = settings.arguments as Map<String, String>;
          return MaterialPageRoute(
            builder: (_) => DoctorSessionDetailScreen(
              patientId: args['patientId']!,
              sessionId: args['sessionId']!,
            ),
          );
        }
        return null;
      },
    );
  }
}
