import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import 'go_asset_screen.dart';
import 'go_form_list_screen.dart';
import 'go_sign_list_screen.dart';
import 'go_dms_list_screen.dart';
import 'admin_user_screen.dart';
import 'master_data_screen.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';

class AppsScreen extends ConsumerWidget {
  const AppsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('GOKSO Apps', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textMain,
      ),
      body: authAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error loading session: $err')),
        data: (authData) {
          final String role = authData['role'] ?? '';
          final Map<String, dynamic> perms = authData['perms'] ?? {};
          final bool isSuperAdmin = role == 'Super Admin';

          final List<Map<String, dynamic>> menuItems = [
            {
              'title': 'GoAsset',
              'icon': Icons.inventory_2_outlined,
              'color': const Color(0xFF1E59C5),
              'visible': true,
            },
            {
              'title': 'GoForm',
              'icon': Icons.assignment_outlined,
              'color': const Color(0xFF059669),
              'visible': true,
            },
            {
              'title': 'GoSign',
              'icon': Icons.draw_outlined,
              'color': const Color(0xFFD97706),
              'visible': true,
            },
            {
              'title': 'GoDMS',
              'icon': Icons.folder_shared_outlined,
              'color': const Color(0xFF7C3AED),
              'visible': true,
            },
            {
              'title': 'Admin',
              'icon': Icons.admin_panel_settings_outlined,
              'color': const Color(0xFFDC2626),
              'visible': isSuperAdmin,
            },
            {
              'title': 'Setting',
              'icon': Icons.settings_outlined,
              'color': const Color(0xFF475569),
              'visible': isSuperAdmin,
            },
          ].where((item) => item['visible'] == true).toList();

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FadeInDown(
                  child: const Text(
                    'Productivity Suite',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textMain,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: menuItems.length,
                      itemBuilder: (context, index) {
                        final item = menuItems[index];
                        return FadeInUp(
                          delay: Duration(milliseconds: 50 * index),
                          child: InkWell(
                            onTap: () {
                              Widget? nextScreen;
                              switch (item['title']) {
                                case 'GoAsset':
                                  nextScreen = const GoAssetScreen();
                                  break;
                                case 'GoForm':
                                  nextScreen = const GoFormListScreen();
                                  break;
                                case 'GoSign':
                                  nextScreen = const GoSignListScreen();
                                  break;
                                case 'GoDMS':
                                  nextScreen = const GoDMSListScreen();
                                  break;
                                case 'Admin':
                                  nextScreen = const AdminUserScreen();
                                  break;
                                case 'Setting':
                                  nextScreen = const MasterDataScreen();
                                  break;
                                default:
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Opening ${item['title']}...')),
                                  );
                              }

                              if (nextScreen != null) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => nextScreen!),
                                );
                              }
                            },
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    color: (item['color'] as Color).withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Icon(item['icon'], color: item['color'], size: 28),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  item['title'],
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textMain,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (!isSuperAdmin) 
                  Center(
                    child: Text(
                      'Logged in as $role',
                      style: const TextStyle(color: AppTheme.textLight, fontSize: 12),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
