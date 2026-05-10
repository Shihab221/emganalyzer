import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/user_model.dart';

class AuthStore {
  static const _userKey = 'emg_user_json';

  static Future<UserModel?> loadUser() async {
    final p = await SharedPreferences.getInstance();
    final s = p.getString(_userKey);
    if (s == null || s.isEmpty) return null;
    try {
      return UserModel.fromJson(jsonDecode(s) as Map<String, dynamic>);
    } catch (_) {
      await p.remove(_userKey);
      return null;
    }
  }

  static Future<void> saveUser(UserModel u) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_userKey, jsonEncode(u.toJson()));
  }

  static Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_userKey);
  }
}
