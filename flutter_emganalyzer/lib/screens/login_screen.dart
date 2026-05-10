import 'package:flutter/material.dart';

import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_store.dart';
import '../theme/app_theme.dart';
import 'doctor/doctor_home_screen.dart';
import 'patient_dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  static const route = '/login';

  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  bool _loginMode = true;
  bool _loading = false;
  String? _error;

  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  String _role = 'patient';
  final _age = TextEditingController();
  String _gender = 'male';
  final _height = TextEditingController();
  final _weight = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    _age.dispose();
    _height.dispose();
    _weight.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ApiService.instance;
      late final UserModel user;
      if (_loginMode) {
        user = await api.login(_email.text.trim(), _password.text);
      } else {
        final body = <String, dynamic>{
          'email': _email.text.trim(),
          'password': _password.text,
          'name': _name.text.trim(),
          'role': _role,
          if (_role == 'patient') ...{
            'age': int.parse(_age.text.trim()),
            'gender': _gender,
            'heightM': double.parse(_height.text.trim()),
            'weightKg': double.parse(_weight.text.trim()),
          },
        };
        user = await api.register(body);
      }
      await AuthStore.saveUser(user);
      if (!mounted) return;
      if (user.isDoctor) {
        Navigator.of(context).pushNamedAndRemoveUntil(DoctorHomeScreen.route, (_) => false);
      } else {
        Navigator.of(context).pushNamedAndRemoveUntil(PatientDashboardScreen.route, (_) => false);
      }
    } catch (e) {
      setState(() => _error = ApiService.messageFromError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Container(
        decoration: AppTheme.screenBackdrop(dark),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        gradient: const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF97316)]),
                        boxShadow: [BoxShadow(color: const Color(0xFFDC2626).withValues(alpha: 0.35), blurRadius: 16)],
                      ),
                      child: const Icon(Icons.monitor_heart_outlined, color: Colors.white, size: 32),
                    ),
                    const SizedBox(height: 16),
                    Text('EMG Analyzer', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                    Text('Real-time muscle signal monitor', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey)),
                    const SizedBox(height: 24),
                    glassSurfaceDark(
                      context,
                      Form(
                        key: _form,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: _tab('Sign In', _loginMode, () => setState(() => _loginMode = true)),
                                ),
                                Expanded(
                                  child: _tab('Register', !_loginMode, () => setState(() => _loginMode = false)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            if (!_loginMode) ...[
                              TextFormField(
                                controller: _name,
                                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                              const SizedBox(height: 12),
                            ],
                            TextFormField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
                              validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _password,
                              obscureText: true,
                              decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline)),
                              validator: (v) => (v == null || v.length < 3) ? 'Password too short' : null,
                            ),
                            if (!_loginMode) ...[
                              const SizedBox(height: 12),
                              Text('Role', style: Theme.of(context).textTheme.labelLarge),
                              const SizedBox(height: 6),
                              SegmentedButton<String>(
                                segments: const [
                                  ButtonSegment(value: 'patient', label: Text('Patient'), icon: Icon(Icons.person)),
                                  ButtonSegment(value: 'doctor', label: Text('Doctor'), icon: Icon(Icons.medical_services)),
                                ],
                                selected: {_role},
                                onSelectionChanged: (s) => setState(() => _role = s.first),
                              ),
                              if (_role == 'patient') ...[
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _age,
                                  keyboardType: TextInputType.number,
                                  decoration: const InputDecoration(labelText: 'Age', prefixIcon: Icon(Icons.cake_outlined)),
                                  validator: (v) {
                                    if (_role != 'patient') return null;
                                    final n = int.tryParse(v ?? '');
                                    if (n == null || n < 1 || n > 120) return 'Age 1–120';
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 8),
                                Text('Gender', style: Theme.of(context).textTheme.labelLarge),
                                const SizedBox(height: 6),
                                Row(
                                  children: ['male', 'female', 'other']
                                      .map(
                                        (g) => Expanded(
                                          child: Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 4),
                                            child: ChoiceChip(
                                              label: Text(g[0].toUpperCase() + g.substring(1)),
                                              selected: _gender == g,
                                              onSelected: (_) => setState(() => _gender = g),
                                              selectedColor: const Color(0xFFEF4444),
                                              labelStyle: TextStyle(color: _gender == g ? Colors.white : null),
                                            ),
                                          ),
                                        ),
                                      )
                                      .toList(),
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _height,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  decoration: const InputDecoration(labelText: 'Height (m)', helperText: 'e.g. 1.75'),
                                  validator: (v) {
                                    if (_role != 'patient') return null;
                                    final n = double.tryParse(v ?? '');
                                    if (n == null || n < 0.5 || n > 2.5) return '0.5–2.5 m';
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _weight,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  decoration: const InputDecoration(labelText: 'Weight (kg)'),
                                  validator: (v) {
                                    if (_role != 'patient') return null;
                                    final n = double.tryParse(v ?? '');
                                    if (n == null || n < 15 || n > 400) return '15–400 kg';
                                    return null;
                                  },
                                ),
                              ],
                            ],
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  color: Colors.red.shade50,
                                  border: Border.all(color: Colors.red.shade200),
                                ),
                                child: Text(_error!, style: TextStyle(color: Colors.red.shade800)),
                              ),
                            ],
                            const SizedBox(height: 18),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: _loading ? null : _submit,
                                  child: Ink(
                                    height: 50,
                                    decoration: const BoxDecoration(
                                      gradient: LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF97316)]),
                                    ),
                                    child: Center(
                                      child: _loading
                                          ? const SizedBox(
                                              height: 22,
                                              width: 22,
                                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                            )
                                          : Text(
                                              _loginMode ? 'Sign In' : 'Create account',
                                              style:
                                                  const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
                                            ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 50),
                          ],
                        ),
                      ),
                      padding: const EdgeInsets.all(20),
                      radius: 22,
                    ),
                    if (_loginMode) ...[
                      const SizedBox(height: 20),
                      Text('Demo accounts', style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.grey)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: Colors.white.withValues(alpha: 0.85),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: const Text(
                          'Doctor: doctor@demo.com / doctor123\nPatient: patient@demo.com / patient123',
                          style: TextStyle(fontSize: 11, height: 1.45),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _tab(String label, bool sel, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: sel ? const Color(0xFFEF4444) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(fontWeight: FontWeight.w600, color: sel ? Colors.white : Colors.grey.shade700),
        ),
      ),
    );
  }
}
