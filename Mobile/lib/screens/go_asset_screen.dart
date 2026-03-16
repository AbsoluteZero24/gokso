import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import 'asset_list_screen.dart';
import 'laptop_list_screen.dart';

class GoAssetScreen extends StatelessWidget {
  const GoAssetScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> subMenus = [
      {
        'title': 'Aset',
        'icon': Icons.inventory_2_rounded,
        'color': const Color(0xFF1E59C5),
        'description': 'Main asset inventory'
      },
      {
        'title': 'Service',
        'icon': Icons.build_circle_rounded,
        'color': const Color(0xFFD97706),
        'description': 'Maintenance & repair'
      },
      {
        'title': 'Gudang',
        'icon': Icons.warehouse_rounded,
        'color': const Color(0xFF059669),
        'description': 'Warehouse management'
      },
      {
        'title': 'Inactive',
        'icon': Icons.pause_circle_rounded,
        'color': const Color(0xFFDC2626),
        'description': 'Retired assets'
      },
      {
        'title': 'Asset Management',
        'icon': Icons.manage_accounts_rounded,
        'color': const Color(0xFF7C3AED),
        'description': 'Labeling & assignment'
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('GoAsset', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textMain,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FadeInDown(
              child: const Text(
                'Inventori',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textMain,
                ),
              ),
            ),
            const SizedBox(height: 8),
            FadeInDown(
              delay: const Duration(milliseconds: 100),
              child: const Text(
                'Manage your assets and inventory items',
                style: TextStyle(color: AppTheme.textLight),
              ),
            ),
            const SizedBox(height: 24),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: subMenus.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = subMenus[index];
                return FadeInRight(
                  delay: Duration(milliseconds: 100 * index),
                  child: InkWell(
                      onTap: () {
                        if (item['title'] == 'Aset') {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const AssetListScreen(title: 'Aset', status: 'Ready')));
                        } else if (item['title'] == 'Service') {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const AssetListScreen(title: 'Service', status: 'Rusak')));
                        } else if (item['title'] == 'Gudang') {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const AssetListScreen(title: 'Gudang', status: 'Obsolete')));
                        } else if (item['title'] == 'Inactive') {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const AssetListScreen(title: 'Inactive', status: 'Hilang')));
                        } else if (item['title'] == 'Asset Management') {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const LaptopListScreen()));
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Opening ${item['title']}...')),
                          );
                        }
                      },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: item['color'].withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(item['icon'], color: item['color'], size: 24),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['title'],
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textMain,
                                  ),
                                ),
                                Text(
                                  item['description'],
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: AppTheme.textLight),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
