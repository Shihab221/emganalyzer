import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:emganalyzer/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  testWidgets('App builds splash', (WidgetTester tester) async {
    await tester.pumpWidget(const EmgAnalyzerApp());
    await tester.pump(); // first frame
    expect(find.textContaining('EMG Analyzer'), findsWidgets);
    await tester.pumpAndSettle(); // let SplashGate navigation complete
  });
}
