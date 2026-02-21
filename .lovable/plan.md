

# Ajustes no Dialog de Criar Lead (Mobile)

## 1. Centralizar o dialog com espaçamento igual nas bordas
Corrigir o `mx-[5%]` que esta deslocando o dialog. A abordagem correta e reduzir o `w-full` para algo como `w-[90%]` mantendo o `translate-x-[-50%]` do dialog centrado.

## 2. Botoes 60/40
Trocar o layout dos botoes no footer para que "Criar Lead" ocupe 60% e "Cancelar" ocupe 40%, invertendo a ordem visual (Cancelar a esquerda, acao principal a direita).

## 3. Botao dinamico por aba
- Nas abas "Basico" e "Perfil/Contrato": o botao mostra **"Avancar"** e ao clicar avanca para a proxima aba (sem submit).
- Na aba "Gestao": o botao mostra **"Criar Lead"** (ou "Criar Cliente" para telecom) e faz o submit real do formulario.

Isso requer controlar o estado da aba ativa com `useState` em vez de `defaultValue`.

---

## Detalhes tecnicos

**Arquivo**: `src/components/leads/CreateLeadDialog.tsx`

### Alteracao 1 - Dialog centralizado (linha 223)
Remover `mx-[5%] sm:mx-auto` e adicionar `w-[90%] sm:w-full` para manter o dialog centrado com 5% de respiro em cada lado.

### Alteracao 2 - Estado de aba controlada
Adicionar `const [activeTab, setActiveTab] = useState('basic')` e trocar `<Tabs defaultValue="basic">` por `<Tabs value={activeTab} onValueChange={setActiveTab}>`. Resetar para `'basic'` quando o dialog abre (no useEffect existente).

### Alteracao 3 - Footer com botoes dinamicos (linhas 833-841)
```
const isLastTab = activeTab === 'management';
const handleNext = () => {
  if (activeTab === 'basic') setActiveTab('profile');
  else if (activeTab === 'profile') setActiveTab('management');
};
```

No footer:
- Cancelar com `w-[40%]`
- Botao principal com `w-[60%]`: se `isLastTab` faz submit, senao chama `handleNext()` com tipo `button`.

