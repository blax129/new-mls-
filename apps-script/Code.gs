/**
 * Email 2 — paste this into Google Apps Script (Extensions → Apps Script).
 * Sends onboarding email 5 hours after column A (Timestamp).
 *
 * Sheet headers (row 1):
 * A Timestamp | B FirstName | C Email | D JobTitle | E Category |
 * F Kind | G PayLabel | H ApplicationId | I Status | L EmailSent
 *
 * Trigger: Apps Script → Triggers → Add trigger
 * Function: sendDueOnboardingEmails
 * Event source: Time-driven → Minutes timer → Every 15 minutes
 */
const SITE = 'https://dotun-ui.github.io/MLS';
const SHEET_NAME = 'Sheet1';
const DELAY_HOURS = 5;

function sendDueOnboardingEmails() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const now = new Date();
  const delayMs = DELAY_HOURS * 60 * 60 * 1000;

  for (let row = 2; row <= lastRow; row++) {
    const emailSent = String(sheet.getRange(row, 12).getValue() || '').trim().toLowerCase();
    if (emailSent === 'yes') continue;

    const email = String(sheet.getRange(row, 3).getValue() || '').trim();
    if (!email) continue;

    const appliedAt = new Date(sheet.getRange(row, 1).getValue());
    if (isNaN(appliedAt.getTime())) continue;
    if (now.getTime() - appliedAt.getTime() < delayMs) continue;

    sendApprovalEmail_(sheet, row);
  }
}

function sendApprovalEmail_(sheet, row) {
  const firstName = String(sheet.getRange(row, 2).getValue() || '').trim();
  const email = String(sheet.getRange(row, 3).getValue() || '').trim();
  const jobTitle = String(sheet.getRange(row, 4).getValue() || '').trim();
  const category = String(sheet.getRange(row, 5).getValue() || '').trim();
  const kind = String(sheet.getRange(row, 6).getValue() || 'match').trim();
  const payLabel = String(sheet.getRange(row, 7).getValue() || '').trim();
  const applicationId = String(sheet.getRange(row, 8).getValue() || '').trim();

  if (!email) return;

  const already = String(sheet.getRange(row, 12).getValue() || '').trim();
  if (already.toLowerCase() === 'yes') return;

  const link =
    SITE +
    '/onboarding.html' +
    '?name=' + encodeURIComponent(firstName) +
    '&email=' + encodeURIComponent(email) +
    '&title=' + encodeURIComponent(jobTitle) +
    '&category=' + encodeURIComponent(category) +
    '&kind=' + encodeURIComponent(kind) +
    '&payLabel=' + encodeURIComponent(payLabel) +
    '&ref=' + encodeURIComponent(applicationId);

  const subject = 'Next step: complete onboarding for ' + jobTitle;

  const body =
    'Hi ' + firstName + ',\n\n' +
    'Your application for ' + jobTitle + ' is moving to onboarding.\n\n' +
    'Complete your onboarding package here:\n' +
    link + '\n\n' +
    'Reference: ' + applicationId + '\n\n' +
    '— Matchday Workforce Hiring Team';

  const htmlBody =
    '<div style="margin:0;padding:0;background:#0b1220;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1220;padding:28px 12px;">' +
        '<tr><td align="center">' +
          '<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">' +
            '<tr><td align="center" style="background:#0b1f3a;padding:28px 20px 24px;color:#ffffff;">' +
              '<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.78);font-weight:700;">Major League Soccer</div>' +
              '<div style="font-size:22px;font-weight:800;margin-top:4px;">Careers</div>' +
              '<div style="font-size:12px;color:rgba(255,255,255,0.72);margin-top:8px;">Powered by Matchday Workforce</div>' +
            '</td></tr>' +
            '<tr><td style="height:4px;background:#c8102e;font-size:0;line-height:0;">&nbsp;</td></tr>' +
            '<tr><td style="padding:28px;">' +
              '<p style="margin:0 0 14px;font-size:16px;color:#14213d;">Hi ' + firstName + ',</p>' +
              '<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">Your application for <strong>' + jobTitle + '</strong> is moving to onboarding.</p>' +
              '<p style="margin:0 0 22px;text-align:center;">' +
                '<a href="' + link + '" style="display:inline-block;background:#0b1f3a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;">Complete onboarding</a>' +
              '</p>' +
              '<p style="margin:0;font-size:13px;color:#64748b;">Reference: ' + applicationId + '</p>' +
            '</td></tr>' +
          '</table>' +
        '</td></tr>' +
      '</table>' +
    '</div>';

  GmailApp.sendEmail(email, subject, body, { htmlBody: htmlBody });
  sheet.getRange(row, 12).setValue('Yes');
}

function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (range.getColumn() !== 9) return;
  if (String(range.getValue()).toLowerCase() !== 'approved') return;
  const row = range.getRow();
  if (row < 2) return;
  sendApprovalEmail_(sheet, row);
}

function testSend() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet tab not found. Check SHEET_NAME.');
  sendApprovalEmail_(sheet, 2);
}
