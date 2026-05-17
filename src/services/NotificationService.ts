import { supabase } from '@/integrations/supabase/client';

export type NotificationChannel = 'whatsapp' | 'system' | 'email' | 'push';

export interface SendNotificationParams {
  eventKey: string;
  organizationId: string;
  userId?: string;
  recipient?: string;
  variables: Record<string, any>;
  leadId?: string;
  dedupeKey?: string;
  isTest?: boolean;
}

class NotificationService {
  /**
   * Centralized method to send notifications via the Dispatcher Edge Function
   */
  async send({
    eventKey,
    organizationId,
    userId,
    recipient,
    variables,
    leadId,
    dedupeKey,
    isTest
  }: SendNotificationParams) {
    console.log(`[NotificationService] Dispatching event: ${eventKey} for org: ${organizationId}`);

    try {
      const { data, error } = await supabase.functions.invoke('notification-dispatcher', {
        body: {
          event_key: eventKey,
          organization_id: organizationId,
          user_id: userId,
          recipient,
          variables,
          lead_id: leadId,
          dedupe_key: dedupeKey,
          is_test: isTest
        },
      });

      if (error) {
        console.error(`[NotificationService] Error invoking dispatcher for ${eventKey}:`, error);
        return { success: false, error };
      }

      return data;
    } catch (err) {
      console.error(`[NotificationService] Unexpected error sending ${eventKey}:`, err);
      return { success: false, error: err };
    }
  }

  /**
   * Legacy method for backward compatibility
   * Maps templateSlug to eventKey
   */
  async sendLegacy({
    templateSlug,
    organizationId,
    userId,
    recipient,
    variables,
    leadId
  }: any) {
    return this.send({
      eventKey: templateSlug, // In the new architecture, we'll try to keep eventKey matching slug initially
      organizationId,
      userId,
      recipient,
      variables,
      leadId
    });
  }
}

export const notificationService = new NotificationService();