

## Plano: Permitir Acesso Público às Configurações do Sistema

### Problema Identificado

A página de login não consegue carregar a logo correta porque:
1. A tabela `system_settings` tem RLS habilitado
2. A política de SELECT exige `auth.role() = 'authenticated'`
3. Na página de login, o usuário ainda não está autenticado (role = `anon`)
4. Portanto, a query retorna `[]` (vazio)
5. O código faz fallback para `/logo.png` (que é a logo padrão, não a do tema)

### Solução

Criar uma nova política RLS que permita **leitura pública** das configurações do sistema:

```sql
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
TO public
USING (true);
```

### Alterações Necessárias

| Tipo | Descrição |
|------|-----------|
| Migration SQL | Adicionar política de leitura pública para `system_settings` |

### Script de Migração

```sql
-- Permitir que qualquer usuário (autenticado ou não) veja as configurações do sistema
-- Isso é necessário para a página de login carregar a logo correta

CREATE POLICY "Public can view system settings"
ON public.system_settings
FOR SELECT
TO anon
USING (true);
```

### Por que é Seguro?

1. **Dados não sensíveis**: A tabela `system_settings` contém apenas:
   - URLs de logos (públicas)
   - URLs de favicons (públicas)
   - Número do WhatsApp (já é público no site)
   - Dimensões da logo (não sensível)

2. **Apenas leitura**: A política é apenas para SELECT - INSERT/UPDATE continuam restritos a super admins

3. **Padrão comum**: É comum que configurações visuais sejam públicas para personalizar a experiência antes do login

### Resultado Esperado

Após a migração:
- Página de login carregará a logo correta baseada no tema (claro/escuro)
- O `useSystemSettings` retornará os dados mesmo sem autenticação
- O `useMemo` com `resolvedTheme` funcionará corretamente

