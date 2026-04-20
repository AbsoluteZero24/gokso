import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';

class LaptopListScreen extends ConsumerStatefulWidget {
  const LaptopListScreen({super.key});

  @override
  ConsumerState<LaptopListScreen> createState() => _LaptopListScreenState();
}

class _LaptopListScreenState extends ConsumerState<LaptopListScreen> {
  // Filter States
  final TextEditingController _searchController = TextEditingController();
  String? _selectedYear = 'Semua Tahun';
  String? _selectedCategory;
  List<dynamic> _categories = [];
  bool _isFiltersVisible = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    final cats = await ApiService.getMasterAssetCategories();
    if (mounted) {
      setState(() => _categories = cats);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<dynamic> _applyFilters(List<dynamic> laptops) {
    return laptops.where((lap) {
      final name = (lap['asset_name'] ?? '').toString().toLowerCase();
      final invNum = (lap['inventory_number'] ?? '').toString().toLowerCase();
      final deviceName = (lap['device_name'] ?? lap['DeviceName'] ?? '').toString().toLowerCase();
      final user = (lap['user'] != null ? lap['user']['name'] : '').toString().toLowerCase();
      final query = _searchController.text.toLowerCase();
      
      final matchesSearch = name.contains(query) || invNum.contains(query) || user.contains(query) || deviceName.contains(query);
      
      bool matchesYear = true;
      if (_selectedYear != null && _selectedYear != 'Semua Tahun') {
        final dateStr = lap['purchase_date'] ?? lap['created_at'] ?? '';
        matchesYear = dateStr.toString().contains(_selectedYear!);
      }

      bool matchesCategory = true;
      if (_selectedCategory != null && _selectedCategory != 'Semua Kategori') {
        matchesCategory = lap['category'] == _selectedCategory;
      }

      return matchesSearch && matchesYear && matchesCategory;
    }).toList();
  }

  void _showDetailSheet(Map<String, dynamic> lap) {
    final deviceName = lap['device_name'] ?? lap['DeviceName'] ?? 'No Label';
    final serialNumber = lap['serial_number'] ?? lap['SerialNumber'] ?? '-';
    final brand = lap['brand'] ?? lap['Brand'] ?? '-';
    final model = lap['type_model'] ?? lap['TypeModel'] ?? '-';
    final user = lap['user'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 24),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.purple.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.laptop_mac_outlined, color: Colors.purple, size: 32),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(lap['asset_name'] ?? 'Laptop Asset', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      Text(lap['inventory_number'] ?? '-', style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            _buildDetailItem(Icons.barcode_reader, 'Serial Number', serialNumber),
            _buildDetailItem(Icons.branding_watermark_outlined, 'Merk / Model', '$brand $model'),
            _buildDetailItem(Icons.label_important_outline, 'Label Device', deviceName, 
              trailing: IconButton(icon: const Icon(Icons.edit_outlined, size: 20, color: AppTheme.primary), onPressed: () => _showUpdateLabelDialog(lap))),
            _buildDetailItem(Icons.person_outline, 'Pemegang / User', user != null ? user['name'] : 'Belum di-assign',
              trailing: IconButton(icon: const Icon(Icons.person_add_alt_outlined, size: 20, color: AppTheme.primary), onPressed: () => _showAssignUserDialog(lap))),
            if (user != null) ...[
              _buildDetailItem(Icons.business_outlined, 'Cabang', user['branch'] ?? '-'),
              _buildDetailItem(Icons.work_outline, 'Jabatan', user['position'] ?? '-'),
            ],
            const SizedBox(height: 40),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showAssignUserDialog(lap),
                    icon: const Icon(Icons.person_add_alt_1_outlined),
                    label: const Text('ASSIGN USER'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary.withOpacity(0.1),
                      foregroundColor: AppTheme.primary,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showUpdateLabelDialog(lap),
                    icon: const Icon(Icons.label_outlined),
                    label: const Text('UPDATE LABEL'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo.withOpacity(0.1),
                      foregroundColor: Colors.indigo,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailItem(IconData icon, String label, String value, {Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade400),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
              ],
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  void _showUpdateLabelDialog(Map<String, dynamic> lap) {
    final controller = TextEditingController(text: lap['device_name'] ?? lap['DeviceName'] ?? '');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update Label Device'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Masukkan label atau nama perangkat baru:', style: TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'Contoh: NB-KSO001',
                filled: true,
                fillColor: Colors.grey.shade50,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('BATAL')),
          ElevatedButton(
            onPressed: () async {
              try {
                final id = (lap['id'] ?? lap['ID']).toString();
                await ApiService.updateAssetLabel(id, controller.text);
                if (mounted) {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Close sheet
                  ref.refresh(laptopsProvider); // Refresh list
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Label berhasil diperbarui')));
                }
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            child: const Text('SIMPAN'),
          ),
        ],
      ),
    );
  }

  void _showAssignUserDialog(Map<String, dynamic> lap) async {
    final usersAsync = await ref.read(usersProvider.future);
    String? selectedUserId = lap['user_id']?.toString() ?? lap['UserID']?.toString();
    
    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final List<dynamic> filteredUsers = usersAsync.where((u) {
            // Simplified search in dialog
            return true; 
          }).toList();

          return AlertDialog(
            title: const Text('Assign User'),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            content: SizedBox(
              width: double.maxFinite,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Pilih karyawan untuk memegang aset ini:', style: TextStyle(fontSize: 13, color: Colors.grey)),
                  const SizedBox(height: 16),
                  Container(
                    constraints: const BoxConstraints(maxHeight: 300),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: filteredUsers.length + 1,
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return ListTile(
                            title: const Text('-- Unassign / Kosongkan --', style: TextStyle(fontSize: 14, color: Colors.red, fontStyle: FontStyle.italic)),
                            selected: selectedUserId == null || selectedUserId == '',
                            onTap: () => setDialogState(() => selectedUserId = ''),
                          );
                        }
                        final user = filteredUsers[index - 1];
                        final id = (user['id'] ?? user['ID']).toString();
                        return ListTile(
                          title: Text(user['name'] ?? user['Name'] ?? 'No Name', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          subtitle: Text('${user['nik'] ?? user['NIK'] ?? '-'} (${user['branch'] ?? user['Branch'] ?? '-'})', style: const TextStyle(fontSize: 11)),
                          selected: selectedUserId == id,
                          onTap: () => setDialogState(() => selectedUserId = id),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('BATAL')),
              ElevatedButton(
                onPressed: () async {
                  try {
                    final id = (lap['id'] ?? lap['ID']).toString();
                    await ApiService.assignAssetLaptop(id, selectedUserId ?? '');
                    if (mounted) {
                      Navigator.pop(context); // Close dialog
                      Navigator.pop(context); // Close sheet
                      ref.refresh(laptopsProvider); // Refresh list
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Penugasan berhasil diperbarui')));
                    }
                  } catch (e) {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: const Text('SIMPAN'),
              ),
            ],
          );
        }
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final laptopsAsync = ref.watch(laptopsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          children: const [
            Text('Asset Management', style: TextStyle(fontWeight: FontWeight.bold)),
            Text('Laptop & Computer Assignment', style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(_isFiltersVisible ? Icons.filter_list_off : Icons.filter_list),
            onPressed: () => setState(() => _isFiltersVisible = !_isFiltersVisible),
          )
        ],
      ),
      body: Column(
        children: [
          if (_isFiltersVisible) _buildFilterPanel(),
          Expanded(
            child: laptopsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Error: $err')),
              data: (laptops) {
                final filteredLaptops = _applyFilters(laptops);
                return RefreshIndicator(
                  onRefresh: () => ref.refresh(laptopsProvider.future),
                  child: filteredLaptops.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.laptop_mac_outlined, size: 64, color: Colors.grey.withOpacity(0.5)),
                              const SizedBox(height: 16),
                              Text(_searchController.text.isNotEmpty || _selectedYear != null || _selectedCategory != null 
                                ? 'Tidak ada data yang cocok dengan filter'
                                : 'No assigned assets found', 
                                style: const TextStyle(color: Colors.grey, fontSize: 16)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredLaptops.length,
                          itemBuilder: (context, index) {
                            final lap = filteredLaptops[index];
                            final userName = lap['user'] != null ? lap['user']['name'] : 'Unassigned';
                            
                            return FadeInUp(
                              delay: Duration(milliseconds: 5 * (index % 10)),
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
                                    child: const Icon(Icons.laptop_mac_outlined, color: Colors.purple),
                                  ),
                                  title: Text(
                                    lap['asset_name'] ?? lap['inventory_number'] ?? 'Laptop Asset',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const Icon(Icons.tag, size: 14, color: Colors.grey),
                                          const SizedBox(width: 4),
                                          Text('${lap['inventory_number'] ?? '-'}', style: const TextStyle(fontSize: 12)),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.person_outline, size: 14, color: AppTheme.primary),
                                          const SizedBox(width: 4),
                                          Text(userName, 
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: lap['user'] != null ? AppTheme.primary : Colors.grey,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  trailing: Tooltip(
                                    message: 'Detail & Actions',
                                    child: InkWell(
                                      onTap: () => _showDetailSheet(lap),
                                      borderRadius: BorderRadius.circular(8),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primary.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Text('Detail', style: TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                                      ),
                                    ),
                                  ),
                                  onTap: () => _showDetailSheet(lap),
                                ),
                              ),
                            );
                          },
                        ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            onChanged: (val) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Cari Aset, No. Inv, Nama User...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchController.text.isNotEmpty 
                ? IconButton(icon: const Icon(Icons.clear, size: 20), onPressed: () => setState(() => _searchController.clear()))
                : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _selectedYear,
                      hint: const Text('Semua Tahun', style: TextStyle(fontSize: 13)),
                      items: ['Semua Tahun', '2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020']
                          .map((y) => DropdownMenuItem(value: y, child: Text(y, style: const TextStyle(fontSize: 13))))
                          .toList(),
                      onChanged: (val) => setState(() => _selectedYear = val),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _selectedCategory,
                      hint: const Text('Semua Kategori', style: TextStyle(fontSize: 13)),
                      items: [
                        const DropdownMenuItem(value: 'Semua Kategori', child: Text('Semua Kategori', style: TextStyle(fontSize: 13))),
                        ..._categories.map((c) {
                          final name = (c['name'] ?? c['Name'] ?? 'Category').toString();
                          return DropdownMenuItem(value: name, child: Text(name, style: const TextStyle(fontSize: 13)));
                        }),
                      ],
                      onChanged: (val) => setState(() => _selectedCategory = val),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
