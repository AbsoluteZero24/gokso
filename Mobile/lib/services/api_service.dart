import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  // Use 127.0.0.1 for Web to avoid some browser weirdness with localhost
  static String get baseUrl {
    if (kIsWeb) return 'http://127.0.0.1:9001/api';
    return 'http://10.0.2.2:9001/api';
  }

  static Future<Map<String, String>> get _headers async {
    final prefs = await SharedPreferences.getInstance();
    final cookie = prefs.getString('cookie') ?? '';
    
    final Map<String, String> headers = {
      'Accept': 'application/json',
    };

    // On Web, browsers manage cookies. On Mobile, we do it manually.
    if (!kIsWeb && cookie.isNotEmpty) {
      headers['Cookie'] = cookie;
    }
    
    return headers;
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
    final response = await http.post(
      Uri.parse('$baseUrl/login'),
      headers: await _headers..addAll({'Content-Type': 'application/x-www-form-urlencoded'}),
      body: {
        'username': username,
        'password': password,
      },
    );

    if (response.statusCode == 200) {
      await _saveCookie(response);
      final data = json.decode(response.body);
      
      // Save user data for persistent profile even if session check fails
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
      final response = await http.get(
        Uri.parse('$baseUrl/dashboard'),
        headers: await _headers,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Server returned ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Dashboard API Error: $e');
      rethrow;
    }
  }

  static Future<List<dynamic>> getNotifications() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/notifications'),
        headers: await _headers,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        return [];
      }
    } catch (e) {
      debugPrint('Notifications API Error: $e');
      return [];
    }
  }

  static Future<Map<String, dynamic>> checkAuth() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/check-auth'),
        headers: await _headers,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        return {'isLoggedIn': false};
      }
    } catch (e) {
      debugPrint('Auth Check Error: $e');
      return {'isLoggedIn': false};
    }
  }

  static Future<List<dynamic>> getAssets({String? status}) async {
    try {
      String url = '$baseUrl/assets-kso';
      if (status != null) {
        url += '?status=$status';
      }
      final response = await http.get(Uri.parse(url), headers: await _headers);
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
      final response = await http.get(Uri.parse('$baseUrl/goform/list'), headers: await _headers);
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
      final response = await http.get(Uri.parse('$baseUrl/goform/init/$formId'), headers: await _headers);
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (e) {
      debugPrint('Error getting form init data: $e');
    }
    return {'employees': [], 'assets': []};
  }

  static Future<Map<String, dynamic>> submitForm(String formId, Map<String, String> body, {List<String>? assetIds}) async {
    try {
      final uri = Uri.parse('$baseUrl/goform/submit/$formId');
      
      // For multipart or complex form data, we might need a different approach, 
      // but let's stick to standard post for now as the backend uses ParseForm()
      final request = http.MultipartRequest('POST', uri);
      request.headers.addAll(await _headers);
      
      body.forEach((key, value) {
        request.fields[key] = value;
      });

      if (assetIds != null) {
        for (final id in assetIds) {
          request.fields['selected_asset_ids[]'] = id;
        }
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to submit form: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error submitting form: $e');
      rethrow;
    }
  }

  static Future<dynamic> getSignTasks() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/gosign/tasks'), headers: await _headers,);
      if (response.statusCode == 200) return json.decode(response.body);
    } catch (e) {
      debugPrint('Error getting sign tasks: $e');
    }
    return [];
  }

  static Future<List<dynamic>> getDocuments() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/godms/edoc'), headers: await _headers);
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
      final response = await http.get(Uri.parse('$baseUrl/users'), headers: await _headers);
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
      final response = await http.get(Uri.parse('$baseUrl/assets-kso/laptop'), headers: await _headers);
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
      await http.get(Uri.parse('$baseUrl/logout'), headers: await _headers);
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('cookie');
    await prefs.remove('user_data');
  }

  static Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user_data');
    if (userStr != null) {
      return json.decode(userStr);
    }
    return null;
  }
  static Future<List<dynamic>> getMasterAssetCategories() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/master-data/asset-category'), headers: await _headers);
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
      final response = await http.get(Uri.parse('$baseUrl/master-data/asset-specs'), headers: await _headers);
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (e) {
      debugPrint('Error getting asset specs: $e');
    }
    return {'ramTypes': [], 'storageTypes': []};
  }

  static Future<Map<String, dynamic>> storeAsset(Map<String, String> body) async {
    try {
      final headers = await _headers;
      headers['Content-Type'] = 'application/json'; // Web usually uses json, but backend handles form too. Wait, routes.go doesn't specify.
      // Usually mobile sends application/x-www-form-urlencoded for standard POST forms in Go if using r.ParseForm()
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      
      final response = await http.post(
        Uri.parse('$baseUrl/assets-kso/store'),
        headers: headers,
        body: body,
      );
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error storing asset: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> storeAssetBulk(Map<String, String> body) async {
    try {
      final headers = await _headers;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';

      final response = await http.post(
        Uri.parse('$baseUrl/assets-kso/bulk-store'),
        headers: headers,
        body: body,
      );
      return json.decode(response.body);
    } catch (e) {
      debugPrint('Error storing bulk assets: $e');
      rethrow;
    }
  }
}
