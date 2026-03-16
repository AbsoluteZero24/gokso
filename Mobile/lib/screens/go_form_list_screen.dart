import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';
import 'go_form_submit_screen.dart';

class GoFormListScreen extends ConsumerStatefulWidget {
  const GoFormListScreen({super.key});

  @override
  ConsumerState<GoFormListScreen> createState() => _GoFormListScreenState();
}

class _GoFormListScreenState extends ConsumerState<GoFormListScreen> {
  @override
  Widget build(BuildContext context) {
    final formsAsync = ref.watch(formsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Digital Forms', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: formsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (forms) => RefreshIndicator(
          onRefresh: () => ref.refresh(formsProvider.future),
          child: forms.isEmpty
              ? const Center(child: Text('No forms available'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: forms.length,
                  itemBuilder: (context, index) {
                    final form = forms[index];
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
                              color: const Color(0xFF10B981).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.assignment_outlined, color: Color(0xFF10B981)),
                          ),
                          title: Text(
                            form['name'] ?? 'Form',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(form['description'] ?? 'No description'),
                          trailing: const Icon(Icons.chevron_right, color: AppTheme.textLight),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => GoFormSubmitScreen(form: form),
                              ),
                            );
                          },
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
