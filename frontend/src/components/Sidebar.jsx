import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  LayoutGrid,
  Check
} from 'lucide-react';

const Sidebar = ({ collapsed, onExpand }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openMenus, setOpenMenus] = useState({});

  const userPermissions = user?.permissions ? user.permissions.split(',') : [];

  const hasPermission = (item) => {
    if (user?.role === 'Super Admin') return true;
    if (!item.permission) return true;
    return userPermissions.includes(item.permission);
  };

  const isVisible = (item) => {
    // Check if the current item itself is authorized
    if (!hasPermission(item)) return false;

    // If it has children, it's only visible if at least one child is also visible
    if (item.children && item.children.length > 0) {
      return item.children.some(child => isVisible(child));
    }

    return true;
  };

  const toggleMenu = (item) => {
    if (collapsed) {
      onExpand();
      if (item.path) {
        navigate(item.path);
      }
      return;
    }
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
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', permission: 'view_dashboard' },
    {
      icon: Laptop,
      label: 'GoAsset',
      path: '/inventori/aset-laptop',
      permission: 'view_goasset',
      children: [
        {
          icon: Archive,
          label: 'Inventori',
          permission: 'view_inventory',
          children: [
            { icon: LayoutGrid, label: 'Aset', path: '/inventori/aset-laptop', permission: 'view_asset_list' },
            { icon: Wrench, label: 'Service', path: '/inventori/service', permission: 'view_asset_service' },
            { icon: Building2, label: 'Gudang', path: '/inventori/gudang', permission: 'view_asset_warehouse' },
            { icon: ShieldAlert, label: 'Inactive', path: '/inventori/inactive', permission: 'view_asset_inactive' }
          ]
        },
        { icon: UserCog, label: 'Asset Management', path: '/asset-management/laptop', permission: 'view_asset_management' }
      ]
    },
    { icon: FileText, label: 'GoForm', path: '/goform', permission: 'view_goform' },
    { icon: Check, label: 'GoSign', path: '/gosign', permission: 'view_gosign' },
    {
      icon: FolderRoot,
      label: 'GoDMS',
      path: '/godms/edoc',
      permission: 'view_godms',
      children: [
        { icon: HardDrive, label: 'eDoc', path: '/godms/edoc', permission: 'view_edoc' },
        { icon: Trash2, label: 'Trash', path: '/godms/trash', permission: 'view_trash' }
      ]
    },
    {
      icon: ShieldCheck,
      label: 'Administration',
      path: '/administration/employee',
      permission: 'view_administration',
      children: [
        { icon: Users, label: 'User Management', path: '/administration/employee', permission: 'view_employee_list' },
        { icon: UserCog, label: 'Lokal User', path: '/administration/local-user', permission: 'view_local_user' }
      ]
    },
    {
      icon: Settings,
      label: 'Setting',
      path: '/setting/role',
      permission: 'view_setting',
      children: [
        {
          icon: Database,
          label: 'Master Collection',
          path: '/inventori/master-data/asset-category',
          permission: 'view_master_collection',
          children: [
            { icon: LayoutGrid, label: 'Master Kategori', path: '/inventori/master-data/asset-category', permission: 'view_master_category' },
            { icon: Building2, label: 'Master Cabang', path: '/administration/master-data/branch', permission: 'view_master_branch' },
            { icon: Database, label: 'Master Bagian', path: '/administration/master-data/department', permission: 'view_master_department' },
            { icon: Briefcase, label: 'Master Jabatan', path: '/administration/master-data/position', permission: 'view_master_position' }
          ]
        },
        { icon: ShieldAlert, label: 'Roles', path: '/setting/role', permission: 'view_roles' }
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
        {menuItems.filter(item => isVisible(item)).map((item, index) => {
          const renderMenuItem = (item, isSub = false) => {
            if (!isVisible(item)) return null;
            const active = isActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = !collapsed && (openMenus[item.label] ?? active);

            return (
              <div key={item.label} className={isSub ? "sub-menu-item-wrapper" : "menu-group"}>
                {hasChildren ? (
                  <>
                    <button
                      type="button"
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
                    onClick={() => collapsed && onExpand()}
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
