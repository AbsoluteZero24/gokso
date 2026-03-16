import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';

class GoDMSListScreen extends ConsumerStatefulWidget {
  const GoDMSListScreen({super.key});

  @override
  ConsumerState<GoDMSListScreen> createState() => _GoDMSListScreenState();
}

class _GoDMSListScreenState extends ConsumerState<GoDMSListScreen> {
  @override
  Widget build(BuildContext context) {
    final docsAsync = ref.watch(dmsFoldersProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Document Management', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: docsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (docs) => RefreshIndicator(
          onRefresh: () => ref.refresh(dmsFoldersProvider.future),
          child: docs.isEmpty
              ? const Center(child: Text('No folders found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final doc = docs[index];
                    return FadeInUp(
                      delay: Duration(milliseconds: 50 * (index % 10)),
                      child: Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.purple.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.folder_shared_outlined, color: Colors.purple),
                          ),
                          title: Text(
                            doc['Name'] ?? 'Untitled Folder',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text('Section: ${doc['Section'] ?? '-'}'),
                          trailing: const Icon(Icons.chevron_right, color: AppTheme.textLight),
                          onTap: () {},
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
