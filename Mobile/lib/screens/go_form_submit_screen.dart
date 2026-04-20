import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../providers/data_providers.dart';
import 'package:signature/signature.dart';
import 'dart:typed_data';
import 'dart:convert';

class GoFormSubmitScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> form;

  const GoFormSubmitScreen({super.key, required this.form});

  @override
  ConsumerState<GoFormSubmitScreen> createState() => _GoFormSubmitScreenState();
}

class _GoFormSubmitScreenState extends ConsumerState<GoFormSubmitScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = true;
  bool _isSubmitting = false;

  List<dynamic> _employees = [];
  List<dynamic> _assets = [];
  
  String _category = 'Pengambilan';
  DateTime _handoverDate = DateTime.now();
  String? _p1UserId;
  String? _p2UserId;
  final List<String> _selectedAssetIds = [];
  String _notes = '';
  String _p1SignType = 'signature';
  String _p2SignType = 'signature';

  // Signature related
  String _signatureMethod = 'direct'; // 'direct' or 'request'
  final SignatureController _sigP1Controller = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );
  final SignatureController _sigP2Controller = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  // Exchange related
  String? _oldAssetId;
  String? _newAssetId;
  String _assetCondition = 'Ready';

  @override
  void initState() {
    super.initState();
    _loadInitData();
  }

  @override
  void dispose() {
    _sigP1Controller.dispose();
    _sigP2Controller.dispose();
    super.dispose();
  }

  Future<void> _loadInitData() async {
    try {
      final data = await ApiService.getFormInitData(widget.form['form_id'] ?? 'form-bast-laptop');
      setState(() {
        _employees = data['employees'] ?? [];
        _assets = data['assets'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e')),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_category != 'Tukar' && _selectedAssetIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih minimal satu aset')),
      );
      return;
    }

    if (_category == 'Tukar' && (_oldAssetId == null || _newAssetId == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih aset lama dan aset baru')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final Map<String, String> body = {
        'document_category': _category,
        'handover_date': DateFormat('yyyy-MM-dd').format(_handoverDate),
        'p1_user_id': _p1UserId!,
        'p2_user_id': _p2UserId!,
        'notes': _notes,
        'submit_type': _signatureMethod == 'request' ? 'request' : '',
        'p1_sign_type': _p1SignType,
        'p2_sign_type': _p2SignType,
      };

      if (_category == 'Tukar') {
        body['old_asset_id'] = _oldAssetId!;
        body['new_asset_id'] = _newAssetId!;
        body['asset_condition'] = _assetCondition;
      }

      if (_signatureMethod == 'direct') {
        final Uint8List? sigP1 = await _sigP1Controller.toPngBytes();
        final Uint8List? sigP2 = await _sigP2Controller.toPngBytes();
        
        if (sigP1 != null) {
          body['sig_p1_data'] = 'data:image/png;base64,${base64Encode(sigP1)}';
        }
        if (sigP2 != null) {
          body['sig_p2_data'] = 'data:image/png;base64,${base64Encode(sigP2)}';
        }
      }

      await ApiService.submitForm(
        widget.form['form_id'] ?? 'form-bast-laptop',
        body,
        assetIds: _category == 'Tukar' ? [] : _selectedAssetIds,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_signatureMethod == 'request' ? 'Permohonan tanda tangan berhasil diajukan' : 'Formulir berhasil disimpan')),
        );
        Navigator.pop(context);
        ref.refresh(formsProvider);
        ref.refresh(signTasksProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error submitting form: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.form['name'] ?? 'Submit Form')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(widget.form['name'] ?? 'Submit Form', style: const TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle('Informasi Dokumen'),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildModernDropdown<String>(
                        label: 'Kategori Dokumen',
                        value: _category,
                        items: ['Pengambilan', 'Pengembalian', 'Tukar'].map((c) {
                          return DropdownMenuItem(value: c, child: Text(c));
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _category = val!;
                            _selectedAssetIds.clear();
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _handoverDate,
                            firstDate: DateTime(2000),
                            lastDate: DateTime(2100),
                          );
                          if (picked != null) setState(() => _handoverDate = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(labelText: 'Tanggal Serah Terima'),
                          child: Text(DateFormat('dd MMMM yyyy').format(_handoverDate)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _buildSectionTitle('Pemberi & Penerima'),
               Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildModernDropdown<String>(
                        label: 'Pihak Pertama (Pemberi)',
                        value: _p1UserId,
                        items: _employees.map((e) {
                          return DropdownMenuItem(value: e['id']?.toString(), child: Text(e['name']?.toString() ?? 'Unknown'));
                        }).toList(),
                        onChanged: (val) => setState(() => _p1UserId = val),
                        validator: (val) => val == null ? 'Pilih pemberi' : null,
                      ),
                      const SizedBox(height: 8),
                      _buildSignTypeSwitch(_p1SignType, (val) => setState(() => _p1SignType = val)),
                      const SizedBox(height: 16),
                      _buildModernDropdown<String>(
                        label: 'Pihak Kedua (Penerima)',
                        value: _p2UserId,
                        items: _employees.map((e) {
                          return DropdownMenuItem(value: e['id']?.toString(), child: Text(e['name']?.toString() ?? 'Unknown'));
                        }).toList(),
                        onChanged: (val) => setState(() => _p2UserId = val),
                        validator: (val) => val == null ? 'Pilih penerima' : null,
                      ),
                      const SizedBox(height: 8),
                      _buildSignTypeSwitch(_p2SignType, (val) => setState(() => _p2SignType = val)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              if (_category == 'Tukar') ...[
                _buildSectionTitle('Detail Penukaran Aset'),
                _buildExchangeFields(),
              ] else ...[
                _buildSectionTitle('Detail Aset'),
                _buildAssetSelection(),
              ],
              const SizedBox(height: 24),
              _buildSectionTitle('Catatan'),
              TextFormField(
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Tambahkan catatan jika diperlukan...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onChanged: (val) => _notes = val,
              ),
              const SizedBox(height: 24),
              _buildSectionTitle('Metode Tanda Tangan'),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                color: const Color(0xFFF0F9FF),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildModernDropdown<String>(
                        label: 'Tentukan Metode',
                        value: _signatureMethod,
                        items: const [
                          DropdownMenuItem(value: 'direct', child: Text('Tanda Tangan Digital (Langsung)')),
                          DropdownMenuItem(value: 'request', child: Text('Ajukan Tanda Tangan (GoSign)')),
                        ],
                        onChanged: (val) => setState(() => _signatureMethod = val!),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _signatureMethod == 'direct' 
                          ? '* Tanda tangan akan dilakukan langsung di bawah ini.' 
                          : '* Notifikasi akan dikirimkan ke pihak terkait untuk tanda tangan.',
                        style: const TextStyle(fontSize: 11, color: Colors.blue, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (_signatureMethod == 'direct') ...[
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('TTD ${_p1SignType.toUpperCase()} PIHAK I', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                          const SizedBox(height: 8),
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade300),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Signature(
                                controller: _sigP1Controller,
                                height: 120,
                                backgroundColor: Colors.white,
                              ),
                            ),
                          ),
                          TextButton(onPressed: () => _sigP1Controller.clear(), child: const Text('Hapus TTD', style: TextStyle(color: Colors.red, fontSize: 11))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('TTD ${_p2SignType.toUpperCase()} PIHAK II', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                          const SizedBox(height: 8),
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade300),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Signature(
                                controller: _sigP2Controller,
                                height: 120,
                                backgroundColor: Colors.white,
                              ),
                            ),
                          ),
                          TextButton(onPressed: () => _sigP2Controller.clear(), child: const Text('Hapus TTD', style: TextStyle(color: Colors.red, fontSize: 11))),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _isSubmitting ? null : () => _submit(),
                  icon: _isSubmitting 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                    : Icon(_signatureMethod == 'request' ? Icons.assignment_turned_in : Icons.save),
                  label: Text(
                    _signatureMethod == 'request' ? 'AJUKAN TANDA TANGAN (GOSIGN)' : 'SUBMIT & SIMPAN KE EDOC', 
                    style: const TextStyle(fontWeight: FontWeight.bold)
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
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
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey),
      ),
    );
  }

  Widget _buildModernDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required void Function(T?) onChanged,
    String? Function(T?)? validator,
  }) {
    return DropdownButtonFormField<T>(
      value: value,
      isExpanded: true,
      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.primary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.blueGrey, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary, width: 2)),
        filled: true,
        fillColor: Colors.white,
      ),
      items: items,
      onChanged: onChanged,
      validator: validator,
      dropdownColor: Colors.white,
      borderRadius: BorderRadius.circular(12),
      style: const TextStyle(color: AppTheme.textMain, fontSize: 15, fontWeight: FontWeight.w500),
    );
  }

  Widget _buildExchangeFields() {
    final oldAssetItems = _assets.where((a) => a['user_id'] != null && a['user_id'] != "").map((a) {
      return DropdownMenuItem(
        value: a['id']?.toString(), 
        child: Text(
          '${a['inventory_number'] ?? 'Unknown'} - ${a['asset_name'] ?? 'Unknown'}',
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13),
        ),
      );
    }).toList();

    final newAssetItems = _assets.where((a) {
      final String status = (a['status'] ?? '').toString().toLowerCase();
      final bool isUnassigned = a['user_id'] == null || a['user_id'] == "";
      return status == 'ready' && isUnassigned;
    }).map((a) {
      return DropdownMenuItem(
        value: a['id']?.toString(), 
        child: Text(
          '${a['inventory_number'] ?? 'Unknown'} - ${a['asset_name'] ?? 'Unknown'}',
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13),
        ),
      );
    }).toList();

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _buildModernDropdown<String>(
                label: 'Aset Lama (Kembali)',
                value: _oldAssetId,
                items: oldAssetItems,
                onChanged: (val) => setState(() => _oldAssetId = val),
              ),
              if (oldAssetItems.isEmpty) 
                const Padding(
                  padding: EdgeInsets.only(top: 4, bottom: 12),
                  child: Text('Tidak ada aset yang sedang dipinjam', style: TextStyle(color: Colors.red, fontSize: 11)),
                ),
              const SizedBox(height: 16),
              _buildModernDropdown<String>(
                label: 'Aset Baru (Ambil)',
                value: _newAssetId,
                items: newAssetItems,
                onChanged: (val) => setState(() => _newAssetId = val),
              ),
              if (newAssetItems.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 4, bottom: 12),
                  child: Text('Tidak ada aset Ready & Belum diassign', style: TextStyle(color: Colors.red, fontSize: 11)),
                ),
              const SizedBox(height: 16),
              _buildModernDropdown<String>(
                label: 'Kondisi Aset Lama',
                value: _assetCondition,
                items: ['Ready', 'Rusak', 'Hilang', 'Obsolete'].map((s) {
                  return DropdownMenuItem(value: s, child: Text(s));
                }).toList(),
                onChanged: (val) => setState(() => _assetCondition = val!),
              ),
            ],
          ),
        ),
    );
  }

  Widget _buildAssetSelection() {
    List<dynamic> filteredAssets = _assets.where((a) {
      final String status = (a['status'] ?? '').toString().toLowerCase();
      final bool isUnassigned = a['user_id'] == null || a['user_id'] == "";
      final bool isAssigned = !isUnassigned;

      if (_category == 'Pengembalian') {
        return isAssigned;
      } else if (_category == 'Pengambilan') {
        return status == 'ready' && isUnassigned;
      }
      return true;
    }).toList();

    if (filteredAssets.isEmpty) {
      return Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey.shade300),
              const SizedBox(height: 12),
              Text(
                _category == 'Pengambilan' 
                  ? 'Tidak ada aset yang tersedia untuk diambil (Ready & Belum diassign)'
                  : 'Tidak ada aset yang sedang dipinjam (Assigned)',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 13, fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: filteredAssets.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final asset = filteredAssets[index];
          final bool isSelected = _selectedAssetIds.contains(asset['id']);
          
          return CheckboxListTile(
            title: Text(asset['inventory_number'] ?? 'Unknown'),
            subtitle: Text('${asset['asset_name'] ?? 'Asset'} ${asset['device_name'] != null ? '(${asset['device_name']})' : ''}'),
            value: isSelected,
            activeColor: AppTheme.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onChanged: (bool? value) {
              setState(() {
                if (value == true) {
                  _selectedAssetIds.add(asset['id']?.toString() ?? '');
                } else {
                  _selectedAssetIds.remove(asset['id']?.toString() ?? '');
                }
              });
            },
          );
        },
      ),
    );
  }

  Widget _buildSignTypeSwitch(String current, Function(String) onChanged) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildSignTypeOption('Signature', 'signature', current == 'signature', onChanged),
          _buildSignTypeOption('Paraf', 'paraf', current == 'paraf', onChanged),
        ],
      ),
    );
  }

  Widget _buildSignTypeOption(String label, String value, bool isActive, Function(String) onChanged) {
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isActive ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))] : [],
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: isActive ? AppTheme.primary : Colors.grey,
          ),
        ),
      ),
    );
  }
}
