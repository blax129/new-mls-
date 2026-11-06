const SITE = 'https://dotun-ui.github.io/MLS';
const ONBOARDING_URL = SITE + '/onboarding.html';
const CARE_PHONE = '208-286-6794';
const CARE_TEL = '+12082866794';
const EMAIL2_DELAY_MS = 5 * 60 * 60 * 1000; // 5 hours for live sending
const EMAILJS_SERVICE_ID = 'service_ls7of2h';
const EMAILJS_TEMPLATE_ID = 'template_1pj1foi';
const EMAILJS_PUBLIC_KEY = 'h_8DZt_Ej5jOjpLXm';

// Install under the account receiving the Formspree notifications.
function installFormspreeEmail2() {
  const owner = Session.getEffectiveUser().getEmail().toLowerCase();
  if (owner !== 'paulgoodling0@gmail.com') throw Error('Install under Paul’s Formspree mailbox.');

  const store = PropertiesService.getScriptProperties();

  if (!store.getProperty('email2Start')) {
    store.setProperty('email2Start', String(Date.now()));
  }

  ensureProcessTrigger_();
}

// Run once before testing. The normal 15-minute trigger stays installed.
function startFiveMinuteEmail2Test() {
  const store = PropertiesService.getScriptProperties();
  if (!store.getProperty('email2Start')) throw Error('Install the normal timer first.');

  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'checkEmail2Test')) {
    ScriptApp.newTrigger('checkEmail2Test').timeBased().everyMinutes(1).create();
  }

  store.setProperty('email2TestStart', String(Date.now()));
}

function stopFiveMinuteEmail2Test() {
  PropertiesService.getScriptProperties().deleteProperty('email2TestStart');

  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'checkEmail2Test') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

function checkEmail2Test() {
  const started = Number(PropertiesService.getScriptProperties().getProperty('email2TestStart'));

  if (!started || Date.now() - started > 3600000) {
    stopFiveMinuteEmail2Test();
    return;
  }

  processFormspreeEmail2();
}

function ensureProcessTrigger_() {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'processFormspreeEmail2') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger('processFormspreeEmail2').timeBased().everyMinutes(1).create();
}

