# Plano: Visibilidade de Pipeline para Líderes de Equipe (Supervisores)

## ✅ STATUS: IMPLEMENTADO

---

## Problema Identificado

Os líderes de equipe (supervisores) não conseguiam ver todos os leads nas pipelines vinculadas às suas equipes. Isso afetava tanto o segmento imobiliário quanto o telecom.

---

## Solução Implementada

### 1. ✅ Migração SQL Aplicada

- **Nova função `get_user_led_pipeline_ids()`**: Retorna IDs das pipelines vinculadas às equipes onde o usuário é líder
- **Política `Hierarchical lead access` atualizada**: Líderes agora veem leads em pipelines vinculadas à sua equipe
- **Política `Hierarchical lead management` atualizada**: Líderes podem gerenciar leads nessas pipelines

### 2. ✅ Frontend Atualizado (Pipelines.tsx)

- Líderes de equipe agora têm filtro padrão "Todos" ao abrir o Kanban
- Lógica verificada via hook `useCanEditCadences()` que detecta liderança de equipe

---

## Fluxo de Visibilidade Final

```text
Usuário abre Pipeline → RLS filtra leads
                        │
                        ├─ É Super Admin? → Vê tudo
                        ├─ É Admin da Org? → Vê tudo
                        ├─ Tem lead_view_all? → Vê tudo
                        ├─ Lead atribuído a ele? → Vê o lead
                        ├─ É líder de equipe? → Vê leads:
                        │   ├─ Atribuídos a membros da equipe
                        │   └─ Em pipelines vinculadas à equipe ✅
                        └─ Tem lead_view_team? → Vê leads de colegas
```

---

## Impacto

- **Usuários afetados:** Todos os líderes de equipe em todas as organizações
- **Segmentos:** Imobiliário e Telecom
- **Comportamento novo:** Líderes veem automaticamente todos os leads das pipelines vinculadas às suas equipes
- **Sem breaking changes:** Usuários regulares mantêm comportamento atual
