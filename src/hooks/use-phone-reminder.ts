import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function usePhoneReminder() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id || !profile?.organization_id) return;
    if (profile.whatsapp && profile.whatsapp.trim() !== '') return;

    const storageKey = `phone_reminder_shown_${profile.id}_${new Date().toDateString()}`;
    if (localStorage.getItem(storageKey)) return;

    const createReminder = async () => {
      try {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'system',
          title: '📱 Atualize seu WhatsApp',
          content: 'Cadastre seu número de WhatsApp em Configurações > Conta para receber notificações importantes.',
          organization_id: profile.organization_id,
        });
        localStorage.setItem(storageKey, 'true');
      } catch (error) {
        console.error('Erro ao criar lembrete de telefone:', error);
      }
    };

    createReminder();
  }, [profile?.id, profile?.organization_id, profile?.whatsapp]);
}
