class UserModel {
  final String id;
  final String email;
  final String name;
  final String role;
  final int createdAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.createdAt,
  });

  bool get isDoctor => role == 'doctor';
  bool get isPatient => role == 'patient';

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'createdAt': createdAt,
      };

  factory UserModel.fromJson(Map<String, dynamic> j) => UserModel(
        id: j['id'] as String,
        email: j['email'] as String,
        name: j['name'] as String,
        role: j['role'] as String,
        createdAt: (j['createdAt'] as num).toInt(),
      );
}
