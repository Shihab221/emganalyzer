/// Backend root (same as your deployed Next.js app). No trailing slash.
/// Override at build/run time:
///   flutter run --dart-define=API_BASE_URL=https://your-app.vercel.app
library;

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://emganalyzer.vercel.app',
);

bool get apiBaseUrlConfigured =>
    kApiBaseUrl.isNotEmpty && !kApiBaseUrl.contains('YOUR_VERCEL_PROJECT');
