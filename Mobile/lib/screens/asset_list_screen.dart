import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';
import 'asset_create_screen.dart';
import 'asset_bulk_create_screen.dart';
import 'package:animate_do/animate_do.dart';

class AssetListScreen extends ConsumerStatefulWidget {
  final String title;
  final String? status;

  const AssetListScreen({
    super.key,
    this.title = 'Asset Inventory',
    this.status,
  });

  @override
  ConsumerState<AssetListScreen> createState() => _AssetListScreenState();
}

class _AssetListScreenState extends ConsumerState<AssetListScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _expandAnimation;
  bool _isOpen = false;

  // Filter States
  final TextEditingController _searchController = TextEditingController();
  String? _selectedYear = DateTime.now().year.toString();
  String? _selectedCategory;
  List<dynamic> _categories = [];
  bool _isFiltersVisible = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      value: 0.0,
      duration: const Duration(milliseconds: 250),
      reverseDuration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _expandAnimation = CurvedAnimation(
      curve: Curves.fastOutSlowIn,
      reverseCurve: Curves.easeInQuad,
      parent: _controller,
    );
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
    _controller.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() {
      _isOpen = !_isOpen;
      if (_isOpen) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
  }

  List<dynamic> _applyFilters(List<dynamic> assets) {
    return assets.where((asset) {
      final name = (asset['AssetName'] ?? '').toString().toLowerCase();
      final invNum = (asset['InventoryNumber'] ?? '').toString().toLowerCase();
      final query = _searchController.text.toLowerCase();
      
      final matchesSearch = name.contains(query) || invNum.contains(query);
      
      bool matchesYear = true;
      if (_selectedYear != null && _selectedYear != 'Semua Tahun') {
        // Tentatively check if invNum or something contains the year if there is no PurchaseDate
        // Or check PurchaseDate if exists
        final dateStr = asset['PurchaseDate'] ?? '';
        matchesYear = dateStr.toString().contains(_selectedYear!);
      }

      bool matchesCategory = true;
      if (_selectedCategory != null && _selectedCategory != 'Semua Kategori') {
        matchesCategory = asset['Category'] == _selectedCategory;
      }

      return matchesSearch && matchesYear && matchesCategory;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final assetsAsync = ref.watch(assetsProvider(widget.status));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(widget.title, style: const TextStyle(fontWeight: FontWeight.bold)),
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
            child: Stack(
              children: [
                assetsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => Center(child: Text('Error: $err')),
                  data: (assets) {
                    final filteredAssets = _applyFilters(assets);
                    return RefreshIndicator(
                      onRefresh: () => ref.refresh(assetsProvider(widget.status).future),
                      child: filteredAssets.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.withOpacity(0.5)),
                                  const SizedBox(height: 16),
                                  Text(_searchController.text.isNotEmpty || _selectedYear != null || _selectedCategory != null 
                                    ? 'Tidak ada aset yang cocok dengan filter'
                                    : 'No ${widget.title.toLowerCase()} data found', 
                                    style: const TextStyle(color: Colors.grey, fontSize: 16)),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: filteredAssets.length,
                              itemBuilder: (context, index) {
                                final asset = filteredAssets[index];
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
                                          color: AppTheme.primary.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.inventory_2_outlined, color: AppTheme.primary),
                                      ),
                                      title: Text(
                                        asset['AssetName'] ?? asset['InventoryNumber'] ?? 'Unnamed Asset',
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      subtitle: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const SizedBox(height: 4),
                                          Text('Label: ${asset['InventoryNumber'] ?? '-'}'),
                                          Text('Location: ${asset['Location'] ?? '-'}'),
                                        ],
                                      ),
                                      trailing: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: (asset['Status'] == 'Ready')
                                              ? Colors.green.withOpacity(0.1)
                                              : (asset['Status'] == 'Rusak' ? Colors.red.withOpacity(0.1) : Colors.orange.withOpacity(0.1)),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          asset['Status'] ?? 'Unknown',
                                          style: TextStyle(
                                            color: (asset['Status'] == 'Ready') 
                                                ? Colors.green 
                                                : (asset['Status'] == 'Rusak' ? Colors.red : Colors.orange),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    );
                  },
                ),
                if (_isOpen)
                  GestureDetector(
                    onTap: _toggle,
                    child: Container(
                      color: Colors.black.withOpacity(0.05),
                      width: double.infinity,
                      height: double.infinity,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _buildStepChild(
            icon: Icons.dynamic_feed_outlined,
            label: 'Sisipan Masal',
            color: Colors.purple,
            index: 1,
            onTap: () async {
              _toggle();
              final refresh = await Navigator.push(context, MaterialPageRoute(builder: (context) => const AssetBulkCreateScreen()));
              if (refresh == true) ref.refresh(assetsProvider(widget.status));
            },
          ),
          const SizedBox(height: 16),
          _buildStepChild(
            icon: Icons.add_box_outlined,
            label: 'Tambah Tunggal',
            color: Colors.blue,
            index: 0,
            onTap: () async {
              _toggle();
              final refresh = await Navigator.push(context, MaterialPageRoute(builder: (context) => const AssetCreateScreen()));
              if (refresh == true) ref.refresh(assetsProvider(widget.status));
            },
          ),
          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: _toggle,
            backgroundColor: _isOpen ? Colors.grey.shade300 : AppTheme.primary,
            elevation: 4,
            shape: const CircleBorder(),
            child: AnimatedRotation(
              duration: const Duration(milliseconds: 200),
              turns: _isOpen ? 0.125 : 0, // 45 degrees
              child: Icon(
                _isOpen ? Icons.add : Icons.add,
                color: _isOpen ? Colors.grey.shade700 : Colors.white,
              ),
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
              hintText: 'Cari No. Inventaris, Nama Aset...',
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

  Widget _buildStepChild({
    required IconData icon,
    required String label,
    required Color color,
    required int index,
    required VoidCallback onTap,
  }) {
    return FadeTransition(
      opacity: _expandAnimation,
      child: ScaleTransition(
        scale: _expandAnimation,
        child: Padding(
          padding: const EdgeInsets.only(right: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4, offset: const Offset(0, 2)),
                  ],
                ),
                child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87)),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 48,
                height: 48,
                child: FloatingActionButton(
                  heroTag: 'fab_$index',
                  onPressed: onTap,
                  backgroundColor: color,
                  elevation: 2,
                  shape: const CircleBorder(),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
