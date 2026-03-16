import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final assetsProvider = FutureProvider.family<List<dynamic>, String?>((ref, status) async {
  return await ApiService.getAssets(status: status);
});

final dashboardProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  return await ApiService.getDashboard();
});

final laptopsProvider = FutureProvider<List<dynamic>>((ref) async {
  return await ApiService.getLaptops();
});

final formsProvider = FutureProvider<List<dynamic>>((ref) async {
  return await ApiService.getForms();
});

final signTasksProvider = FutureProvider<List<dynamic>>((ref) async {
  final result = await ApiService.getSignTasks();
  if (result is Map && result.containsKey('tasks')) {
    return result['tasks'] as List<dynamic>;
  } else if (result is List) {
    return result;
  }
  return [];
});

final dmsFoldersProvider = FutureProvider<List<dynamic>>((ref) async {
  return await ApiService.getDocuments();
});

final usersProvider = FutureProvider<List<dynamic>>((ref) async {
  return await ApiService.getUsers();
});

final authProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return await ApiService.checkAuth();
});
