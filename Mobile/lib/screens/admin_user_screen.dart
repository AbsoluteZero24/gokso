import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';

class AdminUserScreen extends ConsumerStatefulWidget {
  const AdminUserScreen({super.key});

  @override
  ConsumerState<AdminUserScreen> createState() => _AdminUserScreenState();
}

class _AdminUserScreenState extends ConsumerState<AdminUserScreen> {
  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(usersProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('User Management', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: usersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (users) => RefreshIndicator(
          onRefresh: () => ref.refresh(usersProvider.future),
          child: users.isEmpty
              ? const Center(child: Text('No users found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: users.length,
                  itemBuilder: (context, index) {
                    final user = users[index];
                    final authAsync = ref.watch(authProvider);
                    final bool isSuperAdmin = authAsync.value?['role'] == 'Super Admin';

                    return FadeInUp(
                      delay: Duration(milliseconds: 5 * (index % 10)),
                      child: Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.primary.withOpacity(0.1),
                            child: user['Name'] != null 
                                ? Text(user['Name'][0].toUpperCase(), style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))
                                : null,
                          ),
                          title: Text(
                            user['Name'] ?? 'User',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('NIK: ${user['NIK'] ?? '-'}'),
                              Text('Role: ${user['Role'] ?? '-'}'),
                            ],
                          ),
                          trailing: isSuperAdmin ? const Icon(Icons.edit_outlined, color: AppTheme.primary) : null,
                          onTap: isSuperAdmin ? () {} : null,
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
