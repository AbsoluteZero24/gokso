import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:9001/api';
    return 'http://10.0.2.2:9001/api';
  }

  // A single client instance that we'll configure
  static final http.Client _httpClient = http.Client();

  static Future<Map<String, String>> get _headers async {
    final prefs = await SharedPreferences.getInstance();
    final cookie = prefs.getString('cookie') ?? '';
    
    final Map<String, String> headers = {
      'Accept': 'application/json',
    };

    // On Mobile, we must manually manage the Cookie header. 
    // On Web, the browser does it automatically IF withCredentials is true.
    if (!kIsWeb && cookie.isNotEmpty) {
      headers['Cookie'] = cookie;
    }
    
    return headers;
  }

  // INTERNAL HELPER for withCredentials on Web
  static Future<http.Response> _get(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = await _headers;
    
    if (kIsWeb) {
      // Dynamic access to withCredentials to avoid compilation errors on mobile
      try {
        (const Object() as dynamic).toString(); // NOP
        final request = http.Request('GET', uri);
        request.headers.addAll(headers);
        request.followRedirects = true;
        // This is where withCredentials is set on web
        (request as dynamic).withCredentials = true;
        
        final streamedResponse = await _httpClient.send(request);
        return http.Response.fromStream(streamedResponse);
      } catch (e) {
        // Fallback
        return http.get(uri, headers: headers);
      }
    }
    
    return http.get(uri, headers: headers);
  }

  static Future<http.Response> _post(String path, {Object? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = await _headers;
    
    if (kIsWeb) {
      try {
        final request = http.Request('POST', uri);
        request.headers.addAll(headers);
        if (body is Map<String, String>) {
          request.bodyFields = body;
        } else if (body is String) {
          request.body = body;
        }
        (request as dynamic).withCredentials = true;
        
        final streamedResponse = await _httpClient.send(request);
        return http.Response.fromStream(streamedResponse);
      } catch (e) {
        return http.post(uri, headers: headers, body: body);
      }
    }
    
    return http.post(uri, headers: headers, body: body);
  }

  static Future<void> _saveCookie(http.Response response) async {
    final rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      final prefs = await SharedPreferences.getInstance();
      final cookie = rawCookie.split(';').first;
      await prefs.setString('cookie', cookie);
    }
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await _post(
      '/login',
      body: {
        'username': username,
        'password': password,
      },
    );

    if (response.statusCode == 200) {
      await _saveCookie(response);
      final data = json.decode(response.body);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', json.encode(data));
      return data;
    } else {
      Map<String, dynamic> error = {};
      try {
        error = json.decode(response.body);
      } catch (_) {}
      throw Exception(error['error'] ?? 'Login failed (${response.statusCode})');
    }
  }

  static Future<Map<String, dynamic>> getDashboard() async {
    try {
      final response = await _get('/dashboard');
      if (response.statusCode == 200) return json.decode(response.body);
      throw Exception('Server returned ${response.statusCode}');
    } catch (e) {
      debugPrint('Dashboard API Error: $e');
      rethrow;
    }
  }

  static Future<List<dynamic>> getNotifications() async {
    try {
      final response = await _get('/notifications');
      if (response.statusCode == 200) return json.decode(response.body);
    } catch (e) {
      debugPrint('Notifications API Error: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>> checkAuth() async {
    try {
      final response = await _get('/check-auth');
      if (response.statusCode == 200) return json.decode(response.body);
      return {'isLoggedIn': false};
    } catch (e) {
      debugPrint('Auth Check Error: $e');
      return {'isLoggedIn': false};
    }
  }

  static Future<List<dynamic>> getAssets({String? status}) async {
    try {
      String path = '/assets-kso';
      if (status != null) path += '?status=$status';
      final response = await _get(path);
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['assets'] ?? [];
      }
    } catch (e) {
      debugPrint('Error getting assets: $e');
    }
    return [];
  }

  static Future<List<dynamic>> getForms() async {
    try {
      final response = await _get('/goform/list');
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is Map && data.containsKey('forms') && data['forms'] != null) {
          return data['forms'] as List<dynamic>;
        }
        if (data is List) return data;
      }
    } catch (e) {
      debugPrint('Error getting forms: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>> getFormInitData(String formId) async {
    try {
      final response = await _get('/goform/init/$formId');
      if (response.statusCode == 200) return json.decode(response.body);
    } catch (e) {
      debugPrint('Error getting form init data: $e');
    }
    return {'employees': [], 'assets': []};
  }

  static Future<Map<String, dynamic>> submitForm(String formId, Map<String, String> body, {List<String>? assetIds}) async {
    try {
      final uri = Uri.parse('$baseUrl/goform/submit/$formId');
      final request = http.MultipartRequest('POST', uri);
      request.headers.addAll(await _headers);
      if (kIsWeb) (request as dynamic).withCredentials = true;
      
      body.forEach((key, value) {
        request.fields[key] = value;
      });

      if (assetIds != null) {
        for (final id in assetIds) {
          request.fields['selected_asset_ids[]'] = id;
        }
      }

      final streamedResponse = await _httpClient.send(request);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) return json.decode(response.body);
      throw Exception('Failed to submit form: ${response.body}');
    } catch (e) {
      debugPrint('Error submitting form: $e');
      rethrow;
    }
  }

  static Future<dynamic> getSignTasks() async {
    try {
      final response = await _get('/gosign/tasks');
      if (response.statusCode == 200) return json.decode(response.body);
    } catch (e) {
      debugPrint('Error getting sign tasks: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>> signTask(String taskId) async {
    final response = await _post(
      '/gosign/sign',
      body: {'task_id': taskId},
    );
    if (response.statusCode == 200) return json.decode(response.body);
    throw Exception(json.decode(response.body)['error'] ?? 'Gagal menandatangani');
  }

  static Future<Map<String, dynamic>> rejectTask(String taskId, String reason) async {
    final response = await _post(
      '/gosign/reject',
      body: {'task_id': taskId, 'reason': reason},
    );
    if (response.statusCode == 200) return json.decode(response.body);
    throw Exception(json.decode(response.body)['error'] ?? 'Gagal menolak');
  }

  static Future<List<dynamic>> getDocuments() async {
    try {
      final response = await _get('/godms/edoc');
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['folders'] ?? [];
      }
    } catch (e) {
      debugPrint('Error getting documents: $e');
    }
    return [];
  }

  static Future<List<dynamic>> getUsers() async {
    try {
      final response = await _get('/users');
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is Map && data.containsKey('users') && data['users'] != null) {
          return data['users'] as List<dynamic>;
        }
        if (data is List) return data;
      }
    } catch (e) {
      debugPrint('Error getting users: $e');
    }
    return [];
  }

  static Future<List<dynamic>> getLaptops() async {
    try {
      final response = await _get('/assets-kso/laptop');
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['assets'] ?? [];
      }
    } catch (e) {
      debugPrint('Error getting laptops: $e');
    }
    return [];
  }
  
  static Future<void> logout() async {
    try {
      await _get('/logout');
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('cookie');
    await prefs.remove('user_data');
  }

  static Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user_data');
    if (userStr != null) return json.decode(userStr);
    return null;
  }

  static Future<List<dynamic>> getMasterAssetCategories() async {
    try {
      final response = await _get('/master-data/asset-category');
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['categories'] ?? [];
      }
    } catch (e) {
      debugPrint('Error getting asset categories: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>> getAssetSpecs() async {
    try {
      final response = await _get('/master-data/asset-specs');
      if (response.statusCode == 200) return json.decode(response.body);
    } catch (e) {
      debugPrint('Error getting asset specs: $e');
    }
    return {'ramTypes': [], 'storageTypes': []};
  }

  static Future<Map<String, dynamic>> storeAsset(Map<String, String> body) async {
    try {
      final response = await _post('/assets-kso/store', body: body);
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error storing asset: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> updateAsset(String id, Map<String, String> body) async {
    try {
      final response = await _post('/assets-kso/update/$id', body: body);
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error updating asset: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> deleteAsset(String id) async {
    try {
      final uri = Uri.parse('$baseUrl/assets-kso/delete/$id');
      final request = http.Request('DELETE', uri);
      request.headers.addAll(await _headers);
      if (kIsWeb) (request as dynamic).withCredentials = true;
      final streamedResponse = await _httpClient.send(request);
      final response = await http.Response.fromStream(streamedResponse);
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error deleting asset: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> storeAssetBulk(Map<String, String> body) async {
    try {
      final response = await _post('/assets-kso/bulk-store', body: body);
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error storing bulk assets: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> assignAssetLaptop(String assetId, String userId) async {
    try {
      final response = await _post('/assets-kso/laptop/assign', body: {'asset_id': assetId, 'user_id': userId});
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error assigning asset: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> updateAssetLabel(String assetId, String deviceName) async {
    try {
      final response = await _post('/assets-kso/update-label', body: {'asset_id': assetId, 'device_name': deviceName});
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error updating label: $e');
      rethrow;
    }
  }
}
