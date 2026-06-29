# WDOcar - Plano Completo do Sistema

## Estado Atual (Backend Funcional)

### Módulos Implementados
| Módulo | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Auth (registro, login, JWT) | auth.py, routers/auth.py | pages/Login, Signup | ✅ |
| Clientes (CRUD) | routers/clients.py | pages/Clientes | ✅ |
| Peças (CRUD + estoque) | routers/parts.py | pages/Pecas | ✅ |
| Serviços (CRUD) | routers/services.py | pages/Servicos | ✅ |
| Ordens de Serviço | routers/orders.py | pages/OS | ✅ |
| Financeiro (transações) | routers/finance.py | pages/Financeiro | ✅ |
| Dashboard (métricas) | routers/dashboard.py | pages/Dashboard | ✅ |
| Painel do Mecânico | routers/mecanico.py | pages/MecanicoPaineis | ✅ |
| Fluxo de Caixa | routers/cash_register.py | - | 🔶 (backend OK, sem frontend) |
| Fornecedores | - | - | ❌ |
| Garantia/Histórico | - | - | ❌ |

### Problemas Conhecidos
- Dashboard retorna 500 (precisa verificar lógica)
- Fluxo de Caixa sem interface frontend
- Sidebar mobile não exibe "Caixa"
- Permissões: role "mecanico" vê financeiro (não deveria)
- JWT não inclui role do usuário corretamente

## Roadmap Completo

### Fase 1: Correções Críticas
1. Corrigir dashboard (métricas e gráficos)
2. Adicionar tela de Fluxo de Caixa no frontend
3. Ajustar sidebar: item "Caixa" + ocultar financeiro do mecânico
4. Garantir JWT inclui role e permissões

### Fase 2: Módulo Fornecedores
5. Model: Supplier, PurchaseOrder, PurchaseItem
6. CRUD Fornecedores (backend + frontend)
7. Compras de peças (vincular fornecedor + peças + valores)
8. Histórico de compras por fornecedor

### Fase 3: Garantia e Histórico do Veículo
9. Aba "Histórico" na tela do veículo (todas OS anteriores)
10. Registro de garantia em peças/serviços
11. Notificação de garantia próxima do vencimento

### Fase 4: Relatórios e Exportações
12. Relatório financeiro (período, categorias)
13. Relatório de OS (por status, período, técnico)
14. Exportar para CSV/PDF/XLS
15. Relatório de estoque (produtos abaixo do mínimo)

### Fase 5: Refinamentos
16. Refatorar routers (separar models, schemas, services)
17. Testes automatizados (pytest backend)
18. Modo escuro
19. Responsividade mobile completa
20. Backup automático do banco

### Fase 6: Extras
21. Notificações (OS atrasadas, estoque baixo)
22. Envio de orçamento por WhatsApp/E-mail
23. Multi-oficina (já parcialmente implementado)
24. Audit log (histórico de ações dos usuários)
