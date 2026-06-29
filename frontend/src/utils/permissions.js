export const ROLES = { MASTER: 'master', ADMIN: 'admin', USER: 'user', DEV: 'dev' };

export const isMaster = (user) => user?.is_master || user?.role === ROLES.MASTER;
export const isAdmin = (user) => isMaster(user) || user?.role === ROLES.ADMIN;
export const isDev = (user) => user?.is_dev || user?.role === ROLES.DEV;
export const canManageUsers = (user) => isAdmin(user);

export const hasPermission = (user, permission) => {
    if (!user) return false;
    if (isAdmin(user)) return true;
    if (isDev(user)) return false;
    if (!user.permissoes) return false;
    return user.permissoes.split(',').map(p => p.trim()).filter(Boolean).includes(permission);
};

export const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', path: '/', icon: 'LayoutDashboard', permission: 'dashboard' },
    { key: 'clientes', label: 'Clientes', path: '/clientes', icon: 'Users', permission: 'clientes' },
    { key: 'pecas', label: 'Peças', path: '/pecas', icon: 'Package2', permission: 'pecas' },
    { key: 'servicos', label: 'Serviços', path: '/servicos', icon: 'Wrench', permission: 'servicos' },
    { key: 'os', label: 'OS', path: '/os', icon: 'FileText', permission: 'os' },
    { key: 'mecanico', label: 'Mecânico', path: '/mecanico', icon: 'Wrench', permission: 'mecanico' },
    { key: 'financeiro', label: 'Financeiro', path: '/financeiro', icon: 'DollarSign', permission: 'financeiro' },
    { key: 'caixa', label: 'Caixa', path: '/caixa', icon: 'Banknote', permission: 'caixa' },
    { key: 'analytics', label: 'Analytics', path: '/analytics', icon: 'BarChart3', permission: 'analytics' },
    { key: 'health', label: 'Saúde da Oficina', path: '/saude', icon: 'Activity', permission: 'health' },
    { key: 'fornecedores', label: 'Fornecedores', path: '/fornecedores', icon: 'Truck', permission: 'fornecedores' },
    { key: 'compras', label: 'Compras', path: '/compras', icon: 'ShoppingCart', permission: 'compras' },
    { key: 'garantia', label: 'Garantia', path: '/garantia', icon: 'Activity', permission: 'garantia' },
    { key: 'historico', label: 'Histórico Veículo', path: '/historico-veiculo', icon: 'Activity', permission: 'historico' },
    { key: 'relatorios', label: 'Relatórios', path: '/relatorios', icon: 'BarChart3', permission: 'relatorios' },
];

export const ADMIN_NAV_ITEMS = [
    { key: 'configuracoes', label: 'Configurações', path: '/configuracoes', icon: 'Settings', roles: [ROLES.MASTER, ROLES.ADMIN] },
];