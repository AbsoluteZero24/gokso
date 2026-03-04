import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Folder,
    File,
    Plus,
    MoreVertical,
    Download,
    Trash2,
    ChevronRight,
    Home,
    Search,
    Loader2,
    HardDrive,
    Grid,
    List as ListIcon,
    Pencil,
    FileText
} from 'lucide-react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';

const GDMS = () => {
    const { folderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const section = searchParams.get('section') || 'Sistem Informasi';

    const [data, setData] = useState({ folders: [], files: [], breadcrumbs: [], totalStorage: '0 KB' });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');

    const sections = [
        'Operasi Luar Negeri',
        'Keuangan & Administrasi',
        'Sistem, Kepatuhan & Pelayanan Pelanggan',
        'Operasi Dalam Negeri',
        'Pengembangan Usaha, Hubungan Pemangku Stakeholder & Penjualan',
        'Sistem Informasi'
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const url = folderId ? `/api/godms/doc/${folderId}` : `/api/godms/doc?section=${section}`;
            const response = await axios.get(url);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching DMS data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [folderId, section]);

    const filteredFolders = data.folders.filter(f => f.Name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredFiles = data.files.filter(f => f.Name.toLowerCase().includes(searchTerm.toLowerCase()));

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>Digital Management System</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)' }}>
                        <HardDrive size={16} />
                        <span>Storage Used: {data.totalStorage}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={section}
                            onChange={(e) => navigate(`/godms/doc?section=${e.target.value}`)}
                            style={{
                                padding: '0.625rem 2.5rem 0.625rem 1.25rem',
                                borderRadius: '50px',
                                border: '1px solid var(--border)',
                                background: 'white',
                                fontWeight: 600,
                                appearance: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronRight size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                    </div>

                    <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 600 }}>
                        <Plus size={18} />
                        New
                    </button>
                </div>
            </div>

            {/* Breadcrumbs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
                <Link to={`/godms/doc?section=${section}`} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                    <Home size={18} />
                </Link>
                <ChevronRight size={16} color="var(--border)" />
                {data.breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.ID}>
                        <Link to={`/godms/doc/${crumb.ID}`} style={{
                            color: idx === data.breadcrumbs.length - 1 ? 'var(--text-main)' : 'var(--primary)',
                            fontWeight: idx === data.breadcrumbs.length - 1 ? 700 : 500,
                            whiteSpace: 'nowrap'
                        }}>
                            {crumb.Name}
                        </Link>
                        {idx < data.breadcrumbs.length - 1 && <ChevronRight size={16} color="var(--border)" />}
                    </React.Fragment>
                ))}
            </div>

            {/* Search and View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '50px', padding: '0.25rem 1rem', minWidth: '350px' }}>
                    <Search size={18} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
                    <input
                        type="text"
                        placeholder="Cari folder atau file..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', padding: '0.5rem 0', fontWeight: 500 }}
                    />
                </div>

                <div style={{ display: 'flex', background: '#f1f5f9', p: '2px', borderRadius: '10px' }}>
                    <button onClick={() => setViewMode('grid')} style={{ p: '0.5rem', borderRadius: '8px', background: viewMode === 'grid' ? 'white' : 'transparent', border: 'none', shadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                        <Grid size={20} color={viewMode === 'grid' ? 'var(--primary)' : 'var(--text-light)'} />
                    </button>
                    <button onClick={() => setViewMode('list')} style={{ p: '0.5rem', borderRadius: '8px', background: viewMode === 'list' ? 'white' : 'transparent', border: 'none', shadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                        <ListIcon size={20} color={viewMode === 'list' ? 'var(--primary)' : 'var(--text-light)'} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                </div>
            ) : (
                <>
                    {/* Folders Section */}
                    {filteredFolders.length > 0 && (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Folders</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                                {filteredFolders.map(folder => (
                                    <div key={folder.ID} className="chart-container" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border)' }} onClick={() => navigate(`/godms/doc/${folder.ID}`)}>
                                        <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '10px' }}>
                                            <Folder size={24} color="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                                        </div>
                                        <span style={{ fontWeight: 600, flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.Name}</span>
                                        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-light)' }}>
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files</h3>
                        {viewMode === 'grid' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {filteredFiles.map(file => (
                                    <div key={file.ID} className="chart-container" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0', background: '#f8fafc', borderRadius: '8px' }}>
                                            <FileText size={48} color="#ef4444" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.Name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{formatSize(file.Size)} • {new Date(file.CreatedAt).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button style={{ flexGrow: 1, py: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <Download size={16} />
                                            </button>
                                            <button style={{ py: '0.4rem', px: '0.6rem', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredFiles.length === 0 && filteredFolders.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', color: 'var(--text-light)' }}>
                                        <File size={64} color="var(--border)" style={{ margin: '0 auto 1.5rem' }} />
                                        <p>Tidak ada file atau folder di sini.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem 1.5rem' }}>Name</th>
                                            <th style={{ padding: '1rem 1.5rem' }}>Size</th>
                                            <th style={{ padding: '1rem 1.5rem' }}>Modified</th>
                                            <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredFiles.map(file => (
                                            <tr key={file.ID} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <File size={20} color="#ef4444" />
                                                        <span style={{ fontWeight: 500 }}>{file.Name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-light)' }}>{formatSize(file.Size)}</td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-light)' }}>{new Date(file.CreatedAt).toLocaleDateString()}</td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button style={{ p: '0.5rem', borderRadius: '6px', background: '#eff6ff', color: 'var(--primary)', border: 'none' }}><Download size={18} /></button>
                                                        <button style={{ p: '0.5rem', borderRadius: '6px', background: '#fff7ed', color: '#f97316', border: 'none' }}><Pencil size={18} /></button>
                                                        <button style={{ p: '0.5rem', borderRadius: '6px', background: '#fef2f2', color: '#ef4444', border: 'none' }}><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default GDMS;
