interface EmailConfig {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(config: EmailConfig): Promise<EmailResult> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured — skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: config.from || 'CortexOps <noreply@cortexops.com>',
        to: Array.isArray(config.to) ? config.to : [config.to],
        subject: config.subject,
        html: config.html || undefined,
        text: config.text || config.html?.replace(/<[^>]*>/g, '') || '',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: `Email API error: ${error.message || response.statusText}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to send email: ${message}` };
  }
}

export function getEmailTemplate(
  type: 'execution_success' | 'execution_failure' | 'workflow_report',
  data: Record<string, unknown>
): { subject: string; html: string } {
  switch (type) {
    case 'execution_success':
      return {
        subject: `✅ Execution succeeded: ${data.workflowName}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px;"><h2 style="color: #10b981;">✅ Execution Succeeded</h2><p><strong>Workflow:</strong> ${data.workflowName}</p><p><strong>Duration:</strong> ${data.duration}ms</p><p><strong>Steps:</strong> ${data.stepsCompleted} of ${data.totalSteps}</p></div>`,
      };
    case 'execution_failure':
      return {
        subject: `❌ Execution failed: ${data.workflowName}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px;"><h2 style="color: #ef4444;">❌ Execution Failed</h2><p><strong>Workflow:</strong> ${data.workflowName}</p><p><strong>Failed Step:</strong> ${data.failedStep}</p><p><strong>Error:</strong> ${data.error}</p></div>`,
      };
    case 'workflow_report':
      return {
        subject: `📊 Report: ${data.workflowName}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px;"><h2>📊 Workflow Report</h2><p><strong>Workflow:</strong> ${data.workflowName}</p><p><strong>Period:</strong> ${data.period}</p><p>Total: ${data.totalExecutions} | Success: ${data.successful} | Failed: ${data.failed}</p></div>`,
      };
  }
}
