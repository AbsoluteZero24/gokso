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
  String? _selectedYear = DateTime.now().year.toString();
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
      final name = (lap['AssetName'] ?? '').toString().toLowerCase();
      final invNum = (lap['InventoryNumber'] ?? '').toString().toLowerCase();
      final user = (lap['User'] != null ? lap['User']['Name'] : '').toString().toLowerCase();
      final query = _searchController.text.toLowerCase();
      
      final matchesSearch = name.contains(query) || invNum.contains(query) || user.contains(query);
      
      bool matchesYear = true;
      if (_selectedYear != null && _selectedYear != 'Semua Tahun') {
        final dateStr = lap['PurchaseDate'] ?? '';
        matchesYear = dateStr.toString().contains(_selectedYear!);
      }

      bool matchesCategory = true;
      if (_selectedCategory != null && _selectedCategory != 'Semua Kategori') {
        matchesCategory = lap['Category'] == _selectedCategory;
      }

      return matchesSearch && matchesYear && matchesCategory;
    }).toList();
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
                            final userName = lap['User'] != null ? lap['User']['Name'] : 'Unassigned';
                            
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
                                    lap['AssetName'] ?? lap['InventoryNumber'] ?? 'Laptop Asset',
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
                                          Text('${lap['InventoryNumber'] ?? '-'}', style: const TextStyle(fontSize: 12)),
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
                                              color: lap['User'] != null ? AppTheme.primary : Colors.grey,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Text('Detail', style: TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                  onTap: () {},
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
                        ..._categories.map((c) => DropdownMenuItem(value: c['Name'], child: Text(c['Name'], style: const TextStyle(fontSize: 13)))),
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