function processFormspreeEmail2() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;

  try {
    const store = PropertiesService.getScriptProperties();
    const start = Number(store.getProperty('email2Start'));
    if (!start) throw Error('Install the timer first.');

    const now = Date.now();
    const testStart = Number(store.getProperty('email2TestStart'));
    const testing = testStart && now - testStart <= 3600000;
    const normalCutoff = now - EMAIL2_DELAY_MS;
    const cutoff = testing ? now - 5 * 60 * 1000 : normalCutoff;
    const cursor = Number(store.getProperty('email2Cursor') || start);

    if (cutoff < cursor) return;

    const query =
      'from:noreply@formspree.io {subject:"Matchday Workforce" subject:"MLS Careers"} after:' +
      (Math.floor(cursor / 1000) - 1) +
      ' before:' +
      (Math.ceil(cutoff / 1000) + 1);

    for (let offset = 0; ; offset += 50) {
      const threads = GmailApp.search(query, offset, 50);

      for (const thread of threads) {
        for (const msg of thread.getMessages()) {
          const when = msg.getDate().getTime();

          if (when < cursor || when > cutoff) continue;
          if (when > normalCutoff && (!testing || when < testStart)) continue;

          const roleMatch =
            /^(?:Matchday Workforce|MLS Careers) · (?:Club|Matchday|Event ops) Application: (.+)$/
              .exec(msg.getSubject());

          if (!roleMatch) continue;

          if (!/^(?:Formspree\s*<noreply@formspree\.io>|noreply@formspree\.io)$/i.test(msg.getFrom())) {
            continue;
          }

          const auth = msg.getHeader('Authentication-Results');
          if (!/dkim=pass[^;]*header\.[id]=@?(?:[\w-]+\.)*formspree\.io\b/i.test(auth)) {
            continue;
          }

          const recipient = msg.getReplyTo().trim().replace(/^[^<>]*<([^<>]+)>$/, '$1');

          if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient) ||
              /@formspree\.io$/i.test(recipient)) {
            throw Error('Missing applicant reply address: ' + msg.getId());
          }

          const key = 'email2Message:' + msg.getId();
          const prior = store.getProperty(key);

          if (prior === 'pending') {
            throw Error('Check Sent before retrying message ' + msg.getId());
          }
          if (prior) continue;

          store.setProperty(key, 'pending');

          const details = approvalDetails_(msg, roleMatch[1].trim());
          sendApprovalWithEmailJS_(recipient, details);

          store.setProperty(key, String(when));
        }
      }

      if (threads.length < 50) break;
    }

    store.setProperty('email2Cursor', String(Math.max(cursor, normalCutoff + 1)));

    for (const key of Object.keys(store.getProperties())) {
      if (key.startsWith('email2Message:') &&
          Number(store.getProperty(key)) <= normalCutoff) {
        store.deleteProperty(key);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function sendApprovalWithEmailJS_(recipient, d) {
  const privateKey = PropertiesService.getScriptProperties().getProperty('EMAILJS_PRIVATE_KEY');
  if (!privateKey) throw Error('Add EMAILJS_PRIVATE_KEY in Apps Script Project Settings → Script Properties.');

  const templateParams = {
    to_email: recipient,
    applicationId: d.applicationId,
    firstName: d.firstName,
    role: d.role,
    org: d.org,
    venue: d.venue,
    shiftDate: d.shift.date,
    reportTime: d.shift.reportTime,
    kickoffNote: d.shift.kickoffNote,
    shiftLocation: d.shift.location,
    pickupDesk: d.shift.pickupDesk,
    pickupHours: d.shift.pickupHours,
    sameDayPickupTime: d.shift.sameDay,
    onSiteContact: d.shift.contact,
    feeItems: d.fees.items.map(function(item) {
      return { name: item[0], amount: money_(item[1]) };
    }),
    feeTotal: money_(d.fees.total),
    feeNotice: d.fees.notice,
    onboardingUrl: onboardingUrl_(d)
  };

  const response = UrlFetchApp.fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: privateKey,
      template_params: templateParams
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw Error('EmailJS send failed (' + status + '): ' + response.getContentText());
  }
}

function onboardingUrl_(d) {
  const payload = {
    role: d.role,
    applicationId: d.applicationId,
    reporting: d.reporting,
    fees: {
      items: d.fees.items.map(function(item) {
        return {
          label: item[0],
          amount: money_(item[1]),
          isDeposit: /deposit\s*\(refundable\)/i.test(item[0])
        };
      }),
      total: money_(d.fees.total)
    }
  };
  const encoded = Utilities.base64Encode(JSON.stringify(payload), Utilities.Charset.UTF_8);
  return ONBOARDING_URL + '?d=' + encodeURIComponent(encoded);
}

function approvalDetails_(msg, subjectRole) {
  const body = String(msg.getPlainBody() || msg.getBody() || '');
  const firstName = field_(body, ['firstName', 'First name', 'first name']) || 'there';
  const role = field_(body, ['jobTitle', 'Job title', 'role']) || subjectRole;
  const venue = field_(body, ['jobLocation', 'Job location', 'location']) || 'your assigned stadium';
  const org = field_(body, ['jobOrg', 'Job org', 'club', 'organization']) || 'Matchday Workforce';
  const category = field_(body, ['jobCategory', 'Job category', 'category']) || '';
  const pay = field_(body, ['jobPay', 'Job pay', 'pay']) || '';

  return {
    firstName: firstName,
    applicationId: 'MW-' + String(msg.getId()).slice(-8).toUpperCase(),
    role: role,
    venue: venue,
    org: org,
    fees: feePackage_(role, category, pay),
    shift: firstShift_(msg.getDate(), venue),
    reporting: {
      date: field_(body, ['reportingDate', 'Reporting date', 'shiftDate', 'Shift date']),
      time: field_(body, ['reportingTime', 'Reporting time', 'reportTime', 'Report time']),
      instructions: field_(body, ['reportingInstructions', 'Reporting instructions', 'checkInInstructions', 'Check-in instructions']),
      venue: field_(body, ['assignedVenue', 'Assigned venue', 'jobLocation', 'Job location'])
    },
  };
}

function field_(text, keys) {
  const clean = String(text).replace(/\r/g, '').replace(/<[^>]+>/g, '\n');
  for (const key of keys) {
    const re = new RegExp(
      '(?:^|\\n)\\s*' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:\\-–]\\s*([^\\n]+)',
      'i'
    );
    const m = re.exec(clean);
    if (m) {
      const value = m[1].replace(/\s+/g, ' ').trim();
      if (value) return value;
    }
  }
  return '';
}

function firstShift_(appliedAt, venue) {
  const start = appliedAt instanceof Date && !isNaN(appliedAt.getTime()) ? new Date(appliedAt.getTime()) : new Date();
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 10);
  day.setDate(day.getDate() + ((6 - day.getDay() + 7) % 7));
  return {
    date: Utilities.formatDate(day, 'America/Los_Angeles', "EEEE, MMMM d, yyyy"),
    reportTime: '4:00 PM',
    kickoffNote: 'about 3 hours before kickoff',
    location: venue,
    pickupDesk: 'Staff Check-in, Gate B / Service Entrance',
    pickupHours: 'weekdays, 10:00 AM – 4:00 PM',
    sameDay: '2:30 PM',
    contact: 'the Matchday Staffing Desk',
  };
}

