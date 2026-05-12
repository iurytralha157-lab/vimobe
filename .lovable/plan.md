I will fix the gamification system so that scheduled visits, meetings, and sales are correctly counted in the ranking.

### Technical details:
1. **Update Gamification Function**: Refactor `handle_activity_gamification` to:
   - Handle the `leads` table (triggering on 'won' status).
   - Correctly identify the user responsible (using `assigned_user_id` for leads and `user_id` for other events).
   - Map event types correctly: 
     - `leads.deal_status = 'won'` -> `sale_closed`
     - `schedule_events.event_type = 'visit'` -> `visit_scheduled`
     - `schedule_events.event_type = 'meeting'` -> `meeting_held`
   - Ensure organization ID is correctly retrieved.
2. **Setup Database Triggers**:
   - Create `tr_schedule_events_gamification` on the `schedule_events` table.
   - Create `tr_lead_gamification` on the `leads` table.
   - Verify/Fix `tr_activity_gamification` on the `activities` table.
3. **Configure Rules**: Ensure the organization `4251164b-cfb0-402a-a854-ecae79470561` (Rede Nardo) has active rules for `visit_scheduled`, `meeting_held`, `sale_closed`, and `visit_confirmed`.
4. **Retroactive Points**: Add a script to grant points for recent visits and sales that were already recorded but not counted.

I will use a migration file to apply these changes safely to the database.