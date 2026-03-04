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
  Tool,
  ClipboardList,
  Users,
  UserCog,
  Database,
  ShieldAlert,
  HardDrive
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    {
      icon: Laptop,
      label: 'GoAsset',
      path: '/asset-management',
      children: [
        { icon: Archive, label: 'Inventori (Aset)', path: '/inventori/aset-laptop' },
        { icon: UserCog, label: 'Asset Management', path: '/asset-management/laptop' },
        { icon: ClipboardList, label: 'Maintenance', path: '/maintenance/laptop' }
      ]
    },
    { icon: FileText, label: 'GoForm', path: '/goform' },
    { icon: FolderRoot, label: 'GoDMS', path: '/godms/doc' },
    {
      icon: ShieldCheck,
      label: 'Administration',
      path: '/administration',
      children: [
        { icon: Users, label: 'Employee List', path: '/administration/employee' },
        { icon: Building2, label: 'Master Cabang', path: '/administration/master-data/branch' },
        { icon: Database, label: 'Master Bagian', path: '/administration/master-data/department' },
        { icon: Briefcase, label: 'Master Jabatan', path: '/administration/master-data/position' }
      ]
    },
    {
      icon: Settings,
      label: 'Setting',
      path: '/setting',
      children: [
        { icon: UserCog, label: 'Users', path: '/setting/user' },
        { icon: ShieldAlert, label: 'Roles', path: '/setting/role' }
      ]
    },
  ];

  const isActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.children) {
      return item.children.some(child => location.pathname === child.path);
    }
    return false;
  };

  return (
    <div className="sidebar">
      <div className="logo-section">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="logo-icon">
            <span style={{ fontWeight: 800 }}>GK</span>
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>GoKSO</span>
        </Link>
      </div>

      <div className="nav-links">
        {menuItems.map((item, index) => {
          const active = isActive(item);
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus[item.label] || active;

          return (
            <div key={index} className="menu-group">
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`nav-item ${active ? 'active' : ''}`}
                    style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer' }}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    <ChevronRight
                      className="chevron"
                      size={16}
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }}
                    />
                  </button>
                  {isOpen && (
                    <div className="sub-menu" style={{ paddingLeft: '1.5rem' }}>
                      {item.children.map((child, idx) => (
                        <Link
                          key={idx}
                          to={child.path}
                          className={`nav-item ${location.pathname === child.path ? 'active' : ''}`}
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        >
                          <child.icon size={16} />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
