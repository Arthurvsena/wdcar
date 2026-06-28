export const ROLES = { MASTER: 'master', ADMIN: 'admin', USER: 'user', DEV: 'dev' };

export const isMaster = (user) => user?.is_master || user?.role === ROLES.MASTER;
export const isAdmin = (user) => isMaster(user) || user?.role === ROLES.ADMIN;
export const isDev = (user) => user?.is_dev || user?.role === ROLES.DEV;
export const canManageUsers = (user) => isAdmin(user);

export const hasPermission = (user, permission) => {
    if (!user) return false;
    if (isAdmin(user)) return true;
    if (isDev(user)) return false;
    if (!user.permissoes) return true;
    return user.permissoes.split(',').map(p => p.trim()).includes(permission);
};

export const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', path: '/', icon: 'LayoutDashboard', permission: 'dashboard' },
    { key: 'clientes', label: 'Clientes', path: '/clientes', icon: 'Users', permission: 'clientes' },
    { key: 'pecas', label: 'Peças', path: '/pecas', icon: 'Package2', permission: 'pecas' },
    { key: 'servicos', label: 'Serviços', path: '/servicos', icon: 'Wrench', permission: 'servicos' },
    { key: 'os', label: 'OS', path: '/os', icon: 'FileText', permission: 'os' },
    { key: 'financeiro', label: 'Financeiro', path: '/financeiro', icon: 'DollarSign', permission: 'financeiro' },
    { key: 'analytics', label: 'Analytics', path: '/analytics', icon: 'BarChart3', permission: 'analytics' },
];

export const ADMIN_NAV_ITEMS = [
    { key: 'configuracoes', label: 'Configurações', path: '/configuracoes', icon: 'Settings', roles: [ROLES.MASTER, ROLES.ADMIN] },
];