import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';

class GoSignListScreen extends ConsumerStatefulWidget {
  const GoSignListScreen({super.key});

  @override
  ConsumerState<GoSignListScreen> createState() => _GoSignListScreenState();
}

class _GoSignListScreenState extends ConsumerState<GoSignListScreen> {
  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(signTasksProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Signature Tasks', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: tasksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (tasks) => RefreshIndicator(
          onRefresh: () => ref.refresh(signTasksProvider.future),
          child: tasks.isEmpty
              ? const Center(child: Text('No pending signature tasks'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: tasks.length,
                  itemBuilder: (context, index) {
                    final task = tasks[index];
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
                              color: Colors.orange.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.draw_outlined, color: Colors.orange),
                          ),
                          title: Text(
                            task['FormName'] ?? task['FileName'] ?? 'Assignment',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text('Status: ${task['Status'] ?? 'Pending'} • ${task['CreatorName'] ?? '-'}'),
                          trailing: ElevatedButton(
                            onPressed: () {},
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text('Sign'),
                          ),
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
