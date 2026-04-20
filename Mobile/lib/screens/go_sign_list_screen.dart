import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';
import 'go_sign_detail_screen.dart';

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
        title: const Text('GoSign Approval', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: tasksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (tasks) {
          // Debug print to see what we're actually getting
          debugPrint('GoSign Tasks Received: ${tasks.length}');
          
          final pendingCount = tasks.where((t) => t['status'] == 'Pending').length;
          final completedCount = tasks.where((t) => t['status'] == 'Completed' || t['status'] == 'Signed').length;
          final rejectedCount = tasks.where((t) => t['status'] == 'Rejected').length;

          return RefreshIndicator(
            onRefresh: () => ref.refresh(signTasksProvider.future),
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Persetujuan Tanda Tangan',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _buildStatCard(
                                'Pending',
                                pendingCount.toString(),
                                Colors.orange,
                                Icons.hourglass_empty,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildStatCard(
                                'Selesai',
                                completedCount.toString(),
                                Colors.green,
                                Icons.check_circle_outline,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildStatCard(
                                'Ditolak',
                                rejectedCount.toString(),
                                Colors.red,
                                Icons.cancel_outlined,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if (tasks.isEmpty)
                  SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_late_outlined, size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('Belum ada data persetujuan', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final task = tasks[index];
                          final String taskId = task['id']?.toString() ?? '';
                          final List<dynamic> signers = task['signers'] ?? [];
                          final bool isSigned = signers.any((s) => s['user_id'].toString() == task['current_user_id'].toString() && s['signed'] == true);
                          final String status = task['status'] ?? 'Pending';
                          
                          int signedCount = signers.where((s) => s['signed'] == true).length;
                          int totalSigners = signers.length;

                          return FadeInUp(
                            delay: Duration(milliseconds: 50 * (index % 10)),
                            child: Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: BorderSide(color: Colors.grey.shade200),
                              ),
                              child: InkWell(
                                onTap: () => _navigateToDetail(task),
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(10),
                                            decoration: BoxDecoration(
                                              color: (status == 'Completed' ? Colors.green : Colors.blue).withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Icon(
                                              status == 'Completed' ? Icons.check_circle : Icons.description_outlined,
                                              color: status == 'Completed' ? Colors.green : Colors.blue,
                                              size: 24,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  task['form_name'] ?? task['file_name'] ?? 'Assignment',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                                ),
                                                Text(
                                                  'Oleh: ${task['creator_name'] ?? '-'}',
                                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                                ),
                                              ],
                                            ),
                                          ),
                                          _buildStatusBadge(status, isSigned),
                                        ],
                                      ),
                                      const SizedBox(height: 16),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Progres Tanda Tangan',
                                                style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                '$signedCount / $totalSigners Selesai',
                                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                              ),
                                            ],
                                          ),
                                          if (status == 'Pending' && !isSigned)
                                            ElevatedButton(
                                              onPressed: () => _handleSign(context, taskId),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: AppTheme.primary,
                                                foregroundColor: Colors.white,
                                                elevation: 0,
                                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              ),
                                              child: const Text('Sign Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                            )
                                          else if (isSigned && status == 'Pending')
                                            const Text('Menunggu Lainnya', style: TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.bold))
                                          else if (status == 'Completed')
                                            const Text('Selesai', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                        childCount: tasks.length,
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status, bool isSigned) {
    Color bg = Colors.grey.shade100;
    Color text = Colors.grey.shade600;
    String label = status;

    if (status == 'Completed' || status == "Signed") {
      bg = const Color(0xFFF0FDF4);
      text = const Color(0xFF166534);
      label = "Completed";
    } else if (status == 'Rejected') {
      bg = const Color(0xFFFEF2F2);
      text = const Color(0xFF991B1B);
      label = "Rejected";
    } else if (status == 'Pending') {
      if (isSigned) {
        bg = const Color(0xFFEFF6FF);
        text = const Color(0xFF1D4ED8);
        label = "Signed";
      } else {
        bg = const Color(0xFFFFFBEB);
        text = const Color(0xFF92400E);
        label = "Pending";
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: text),
      ),
    );
  }

  void _navigateToDetail(Map<String, dynamic> task) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => GoSignDetailScreen(task: task),
      ),
    ).then((_) => ref.refresh(signTasksProvider));
  }

  Future<void> _handleSign(BuildContext context, String taskId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Signature'),
        content: const Text('Are you sure you want to sign this document using your registered signature/paraf?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign')),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final res = await ApiService.signTask(taskId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Signed successfully')));
        ref.refresh(signTasksProvider);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _showRejectDialog(BuildContext context, String taskId) async {
    final TextEditingController reasonController = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Rejection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Are you sure you want to reject this request?'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Reason (Optional)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Reject'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final res = await ApiService.rejectTask(taskId, reasonController.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Rejected successfully')));
        ref.refresh(signTasksProvider);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }
}
