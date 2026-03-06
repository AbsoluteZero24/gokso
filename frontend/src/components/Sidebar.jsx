import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  Laptop,
  FileText,
  FolderRoot,
  ShieldCheck,
  Settings,
  ChevronRight,
  LayoutDashboard,
  Archive,
  Wrench,
  ClipboardList,
  Users,
  UserCog,
  Database,
  Building2,
  Briefcase,
  ShieldAlert,
  HardDrive,
  Trash2,
  LayoutGrid
} from 'lucide-react';

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (item) => {
    if (collapsed) return;
    setOpenMenus(prev => ({
      ...prev,
      [item.label]: !(prev[item.label] ?? isActive(item))
    }));
  };

  React.useEffect(() => {
    // Close menus that are not parent of current active page when location changes
    const newOpenMenus = {};
    menuItems.forEach(item => {
      if (isActive(item)) {
        newOpenMenus[item.label] = true;
      }
    });
    setOpenMenus(newOpenMenus);
  }, [location.pathname, collapsed]);


  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    {
      icon: Laptop,
      label: 'GoAsset',
      path: '/asset-management',
      children: [
        {
          icon: Archive,
          label: 'Inventori',
          children: [
            { icon: LayoutGrid, label: 'Aset', path: '/inventori/aset-laptop' },
            { icon: Wrench, label: 'Service', path: '/inventori/service' },
            { icon: Building2, label: 'Gudang', path: '/inventori/gudang' }
          ]
        },
        { icon: UserCog, label: 'Asset Management', path: '/asset-management/laptop' }
      ]
    },
    { icon: FileText, label: 'GoForm', path: '/goform' },
    {
      icon: FolderRoot,
      label: 'GoDMS',
      path: '/godms',
      children: [
        { icon: HardDrive, label: 'eDoc', path: '/godms/edoc' },
        { icon: Trash2, label: 'Trash', path: '/godms/trash' }
      ]
    },
    {
      icon: ShieldCheck,
      label: 'Administration',
      path: '/administration',
      children: [
        { icon: Users, label: 'Employee List', path: '/administration/employee' }
      ]
    },
    {
      icon: Settings,
      label: 'Setting',
      path: '/setting',
      children: [
        {
          icon: Database,
          label: 'Master Collection',
          path: '/setting/master-data',
          children: [
            { icon: LayoutGrid, label: 'Master Kategori', path: '/inventori/master-data/asset-category' },
            { icon: Building2, label: 'Master Cabang', path: '/administration/master-data/branch' },
            { icon: Database, label: 'Master Bagian', path: '/administration/master-data/department' },
            { icon: Briefcase, label: 'Master Jabatan', path: '/administration/master-data/position' }
          ]
        },
        { icon: UserCog, label: 'Users', path: '/setting/user' },
        { icon: ShieldAlert, label: 'Roles', path: '/setting/role' }
      ]
    },
  ];

  const isActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.children) {
      return item.children.some(child => isActive(child));
    }
    return item.path !== '/' && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="logo-section" style={{ padding: collapsed ? '2rem 0.75rem' : '2rem 1.5rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '0.75rem' }}>
          <div className="logo-icon" style={{
            background: 'white',
            borderRadius: '50%',
            overflow: 'hidden',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.2)'
          }}>
            <img src="/logo-gokso.png" alt="GK" style={{
              width: '140%',
              height: '140%',
              objectFit: 'cover',
              transform: 'scale(1.1)'
            }} />
          </div>
          {!collapsed && <span style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>GoKSO</span>}
        </Link>
      </div>

      <div className="nav-links" style={{ padding: collapsed ? '1.5rem 0.5rem' : '1.5rem 0.75rem' }}>
        {menuItems.map((item, index) => {
          const renderMenuItem = (item, isSub = false) => {
            const active = isActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = !collapsed && (openMenus[item.label] ?? active);

            return (
              <div key={item.label} className={isSub ? "sub-menu-item-wrapper" : "menu-group"}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item)}
                      className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                      title={collapsed ? item.label : ''}
                      style={{ paddingLeft: isSub ? '1rem' : undefined }}
                    >
                      <item.icon size={isSub ? 16 : 20} />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && (
                        <ChevronRight
                          className="chevron"
                          size={16}
                          style={{
                            transform: isOpen ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.3s',
                            marginLeft: 'auto'
                          }}
                        />
                      )}
                    </button>
                    {isOpen && !collapsed && (
                      <div className="sub-menu" style={{ paddingLeft: isSub ? '1rem' : '1.5rem' }}>
                        {item.children.map((child) => renderMenuItem(child, true))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`nav-item ${active ? 'active' : ''}`}
                    title={collapsed ? item.label : ''}
                    style={{ paddingLeft: isSub ? '1rem' : undefined }}
                  >
                    <item.icon size={isSub ? 16 : 20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )}
              </div>
            );
          };

          return renderMenuItem(item);
        })}
      </div>
    </div>
  );
};

export default Sidebar;
