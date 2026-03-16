import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';

class MasterDataScreen extends StatelessWidget {
  const MasterDataScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> masterCategories = [
      {'title': 'Master Cabang', 'icon': Icons.business_rounded, 'color': Colors.blue},
      {'title': 'Master Departemen', 'icon': Icons.groups_rounded, 'color': Colors.teal},
      {'title': 'Master Jabatan', 'icon': Icons.badge_rounded, 'color': Colors.orange},
      {'title': 'Master Kategori Aset', 'icon': Icons.category_rounded, 'color': Colors.purple},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Master Data', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: masterCategories.length,
        itemBuilder: (context, index) {
          final item = masterCategories[index];
          return FadeInUp(
            delay: Duration(milliseconds: 100 * index),
            child: Card(
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: item['color'].withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item['icon'], color: item['color']),
                ),
                title: Text(item['title'], style: const TextStyle(fontWeight: FontWeight.bold)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Viewing ${item['title']} data...')),
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }
}