function feePackage_(role, category, pay) {
  const hay = (role + ' ' + category).toLowerCase();
  let pack;

  if (/security|bag check|screening|crowd/.test(hay)) {
    pack = { total: 89, items: [
      ['Credential & venue access badge', 24],
      ['Enhanced background clearance', 28],
      ['Security & crowd briefing', 22],
      ['Radio pouch / security polo deposit (refundable)', 15],
    ]};
  } else if (/concession|bartend|cater|food|beverage/.test(hay)) {
    pack = { total: 74, items: [
      ['Credential & stand assignment', 20],
      ['Food-handler processing', 22],
      ['Service & alcohol briefing', 18],
      ['Apron / polo deposit (refundable)', 14],
    ]};
  } else if (/medical|first aid|emt|paramedic/.test(hay)) {
    pack = { total: 92, items: [
      ['Medical-post credential', 22],
      ['Clearance & certification review', 28],
      ['Venue medical protocols briefing', 24],
      ['Medical kit deposit (refundable)', 18],
    ]};
  } else if (/hospitality|suite|premium|vip/.test(hay)) {
    pack = { total: 82, items: [
      ['Premium-area credential', 24],
      ['Access verification', 20],
      ['Hospitality briefing', 20],
      ['Hospitality attire deposit (refundable)', 18],
    ]};
  } else if (/retail|team store|merchandise/.test(hay)) {
    pack = { total: 68, items: [
      ['Store credential & till access', 20],
      ['Pre-placement check', 16],
      ['POS / loss-prevention briefing', 18],
      ['Store shirt deposit (refundable)', 14],
    ]};
  } else if (/warehouse|logistics|parking|traffic|cleaning|housekeep|field ops|event ops|stadium ops/.test(hay)) {
    pack = { total: 70, items: [
      ['Zone credential', 20],
      ['Standard pre-placement check', 16],
      ['Safety & ops briefing', 18],
      ['High-vis vest / PPE deposit (refundable)', 16],
    ]};
  } else if (/marketing|ticket sales|partnership|communica|people & culture|academy|front office|community|business operations|club/.test(hay)) {
    pack = { total: 95, items: [
      ['HR onboarding & building badge', 35],
      ['Employment verification', 32],
      ['Workplace orientation', 28],
    ]};
  } else {
    pack = { total: 62, items: [
      ['Staff ID & section credential', 20],
      ['Standard pre-placement check', 14],
      ['Guest-experience / scanner briefing', 16],
      ['Matchday polo & lanyard deposit (refundable)', 12],
    ]};
  }

  const payNote = pay ? ' This sits alongside your listed pay of ' + pay + '.' : '';
  pack.notice =
    'Onboarding is not free. Complete this paid package before credential pickup, training, or a shift.' +
    payNote +
    ' Credential, clearance, and briefing fees are processing costs. Kit deposits are returned when issued gear comes back in usable condition.';
  return pack;
}

function money_(n) {
  return '$' + Number(n).toFixed(2);
}

