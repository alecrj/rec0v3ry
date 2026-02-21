/**
 * Email Service
 *
 * Sends transactional emails via Resend.
 * Compliance: NO SUD data in email subjects or bodies per 42 CFR Part 2.
 */

import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'RecoveryOS <noreply@recoveryos.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.recoveryos.com';

// ============================================================
// SEND HELPERS
// ============================================================

interface SendParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendParams) {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
  });

  if (error) {
    console.error('[Email] Send failed:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a;">
      <div style="padding:24px 32px;border-bottom:1px solid #27272a;">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#f4f4f5;">RecoveryOS</h1>
      </div>
      <div style="padding:32px;">${content}</div>
      <div style="padding:16px 32px;background:#0f0f10;border-top:1px solid #27272a;">
        <p style="margin:0;font-size:12px;color:#71717a;text-align:center;">
          This is an automated message from RecoveryOS. Do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Invoice Created ─────────────────────────────────────

export async function sendInvoiceCreatedEmail(params: {
  to: string;
  recipientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  orgName: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#f4f4f5;">New Invoice</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${params.recipientName}, a new invoice has been created for your account at ${params.orgName}.
    </p>
    <div style="background:#27272a;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Invoice #</td>
          <td style="padding:8px 0;color:#f4f4f5;font-size:14px;text-align:right;">${params.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Amount Due</td>
          <td style="padding:8px 0;color:#f4f4f5;font-size:18px;font-weight:700;text-align:right;">$${params.amount}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Due Date</td>
          <td style="padding:8px 0;color:#f4f4f5;font-size:14px;text-align:right;">${params.dueDate}</td>
        </tr>
      </table>
    </div>
    <a href="${APP_URL}/payments/pay" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
      Pay Now
    </a>
  `);

  return sendEmail({
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} - $${params.amount} due ${params.dueDate}`,
    html,
  });
}

// ── Payment Receipt ─────────────────────────────────────

export async function sendPaymentReceiptEmail(params: {
  to: string;
  recipientName: string;
  amount: string;
  paymentDate: string;
  invoiceNumber?: string;
  orgName: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#f4f4f5;">Payment Received</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${params.recipientName}, your payment has been received by ${params.orgName}.
    </p>
    <div style="background:#27272a;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Amount Paid</td>
          <td style="padding:8px 0;color:#22c55e;font-size:18px;font-weight:700;text-align:right;">$${params.amount}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Date</td>
          <td style="padding:8px 0;color:#f4f4f5;font-size:14px;text-align:right;">${params.paymentDate}</td>
        </tr>
        ${params.invoiceNumber ? `<tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Invoice #</td>
          <td style="padding:8px 0;color:#f4f4f5;font-size:14px;text-align:right;">${params.invoiceNumber}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color:#71717a;font-size:13px;margin:0;">
      Thank you for your payment. This email serves as your receipt.
    </p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Payment Receipt - $${params.amount}`,
    html,
  });
}

// ── Family Portal Invite ────────────────────────────────

export async function sendFamilyPortalInviteEmail(params: {
  to: string;
  familyName: string;
  residentName: string;
  orgName: string;
  inviteUrl: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#f4f4f5;">Family Portal Access</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${params.familyName}, you have been invited to the ${params.orgName} Family Portal
      to view information and stay connected with ${params.residentName}.
    </p>
    <a href="${params.inviteUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px;">
      Access Family Portal
    </a>
    <p style="color:#71717a;font-size:13px;margin:16px 0 0;">
      If you did not expect this invitation, you can safely ignore this email.
    </p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Family Portal Invitation - ${params.orgName}`,
    html,
  });
}

// ── Welcome Email ───────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  orgName: string;
  role: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#f4f4f5;">Welcome to RecoveryOS</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${params.name}, your account has been created at ${params.orgName} as a ${params.role}.
    </p>
    <a href="${APP_URL}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
      Get Started
    </a>
  `);

  return sendEmail({
    to: params.to,
    subject: `Welcome to ${params.orgName} - RecoveryOS`,
    html,
  });
}

// ── Payment Reminder ────────────────────────────────────

export async function sendPaymentReminderEmail(params: {
  to: string;
  recipientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  isOverdue: boolean;
  orgName: string;
}) {
  const statusLabel = params.isOverdue ? 'OVERDUE' : 'Due Soon';
  const statusColor = params.isOverdue ? '#ef4444' : '#f59e0b';

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#f4f4f5;">Payment Reminder</h2>
    <div style="display:inline-block;background:${statusColor}20;color:${statusColor};padding:4px 12px;border-radius:4px;font-size:12px;font-weight:700;margin-bottom:16px;">
      ${statusLabel}
    </div>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${params.recipientName}, this is a reminder about your ${params.isOverdue ? 'overdue' : 'upcoming'} payment at ${params.orgName}.
    </p>
    <div style="background:#27272a;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Invoice #</td>
          <td style="padding:8px 0;color:#f4f4f5;font-size:14px;text-align:right;">${params.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">Amount Due</td>
          <td style="padding:8px 0;color:#f4f4f5;font-size:18px;font-weight:700;text-align:right;">$${params.amount}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;">${params.isOverdue ? 'Was Due' : 'Due Date'}</td>
          <td style="padding:8px 0;color:${statusColor};font-size:14px;font-weight:600;text-align:right;">${params.dueDate}</td>
        </tr>
      </table>
    </div>
    <a href="${APP_URL}/payments/pay" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
      Pay Now
    </a>
  `);

  return sendEmail({
    to: params.to,
    subject: `${params.isOverdue ? 'OVERDUE: ' : ''}Invoice ${params.invoiceNumber} - $${params.amount}`,
    html,
  });
}

// ── Admission Status Update ─────────────────────────────

export async function sendAdmissionStatusEmail(params: {
  to: string;
  applicantName: string;
  status: string;
  orgName: string;
  message?: string;
}) {
  const statusMap: Record<string, { label: string; color: string }> = {
    approved: { label: 'Approved', color: '#22c55e' },
    waitlisted: { label: 'Waitlisted', color: '#f59e0b' },
    rejected: { label: 'Not Approved', color: '#ef4444' },
  };

  const statusInfo = statusMap[params.status] || { label: params.status, color: '#6366f1' };

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#f4f4f5;">Application Update</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${params.applicantName}, your application with ${params.orgName} has been updated.
    </p>
    <div style="background:#27272a;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;color:#71717a;font-size:13px;">Application Status</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${statusInfo.color};">${statusInfo.label}</p>
    </div>
    ${params.message ? `<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">${params.message}</p>` : ''}
  `);

  return sendEmail({
    to: params.to,
    subject: `Application ${statusInfo.label} - ${params.orgName}`,
    html,
  });
}
