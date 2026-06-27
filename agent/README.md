# Agentes IA — WDOcar

Estrutura de agentes especializados para desenvolvimento do sistema WDOcar (Gestão de Oficina Mecânica).

## Arquitetura

```
Usuário ──► ORQUESTRADOR
               │
               ├─► DESIGN  ──► UI + UX + DS
               ├─► FRONT   ──► Tela + Estado + Teste + PWA
               ├─► BACK    ──► Endpoint + Model + Regra + Segurança
               ├─► DEVOPS  ──► Infra + CI/CD + Monitor + Backup
               ├─► QA      ──► Teste Manual + Teste Auto + Doc + Bug
               └─► ANALYTICS ──► Dados + Dashboard + Marketing + Growth
                       │
                       ▼
               REVISÃO [Auditor + Segurança + Performance]
                       │
                       ▼
               INOVAÇÃO [Tendências + Novas Features]
                       │
                       ▼
               ORQUESTRADOR valida → entrega
```

## Regras de Oro

1. **Usuário fala SÓ com o Orquestrador** — ele é a única interface
2. **Orquestrador quebra a demanda e chama os Líderes necessários**
3. **Cada Líder executa com seus Agentes** — se precisar de outra área, NÃO fala direto, volta pro Orquestrador
4. **Orquestrador chama mais Líderes se necessário** — ele gerencia as dependências
5. **Tudo passa pela Revisão** antes de voltar pro Orquestrador
6. **Orquestrador entrega pro usuário**

## Estrutura de Pastas

```
agent/
├── README.md
├── orquestrador.md
├── design/
│   ├── lider.md
│   ├── ui-agent.md
│   ├── ux-agent.md
│   └── ds-agent.md
├── front/
│   ├── lider.md
│   ├── tela-agent.md
│   ├── estado-agent.md
│   ├── teste-agent.md
│   └── pwa-agent.md
├── back/
│   ├── lider.md
│   ├── endpoint-agent.md
│   ├── model-agent.md
│   ├── regra-agent.md
│   └── seguranca-agent.md
├── devops/
│   ├── lider.md
│   ├── infra-agent.md
│   ├── cicd-agent.md
│   ├── monitor-agent.md
│   └── backup-agent.md
├── qa/
│   ├── lider.md
│   ├── teste-manual-agent.md
│   ├── teste-auto-agent.md
│   ├── doc-agent.md
│   └── bug-agent.md
├── analytics/
│   ├── lider.md
│   ├── dados-agent.md
│   ├── dashboard-agent.md
│   ├── marketing-agent.md
│   └── growth-agent.md
├── revisao/
│   ├── code-auditor.md
│   ├── security-auditor.md
│   └── perf-auditor.md
└── inovacao/
    └── innovation-agent.md
```

## Como Usar no OpenCode

1. **Orquestrador**: é você (ou use o prompt de `orquestrador.md` como instrução do sistema)
2. **Líderes**: carregue o prompt do líder com `@agent/<area>/lider.md`
3. **Agentes**: cada agente tem seu prompt específico em `@agent/<area>/<agente>.md`

### Exemplo de Fluxo

```
Usuário: "Quero ordenar OS por data de criação"

Orquestrador:
  → Líder Front: "adicione botão de ordenação na listagem"
  → Líder Front volta: "preciso que o back-end retorne created_at no formato ISO"
  → Orquestrador chama Líder Back: "garanta que GET /orders retorne created_at"
  → Líder Back entrega
  → Orquestrador avisa Front: "API pronta, pode implementar"
  → Líder Front implementa
  → Revisão: Code Auditor verifica
  → Inovação: sugere "coloca ordenação ascendente/descendente"
  → Orquestrador valida com usuário
```