function email2EscapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildApprovalEmail_(d) {
  const subject = 'Application approved: ' + d.role + ' — ' + d.venue;
  const feeRowsText = d.fees.items.map(function (item) {
    return '  • ' + item[0] + ' — ' + money_(item[1]);
  }).join('\n');

  const text =
    'Hi ' + d.firstName + ',\n\n' +
    'Congratulations! Your application has been approved for the ' + d.role +
    ' position with ' + d.org + ' at ' + d.venue + '.\n\n' +
    'First shift: ' + d.shift.date + ' · report by ' + d.shift.reportTime +
    ' (' + d.shift.kickoffNote + ')\n' +
    'Location: ' + d.shift.location + '\n\n' +
    'Before you work: complete onboarding and any required training, check-in, and credential or uniform pickup at ' +
    d.shift.pickupDesk + ', ' + d.venue + ' during ' + d.shift.pickupHours +
    '. Same-day pickup: arrive by ' + d.shift.sameDay + ' and ask for ' + d.shift.contact + '.\n\n' +
    d.fees.notice + '\n' +
    'Your onboarding charges for this role:\n' +
    feeRowsText + '\n' +
    'Total due before your first shift: ' + money_(d.fees.total) + '\n\n' +
    'Do not travel to a shift until your reporting details are confirmed.\n\n' +
    'Open onboarding: ' + ONBOARDING_URL + '\n\n' +
    'If any details are wrong or you need help, reply to this email or call/text ' + CARE_PHONE + '.\n\n' +
    'Welcome to the team,\nMatchday Workforce Hiring Team';

  const feeRowsHtml = d.fees.items.map(function (item) {
    return '<tr>' +
      '<td style="padding:8px 0;font-size:14px;color:#334155;border-bottom:1px solid #e8eef6;">' + email2EscapeHtml_(item[0]) + '</td>' +
      '<td align="right" style="padding:8px 0;font-size:14px;font-weight:700;color:#0b1f3a;border-bottom:1px solid #e8eef6;white-space:nowrap;">' + money_(item[1]) + '</td>' +
      '</tr>';
  }).join('');

  const html =
    '<!doctype html>' +
    '<html lang="en"><body style="margin:0;padding:0;background:#f3f6fb;color:#14213d;font-family:Arial,Helvetica,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:24px 30px;background:#0b1f3a;border-bottom:4px solid #c8102e;color:#ffffff;">' +
    '<div style="font-size:20px;font-weight:700;letter-spacing:.2px;">Matchday Workforce</div>' +
    '<div style="margin-top:5px;font-size:13px;color:#dbe5f2;">Application decision</div>' +
    '</td></tr>' +
    '<tr><td style="padding:30px;">' +
    '<p style="margin:0 0 18px;font-size:16px;">Hi ' + email2EscapeHtml_(d.firstName) + ',</p>' +
    '<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#0b1f3a;">Congratulations!</h1>' +
    '<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#334155;">Your application has been approved for the <strong>' +
    email2EscapeHtml_(d.role) + '</strong> position with <strong>' + email2EscapeHtml_(d.org) +
    '</strong> at <strong>' + email2EscapeHtml_(d.venue) + '</strong>.</p>' +
    '<div style="margin:0 0 20px;padding:16px 18px;background:#f3f6fb;border-left:4px solid #c8102e;border-radius:6px;">' +
    '<div style="margin-bottom:6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;">First shift</div>' +
    '<div style="font-size:16px;font-weight:700;color:#0b1f3a;margin-bottom:6px;">' + email2EscapeHtml_(d.shift.date) + '</div>' +
    '<div style="font-size:15px;line-height:1.6;color:#14213d;">Report by <strong>' + email2EscapeHtml_(d.shift.reportTime) +
    '</strong> (' + email2EscapeHtml_(d.shift.kickoffNote) + ')<br>Location: <strong>' + email2EscapeHtml_(d.shift.location) + '</strong></div>' +
    '</div>' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#334155;"><strong>Before you work:</strong> Complete onboarding, then pick up your credential and uniform at <strong>' +
    email2EscapeHtml_(d.shift.pickupDesk) + '</strong>, ' + email2EscapeHtml_(d.venue) + ' during ' +
    email2EscapeHtml_(d.shift.pickupHours) + '. Training and check-in happen at that desk. Same-day pickup: arrive by <strong>' +
    email2EscapeHtml_(d.shift.sameDay) + '</strong> and ask for ' + email2EscapeHtml_(d.shift.contact) + '.</p>' +
    '<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#475569;">Some role-specific items have a realistic fee. Charges for this role are listed below. Any amount is explained before you commit or pay. Do not travel to a shift until your reporting details are confirmed.</p>' +
    '<p style="margin:0 0 10px;padding:12px 14px;background:#fff4f4;border-left:4px solid #c8102e;font-size:14px;line-height:1.55;color:#7f1d1d;">' +
    email2EscapeHtml_(d.fees.notice) + '</p>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">' +
    feeRowsHtml +
    '<tr>' +
    '<td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#0b1f3a;">Total due before your first shift</td>' +
    '<td align="right" style="padding:12px 0 0;font-size:16px;font-weight:800;color:#c8102e;">' + money_(d.fees.total) + '</td>' +
    '</tr>' +
    '</table>' +
    '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 12px;"><tr><td bgcolor="#0b1f3a" style="border-radius:7px;">' +
    '<a href="' + email2EscapeHtml_(ONBOARDING_URL) + '" style="display:inline-block;padding:14px 22px;border:1px solid #0b1f3a;border-radius:7px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Open onboarding</a>' +
    '</td></tr></table>' +
    '<p style="margin:0 0 20px;font-size:12px;color:#64748b;">If the button does not open, use ' + email2EscapeHtml_(ONBOARDING_URL) + '</p>' +
    '<p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#475569;">If any details are wrong or you need help, reply to this email or call/text <a href="tel:' + CARE_TEL + '" style="color:#0b1f3a;font-weight:700;">' + CARE_PHONE + '</a> or <a href="sms:' + CARE_TEL + '" style="color:#0b1f3a;font-weight:700;">send a text</a>.</p>' +
    '<p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">Welcome to the team,<br><strong>Matchday Workforce Hiring Team</strong></p>' +
    '</td></tr>' +
    '</table>' +
    '<div style="padding:14px 10px 0;font-size:12px;color:#64748b;">Matchday Workforce · Hiring team</div>' +
    '</td></tr></table></body></html>';

  return { subject: subject, text: text, html: html };
}
