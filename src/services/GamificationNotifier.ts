import { supabase } from "@/integrations/supabase/client";

/**
 * Gamification Notifier logic for handling position changes and goal achievements.
 * This should ideally run within a database trigger or edge function scheduled task.
 */
export async function handleGamificationNotifications(
  organizationId: string,
  userId: string,
  type: 'ranking_change' | 'mission_completed' | 'goal_reached',
  metadata: any
) {
  try {
    // 1. Get user details for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (!profile) return;

    // 2. Prepare notification content based on type
    let title = '';
    let message = '';
    let eventKey = 'gamification_alert';

    if (type === 'ranking_change') {
      const { newRank, oldRank } = metadata;
      if (newRank < oldRank) {
        title = 'Você subiu no ranking! 🏆';
        message = `Parabéns! Você agora ocupa a ${newRank}ª posição no ranking geral.`;
      } else {
        return; // Don't notify for drops unless specifically requested
      }
    } else if (type === 'mission_completed') {
      title = 'Missão cumprida! 🎉';
      message = `Você concluiu a missão "${metadata.missionTitle}" e ganhou ${metadata.bonusPoints} pontos!`;
    }

    // 3. Insert into existing notifications table
    await supabase.from('notifications').insert({
      organization_id: organizationId,
      user_id: userId,
      title,
      message,
      type: 'gamification',
      is_read: false,
      metadata: { ...metadata, notification_type: type }
    });

    // 4. Send email via NotificationService if email is available
    if (profile.email) {
      // Assuming a dedicated eventKey for gamification exists or fallback
      try {
        const { notificationService } = await import('@/services/NotificationService');
        await notificationService.send({
          eventKey: 'gamification_update',
          organizationId,
          userId,
          recipient: profile.email,
          variables: {
            user_name: profile.name,
            title,
            message,
            ...metadata
          }
        });
      } catch (emailErr) {
        console.error('Failed to send gamification email notification:', emailErr);
      }
    }
  } catch (error) {
    console.error('Gamification notification error:', error);
  }
}
