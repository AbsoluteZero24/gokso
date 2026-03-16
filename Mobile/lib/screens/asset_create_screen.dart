import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AssetCreateScreen extends StatefulWidget {
  const AssetCreateScreen({super.key});

  @override
  State<AssetCreateScreen> createState() => _AssetCreateScreenState();
}

class _AssetCreateScreenState extends State<AssetCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = true;
  bool _isSubmitting = false;

  List<dynamic> _categories = [];
  List<dynamic> _ramTypes = [];
  List<dynamic> _storageTypes = [];

  // Basic Info
  final _inventoryNumberController = TextEditingController();
  final _assetNameController = TextEditingController();
  String? _selectedCategory;
  final _brandController = TextEditingController();
  final _locationController = TextEditingController();
  String _status = 'Ready';
  DateTime _selectedDate = DateTime.now();

  // Technical Specs (for Laptop/Komputer)
  final _osController = TextEditingController();
  final _processorController = TextEditingController();
  final _ramSizeController = TextEditingController();
  String _ramUnit = 'GB';
  String? _selectedRamType;
  final _storageSizeController = TextEditingController();
  String _storageUnit = 'GB';
  String? _selectedStorageType;

  // General Spec
  final _generalSpecController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadMasterData();
  }

  Future<void> _loadMasterData() async {
    try {
      final cats = await ApiService.getMasterAssetCategories();
      final specs = await ApiService.getAssetSpecs();
      if (mounted) {
        setState(() {
          _categories = cats;
          _ramTypes = specs['ramTypes'] ?? [];
          _storageTypes = specs['storageTypes'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading master data: $e')));
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    
    try {
      final Map<String, String> body = {
        'inventory_number': _inventoryNumberController.text,
        'asset_name': _assetNameController.text,
        'category': _selectedCategory!,
        'brand': _brandController.text,
        'status': _status,
        'location': _locationController.text,
        'purchase_date': _selectedDate.toIso8601String().split('T')[0],
      };

      if (_selectedCategory == 'Laptop' || _selectedCategory == 'Komputer') {
        body['spec_os'] = _osController.text;
        body['spec_processor'] = _processorController.text;
        body['spec_ram_size'] = _ramSizeController.text;
        body['spec_ram_unit'] = _ramUnit;
        body['spec_ram_type'] = _selectedRamType ?? '';
        body['spec_storage_size'] = _storageSizeController.text;
        body['spec_storage_unit'] = _storageUnit;
        body['spec_storage_type'] = _selectedStorageType ?? '';
      } else {
        body['specification'] = _generalSpecController.text;
      }

      await ApiService.storeAsset(body);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Aset berhasil ditambahkan')));
        Navigator.pop(context, true); // Return true to trigger refresh
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal menyimpan aset: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final bool isITAsset = _selectedCategory == 'Laptop' || _selectedCategory == 'Komputer';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Tambah Aset', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle('Informasi Dasar'),
              _buildCard([
                _buildTextFormField(
                  controller: _inventoryNumberController,
                  label: 'No. Inventaris',
                  placeholder: 'KSO/2026/001',
                  required: true,
                ),
                const SizedBox(height: 16),
                _buildTextFormField(
                  controller: _assetNameController,
                  label: 'Nama Aset',
                  placeholder: 'Contoh: Laptop Dell Latitude',
                  required: true,
                ),
                const SizedBox(height: 16),
                _buildDropdown<String>(
                  label: 'Kategori',
                  value: _selectedCategory,
                  items: _categories.map((c) => DropdownMenuItem(value: c['Name'].toString(), child: Text(c['Name']))).toList(),
                  onChanged: (val) => setState(() => _selectedCategory = val),
                  required: true,
                ),
                const SizedBox(height: 16),
                _buildTextFormField(
                  controller: _brandController,
                  label: 'Merk / Brand',
                  placeholder: 'Asus, HP, Dell, etc',
                ),
              ]),
              const SizedBox(height: 24),
              _buildSectionTitle('Detail & Lokasi'),
              _buildCard([
                _buildDropdown<String>(
                  label: 'Status',
                  value: _status,
                  items: ['Ready', 'Rusak', 'Obsolete', 'Hilang'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (val) => setState(() => _status = val!),
                ),
                const SizedBox(height: 16),
                _buildTextFormField(
                  controller: _locationController,
                  label: 'Lokasi Penempatan',
                  placeholder: 'Ruang IT, Gudang, etc',
                ),
                const SizedBox(height: 16),
                _buildDatePicker(
                  label: 'Tanggal Pembelian',
                  value: _selectedDate,
                  onChanged: (date) => setState(() => _selectedDate = date),
                ),
              ]),
              const SizedBox(height: 24),
              if (_selectedCategory != null) ...[
                _buildSectionTitle(isITAsset ? 'Spesifikasi Teknis' : 'Spesifikasi'),
                _buildCard([
                  if (isITAsset) ...[
                    _buildTextFormField(controller: _osController, label: 'Sistem Operasi', placeholder: 'Windows 11, macOS'),
                    const SizedBox(height: 16),
                    _buildTextFormField(controller: _processorController, label: 'Processor', placeholder: 'Intel i7, Ryzen 7'),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(child: _buildTextFormField(controller: _ramSizeController, label: 'RAM Size', placeholder: '16', keyboardType: TextInputType.number)),
                        const SizedBox(width: 8),
                        SizedBox(width: 80, child: _buildDropdown<String>(label: 'Unit', value: _ramUnit, items: ['GB', 'TB'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(), onChanged: (val) => setState(() => _ramUnit = val!))),
                        const SizedBox(width: 8),
                        Expanded(child: _buildDropdown<String>(label: 'RAM Type', value: _selectedRamType, items: _ramTypes.map((t) => DropdownMenuItem(value: t['Name'].toString(), child: Text(t['Name']))).toList(), onChanged: (val) => setState(() => _selectedRamType = val))),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(child: _buildTextFormField(controller: _storageSizeController, label: 'Storage Size', placeholder: '512', keyboardType: TextInputType.number)),
                        const SizedBox(width: 8),
                        SizedBox(width: 80, child: _buildDropdown<String>(label: 'Unit', value: _storageUnit, items: ['GB', 'TB'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(), onChanged: (val) => setState(() => _storageUnit = val!))),
                        const SizedBox(width: 8),
                        Expanded(child: _buildDropdown<String>(label: 'Storage Type', value: _selectedStorageType, items: _storageTypes.map((t) => DropdownMenuItem(value: t['Name'].toString(), child: Text(t['Name']))).toList(), onChanged: (val) => setState(() => _selectedStorageType = val))),
                      ],
                    ),
                  ] else ...[
                    _buildTextFormField(controller: _generalSpecController, label: 'Detail Spesifikasi', placeholder: 'Masukkan detail spek di sini...', maxLines: 4),
                  ]
                ]),
              ],
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 4,
                    shadowColor: AppTheme.primary.withOpacity(0.4),
                  ),
                  child: _isSubmitting 
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                    : const Text('SIMPAN ASET', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1)),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 10),
      child: Text(title.toUpperCase(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey, letterSpacing: 1)),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildTextFormField({
    required TextEditingController controller,
    required String label,
    String? placeholder,
    bool required = false,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
          decoration: InputDecoration(
            hintText: placeholder,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
          ),
          validator: required ? (val) => val == null || val.isEmpty ? '$label wajib diisi' : null : null,
        ),
      ],
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required void Function(T?) onChanged,
    bool required = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        DropdownButtonFormField<T>(
          value: value,
          isExpanded: true,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: AppTheme.textMain),
          decoration: InputDecoration(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
          ),
          items: items,
          onChanged: onChanged,
          validator: required ? (val) => val == null ? '$label wajib dipilih' : null : null,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.primary),
          borderRadius: BorderRadius.circular(16),
        ),
      ],
    );
  }

  Widget _buildDatePicker({
    required String label,
    required DateTime value,
    required void Function(DateTime) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: value,
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
              builder: (context, child) {
                return Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: const ColorScheme.light(
                      primary: AppTheme.primary,
                      onPrimary: Colors.white,
                      onSurface: Colors.black,
                    ),
                  ),
                  child: child!,
                );
              },
            );
            if (picked != null) onChanged(picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "${value.day}/${value.month}/${value.year}",
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                ),
                const Icon(Icons.calendar_today_rounded, size: 18, color: AppTheme.primary),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
