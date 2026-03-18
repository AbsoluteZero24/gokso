import React from 'react';
import { Loader2, Edit, Trash2 } from 'lucide-react';

/**
 * Komponen Tabel Aset untuk menampilkan daftar inventori.
 * Mendukung pencarian, edit, dan hapus.
 */
const AssetTable = ({ loading, assets, onEdit, onDelete }) => {
    return (
        <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Aset Info</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Kategori</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Brand</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Type/Model</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Specification</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Location</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Tgl Pembelian</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="9" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : assets.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data aset ditemukan.
                                </td>
                            </tr>
                        ) : assets.map((asset) => {
                            // Ekstraksi data dengan fallback ke casing lama (untuk backward compatibility sementara)
                            const assetId = asset.id || asset.ID;
                            const invNum = asset.inventory_number || asset.InventoryNumber || '-';
                            const assetName = asset.asset_name || asset.AssetName || '-';
                            const category = asset.category || asset.Category || '-';
                            const brand = asset.brand || asset.Brand || '-';
                            const model = asset.type_model || asset.TypeModel || '-';
                            const specs = asset.specification || asset.Specification || '-';
                            const loc = asset.location || asset.Location || '-';
                            const pDate = asset.purchase_date || asset.PurchaseDate;
                            const statusLabel = asset.status || asset.Status || 'Ready';

                            return (
                                <tr key={assetId} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem' }}>{invNum}</div>
                                        <div style={{ fontSize: '0.813rem', color: '#64748b' }}>{assetName}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>{category}</td>
                                    <td style={{ padding: '1.25rem 1rem' }}>{brand}</td>
                                    <td style={{ padding: '1.25rem 1rem' }}>{model}</td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <div style={{ fontSize: '0.813rem', color: '#64748b', maxWidth: '200px' }} title={specs}>
                                            {specs}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>{loc}</td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        {pDate && pDate !== '0001-01-01T00:00:00Z' 
                                            ? new Date(pDate).toLocaleDateString('id-ID') 
                                            : '-'}
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <span style={{ 
                                            padding: '0.375rem 0.75rem', 
                                            borderRadius: '6px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 600, 
                                            background: statusLabel === 'Ready' ? '#f0fdf4' : (statusLabel === 'Rusak' ? '#fef2f2' : '#fefce8'), 
                                            color: statusLabel === 'Ready' ? '#166534' : (statusLabel === 'Rusak' ? '#991b1b' : '#854d0e') 
                                        }}>
                                            {statusLabel}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <button 
                                            onClick={() => onEdit(asset)} 
                                            style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer', marginRight: '0.5rem' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDelete(assetId)} 
                                            style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AssetTable;
