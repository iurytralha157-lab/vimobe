import { supabase } from '@/integrations/supabase/client';

export type NotificationChannel = 'whatsapp' | 'system' | 'email';

export interface NotificationTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  event_key: string;
  channel: NotificationChannel;
  title: string | null;
  message: string;
  variables: string[] | null;
  is_active: boolean;
  editable_by_admin: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendNotificationParams {
  templateSlug: string;
  organizationId: string;
  userId?: string;
  recipient?: string;
  variables: Record<string, any>;
  leadId?: string;
}

class NotificationService {
  /**
   * Centralized method to send notifications based on templates
   */
  async send({
    templateSlug,
    organizationId,
    userId,
    recipient,
    variables,
    leadId
  }: SendNotificationParams) {
    const startTime = performance.now();
    console.log(`[NotificationService] Sending template: ${templateSlug} to org: ${organizationId}`);

    try {
      // 1. Fetch template
      const { data, error: templateError } = await supabase
        .from('notification_templates' as any)
        .select('*')
        .eq('slug', templateSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (templateError) {
        console.error(`[NotificationService] Error fetching template ${templateSlug}:`, templateError);
        throw templateError;
      }

      if (!data) {
        console.warn(`[NotificationService] Template ${templateSlug} not found or inactive.`);
        return { success: false, error: 'Template not found' };
      }

      const template = data as any;

      // 2. Format message and title
      let formattedMessage = template.message;
      let formattedTitle = template.title || '';

      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{${key}}`;
          formattedMessage = formattedMessage.replace(new RegExp(placeholder, 'g'), String(value));
          if (formattedTitle) {
            formattedTitle = formattedTitle.replace(new RegExp(placeholder, 'g'), String(value));
          }
        });
      }

      // 3. Dispatch based on channel
      let result: any = { success: false };

      switch (template.channel) {
        case 'system':
          if (userId) {
            const { data: insertData, error } = await supabase.from('notifications').insert({
              user_id: userId,
              organization_id: organizationId,
              title: formattedTitle || template.name,
              content: formattedMessage,
              type: template.category || 'info',
              lead_id: leadId || null,
              is_read: false,
            }).select().single();
            
            result = { success: !error, data: insertData, error };
          } else {
            result = { success: false, error: 'userId is required for system notifications' };
          }
          break;

        case 'whatsapp':
          // Using existing whatsapp-notifier edge function
          const invokeResult = await supabase.functions.invoke('whatsapp-notifier', {
            body: {
              organization_id: organizationId,
              user_id: userId,
              phone: recipient,
              message: formattedMessage,
            },
          });
          result = { success: !invokeResult.error, ...invokeResult };
          break;


        default:
          console.error(`[NotificationService] Unsupported channel: ${template.channel}`);
          result = { success: false, error: 'Unsupported channel' };
      }

      // 4. Log the event with detailed tracking
      const endTime = performance.now();
      const executionTime = `${(endTime - startTime).toFixed(2)}ms`;

      await this.logNotification({
        templateId: template.id,
        organizationId,
        userId,
        recipient: recipient || userId || 'unknown',
        channel: template.channel,
        payload: { 
          variables, 
          formattedTitle, 
          formattedMessage,
          origin: 'NotificationService',
          executionTime
        },
        response: result,
        status: result.success ? 'sent' : 'failed',
        error: result.error ? (typeof result.error === 'object' ? JSON.stringify(result.error) : String(result.error)) : null
      });

      return result;

    } catch (err) {
      console.error(`[NotificationService] Unexpected error sending ${templateSlug}:`, err);
      return { success: false, error: err };
    }
  }

  private async logNotification(log: {
    templateId: string;
    organizationId: string;
    userId?: string;
    recipient: string;
    channel: string;
    payload: any;
    response: any;
    status: string;
    error: string | null;
  }) {
    try {
      await supabase.from('notification_logs' as any).insert({
        template_id: log.templateId,
        organization_id: log.organizationId,
        user_id: log.userId,
        recipient: log.recipient,
        channel: log.channel,
        payload: log.payload,
        response: log.response,
        status: log.status,
        error: log.error
      });
    } catch (err) {
      console.error('[NotificationService] Failed to log notification:', err);
    }
  }
}

export const notificationService = new NotificationService();
