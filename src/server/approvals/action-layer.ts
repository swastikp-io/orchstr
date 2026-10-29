import { ApprovalEngine, ConsequentialActionType } from './approval-engine.js';

export interface ActionExecutionResponse {
  simulated: true;
  action_type: ConsequentialActionType;
  dispatched_at: string;
  summary: string;
  details: Record<string, any>;
}

export class SafeActionLayer {
  private approvalEngine: ApprovalEngine;

  constructor(approvalEngine: ApprovalEngine) {
    this.approvalEngine = approvalEngine;
  }

  /**
   * Executes an outbound email dispatch safely via mock adapter with explicit server gate enforcement.
   */
  public async executeSendOutboundEmails(
    approvalId: string,
    payload: {
      campaign_name: string;
      target_persona: string;
      recipients: Array<{ email: string; name: string; company: string }>;
      sequence: Array<{ step: number; subject: string; body: string }>;
    }
  ): Promise<ActionExecutionResponse> {
    return this.approvalEngine.executeAction(approvalId, payload, async (validPayload) => {
      // Safe Simulated Execution
      return {
        simulated: true,
        action_type: 'send_outbound_emails',
        dispatched_at: new Date().toISOString(),
        summary: `[SIMULATED] Successfully simulated outbound cold email transmission for "${validPayload.campaign_name}".`,
        details: {
          recipient_count: validPayload.recipients?.length || 0,
          sample_recipient: validPayload.recipients?.[0]?.email || 'preview@enterprise.com',
          status: 'simulated_delivery_queued',
          provider: 'Simulated Outbound Relay (Zero Side Effects)'
        }
      };
    }).then(appr => appr.execution_result as ActionExecutionResponse);
  }

  /**
   * Executes publication of marketing newsletter safely via mock adapter.
   */
  public async executePublishNewsletter(
    approvalId: string,
    payload: {
      edition_title: string;
      channel: string;
      content_body: string;
      cta_link: string;
    }
  ): Promise<ActionExecutionResponse> {
    return this.approvalEngine.executeAction(approvalId, payload, async (validPayload) => {
      return {
        simulated: true,
        action_type: 'publish_newsletter',
        dispatched_at: new Date().toISOString(),
        summary: `[SIMULATED] Successfully simulated publication of newsletter "${validPayload.edition_title}".`,
        details: {
          channel: validPayload.channel,
          length_words: validPayload.content_body?.split(/\s+/).length || 0,
          status: 'simulated_broadcast_published',
          distribution: 'Safe Sandbox Feed'
        }
      };
    }).then(appr => appr.execution_result as ActionExecutionResponse);
  }

  /**
   * General consequential action executor
   */
  public async executeGenericAction(
    approvalId: string,
    actionType: ConsequentialActionType,
    payload: Record<string, any>
  ): Promise<ActionExecutionResponse> {
    return this.approvalEngine.executeAction(approvalId, payload, async (validPayload) => {
      return {
        simulated: true,
        action_type: actionType,
        dispatched_at: new Date().toISOString(),
        summary: `[SIMULATED] Completed safe simulated execution for action: ${actionType}.`,
        details: {
          payload_keys: Object.keys(validPayload),
          mode: 'safe_mock_execution'
        }
      };
    }).then(appr => appr.execution_result as ActionExecutionResponse);
  }
}
