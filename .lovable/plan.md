

# Sistema de Comunicados e Barra de Notificação

## Visão Geral

Implementação de um sistema completo de comunicados (announcements) que permite ao Super Admin publicar avisos para todos os usuários do sistema, exibindo uma barra de notificação visível no topo de todas as páginas e também enviando notificações individuais para cada usuário.

---

## Funcionalidades

### Para o Super Admin
- Nova seção "Comunicados" no painel de configurações do admin
- Formulário para criar/ativar um comunicado com:
  - **Mensagem** (texto do aviso)
  - **Botão opcional** (título + link)
  - **Status** (ativo/inativo)
- Ao publicar, além da barra aparecer, notificações são enviadas para todos os usuários ativos

### Para os Usuários
- Barra laranja no topo da tela quando houver comunicado ativo
- Botão X para dispensar (armazenado no localStorage)
- Botão opcional com link
- Também recebe notificação no sino

---

## Design da Barra

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Laranja]  Nova atualização disponível! Confira as novidades.  [Saiba mais] [X]│
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Cor de fundo: `bg-orange-500`
- Texto branco
- Posição: fixed no topo, acima de tudo (z-50)
- Botão de fechar (X) no canto direito
- Botão opcional de ação

---

## Alterações Técnicas

### 1. Banco de Dados

Adicionar nova tabela `announcements` para gerenciar os comunicados:

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  button_text TEXT,
  button_url TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Apenas um comunicado ativo por vez (gerenciado via lógica)
-- RLS: Super admins podem gerenciar, todos podem ler ativos
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
  ON announcements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );
```

### 2. Hook - use-announcements.ts

Novo hook para buscar o comunicado ativo:

```typescript
// src/hooks/use-announcements.ts
export function useActiveAnnouncement() {
  return useQuery({
    queryKey: ['active-announcement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
```

### 3. Componente - AnnouncementBanner.tsx

Barra de notificação global:

```typescript
// src/components/announcements/AnnouncementBanner.tsx

function AnnouncementBanner() {
  const { data: announcement } = useActiveAnnouncement();
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissedId = localStorage.getItem('dismissed_announcement');
    if (dismissedId === announcement?.id) {
      setDismissed(true);
    }
  }, [announcement?.id]);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem('dismissed_announcement', announcement.id);
    }
    setDismissed(true);
  };

  if (!announcement || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white py-2 px-4 flex items-center justify-center gap-4">
      <span className="text-sm font-medium">{announcement.message}</span>
      
      {announcement.button_text && announcement.button_url && (
        <a 
          href={announcement.button_url}
          target="_blank"
          className="bg-white text-orange-600 px-3 py-1 rounded text-sm font-medium hover:bg-orange-50"
        >
          {announcement.button_text}
        </a>
      )}
      
      <button onClick={handleDismiss} className="ml-auto p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

### 4. Integração no Layout

Adicionar a barra no `App.tsx` ou nos layouts:

```typescript
// src/App.tsx - Adicionar acima de tudo
<>
  <AnnouncementBanner />
  <ImpersonateBanner />
  <ScrollToTop />
  {/* ... resto */}
</>
```

Ajustar padding quando a barra estiver visível.

### 5. Painel Admin - Gerenciamento

Nova seção em `AdminSettings.tsx`:

```typescript
// Card de Comunicados
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Megaphone className="h-5 w-5" />
      Comunicados
    </CardTitle>
    <CardDescription>
      Exiba um aviso no topo de todas as telas para todos os usuários
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label>Mensagem do comunicado</Label>
      <Textarea 
        placeholder="Nova atualização disponível! Confira as novidades."
        value={announcementMessage}
        onChange={(e) => setAnnouncementMessage(e.target.value)}
      />
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Texto do botão (opcional)</Label>
        <Input 
          placeholder="Saiba mais"
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Link do botão (opcional)</Label>
        <Input 
          placeholder="https://..."
          value={buttonUrl}
          onChange={(e) => setButtonUrl(e.target.value)}
        />
      </div>
    </div>

    <div className="flex items-center gap-4">
      <Switch 
        checked={announcementActive}
        onCheckedChange={setAnnouncementActive}
      />
      <Label>Comunicado ativo</Label>
    </div>

    <Button onClick={handleSaveAnnouncement}>
      <Save className="h-4 w-4 mr-2" />
      Salvar e Publicar
    </Button>
  </CardContent>
</Card>
```

### 6. Envio de Notificações em Massa

Ao ativar um comunicado, também cria notificações para todos os usuários:

```typescript
async function publishAnnouncement(message: string, buttonText?: string, buttonUrl?: string) {
  // 1. Desativar comunicados anteriores
  await supabase
    .from('announcements')
    .update({ is_active: false })
    .eq('is_active', true);

  // 2. Criar novo comunicado
  const { data: announcement, error } = await supabase
    .from('announcements')
    .insert({
      message,
      button_text: buttonText || null,
      button_url: buttonUrl || null,
      is_active: true,
      created_by: userId,
    })
    .select()
    .single();

  // 3. Buscar todos os usuários ativos
  const { data: users } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('is_active', true);

  // 4. Criar notificações em lote
  if (users && users.length > 0) {
    const notifications = users.map(user => ({
      user_id: user.id,
      organization_id: user.organization_id,
      title: 'Comunicado',
      content: message,
      type: 'system',
    }));

    await supabase.from('notifications').insert(notifications);
  }
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx_create_announcements.sql` | Criar tabela |
| `src/hooks/use-announcements.ts` | Novo hook |
| `src/components/announcements/AnnouncementBanner.tsx` | Novo componente |
| `src/pages/admin/AdminSettings.tsx` | Adicionar seção de comunicados |
| `src/App.tsx` | Integrar barra no layout |
| `src/integrations/supabase/types.ts` | Atualizar tipos |

---

## Fluxo de Uso

```text
1. Super Admin acessa Configurações do Sistema
2. Na seção "Comunicados", preenche a mensagem
3. Opcionalmente adiciona texto e link do botão
4. Ativa o comunicado e salva
5. Sistema:
   - Desativa comunicados anteriores
   - Cria novo comunicado ativo
   - Envia notificação para todos os usuários
6. Usuários veem:
   - Barra laranja no topo (pode fechar)
   - Notificação no sino
7. Quando fecham, fica salvo no localStorage
8. Se outro comunicado for publicado, aparece novamente
```

---

## Considerações

1. **Apenas um comunicado ativo**: Ao ativar um novo, os anteriores são desativados
2. **Dispensa persistente**: Usar localStorage com o ID do comunicado para não mostrar o mesmo novamente
3. **Novo comunicado = nova exibição**: Se o ID mudar, a barra aparece de novo
4. **Notificações assíncronas**: Envio em batch para não travar a UI
5. **Z-index alto (z-50)**: Garante visibilidade acima de tudo

