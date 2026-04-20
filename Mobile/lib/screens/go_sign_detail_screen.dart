import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class GoSignDetailScreen extends StatefulWidget {
  final Map<String, dynamic> task;
  const GoSignDetailScreen({super.key, required this.task});

  @override
  State<GoSignDetailScreen> createState() => _GoSignDetailScreenState();
}

class _GoSignDetailScreenState extends State<GoSignDetailScreen> {
  late Map<String, dynamic> _details;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _parseDetails();
  }

  void _parseDetails() {
    try {
      final String? dataJson = widget.task['data_json'];
      if (dataJson != null && dataJson.isNotEmpty) {
        _details = json.decode(dataJson);
      } else {
        _details = {};
      }
    } catch (e) {
      _details = {};
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final signers = task['signers'] as List<dynamic>? ?? [];
    final status = task['status'] ?? 'Pending';
    final isSigned = signers.any((s) => 
      s['user_id'].toString() == task['current_user_id'].toString() && s['signed'] == true
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Detail GoSign', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeader(task),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildParticipantSection(),
                  const SizedBox(height: 16),
                  _buildSignersStatus(signers, task['rejector_id']),
                  const SizedBox(height: 16),
                  _buildDocumentDetails(task),
                  if (task['rejection_reason'] != null && task['rejection_reason'].toString().isNotEmpty)
                    _buildRejectionReason(task['rejection_reason'].toString()),
                  const SizedBox(height: 24),
                  if (status == 'Pending' && !isSigned)
                    _buildActionButtons(task['id'].toString()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(Map<String, dynamic> task) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
        boxShadow: [
          BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          FadeInDown(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.draw_outlined, color: AppTheme.primary, size: 32),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            task['form_name'] ?? task['file_name'] ?? 'Dokumen GoSign',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Diajukan oleh ${task['creator_name'] ?? '-'}',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          if (task['created_at'] != null) ...[
            const SizedBox(height: 8),
            Text(
              DateFormat('dd MMMM yyyy HH:mm').format(DateTime.parse(task['created_at'])),
              style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildParticipantSection() {
    final p1 = _details['P1'] ?? _details['preparer'] ?? _details['p1'] ?? _details['P1User'];
    final p2 = _details['P2'] ?? _details['approver'] ?? _details['p2'] ?? _details['P2User'];
    
    if (p1 == null && p2 == null) return const SizedBox.shrink();

    return Row(
      children: [
        if (p1 != null)
          Expanded(
            child: _buildParticipantCard(
              'Pihak Pertama',
              p1['name']?.toString() ?? p1['Name']?.toString() ?? '-',
              p1['position']?.toString() ?? p1['Position']?.toString() ?? '-',
              Colors.blue,
            ),
          ),
        if (p1 != null && p2 != null) const SizedBox(width: 12),
        if (p2 != null)
          Expanded(
            child: _buildParticipantCard(
              'Pihak Kedua',
              p2['name']?.toString() ?? p2['Name']?.toString() ?? '-',
              p2['position']?.toString() ?? p2['Position']?.toString() ?? '-',
              Colors.purple,
            ),
          ),
      ],
    );
  }

  Widget _buildParticipantCard(String label, String name, String position, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 4),
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(position, style: TextStyle(fontSize: 10, color: Colors.grey.shade600), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  Widget _buildSignersStatus(List<dynamic> signers, dynamic rejectorId) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.checklist, size: 18, color: AppTheme.primary),
              const SizedBox(width: 8),
              const Text('Status Persetujuan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const Spacer(),
              Text('${signers.where((s) => s['signed'] == true).length}/${signers.length}', 
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary)),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 8),
          ...signers.map((signer) {
            final isSigned = signer['signed'] == true;
            final isRejector = rejectorId != null && signer['user_id'].toString() == rejectorId.toString();
            
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Icon(
                    isSigned ? Icons.check_circle : (isRejector ? Icons.cancel : Icons.radio_button_unchecked),
                    size: 18,
                    color: isSigned ? Colors.green : (isRejector ? Colors.red : Colors.grey.shade400),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(signer['user_name'] ?? '-', 
                          style: TextStyle(
                            fontWeight: FontWeight.w600, 
                            fontSize: 13,
                            color: isSigned ? Colors.green.shade700 : (isRejector ? Colors.red.shade700 : AppTheme.textMain)
                          )
                        ),
                        Text(isSigned ? 'Sudah tanda tangan' : (isRejector ? 'Menolak permohonan' : 'Menunggu...'), 
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildDocumentDetails(Map<String, dynamic> task) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.info_outline, size: 18, color: Colors.blue),
              const SizedBox(width: 8),
              const Text('Detail Dokumen', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow('Jenis Dokumen', task['task_type'] ?? 'GoForm'),
          _buildInfoRow('Seksi / Unit', task['section'] ?? '-'),
          if (_details['Period'] != null) _buildInfoRow('Periode', 'Tahun ${_details['Period']}'),
          if (_details['Items'] != null && (_details['Items'] as List).isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Daftar Aset:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            ...(_details['Items'] as List).map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  const Icon(Icons.laptop, size: 14, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('${item['AssetName']} (${item['SerialNumber'] ?? '-'})', 
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  ),
                ],
              )),
            ),
          ],
          if (_details['Notes'] != null && _details['Notes'].toString().isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Catatan:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(_details['Notes'].toString(), style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildRejectionReason(String reason) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.red.shade700, size: 18),
              const SizedBox(width: 8),
              Text('Alasan Penolakan'.toUpperCase(), 
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.red.shade800)),
            ],
          ),
          const SizedBox(height: 8),
          Text(reason, style: TextStyle(fontSize: 13, color: Colors.red.shade900, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildActionButtons(String taskId) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () => _showRejectDialog(context, taskId),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: const BorderSide(color: Colors.red),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text('Tolak Dokumen', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            onPressed: () => _handleSign(context, taskId),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
            child: const Text('Tanda Tangani', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  Future<void> _handleSign(BuildContext context, String taskId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Konfirmasi Tanda Tangan'),
        content: const Text('Apakah Anda yakin ingin menandatangani dokumen ini?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Ya, TTD')),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final res = await ApiService.signTask(taskId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Berhasil ditanda tangani')));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _showRejectDialog(BuildContext context, String taskId) async {
    final TextEditingController reasonController = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Konfirmasi Penolakan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Berikan alasan penolakan untuk dokumen ini:'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Alasan Penolakan',
                border: OutlineInputBorder(),
                hintText: 'Contoh: Data belum sesuai...',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Tolak'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    if (reasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Alasan penolakan wajib diisi')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final res = await ApiService.rejectTask(taskId, reasonController.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Permohonan ditolak')));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
