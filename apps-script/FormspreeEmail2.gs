// Install once under the account that owns the verified hiring alias.
function installFormspreeEmail2() {
  const from = 'hiring@matchdayworkforce.com';
  if (!GmailApp.getAliases().includes(from)) throw Error('Verify the hiring sender first.');
  const store = PropertiesService.getScriptProperties();
  if (!store.getProperty('email2Start')) store.setProperty('email2Start', String(Date.now()));
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'processFormspreeEmail2')) {
    ScriptApp.newTrigger('processFormspreeEmail2').timeBased().everyMinutes(15).create();
  }
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
    if (trigger.getHandlerFunction() === 'checkEmail2Test') ScriptApp.deleteTrigger(trigger);
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
    const normalCutoff = now - 5 * 3600000;
    const cutoff = testing ? now - 5 * 60000 : normalCutoff;
    const cursor = Number(store.getProperty('email2Cursor') || start);
    if (cutoff < cursor) return;
    const query = 'from:noreply@formspree.io subject:"Matchday Workforce" after:' +
      (Math.floor(cursor / 1000) - 1) + ' before:' + (Math.ceil(cutoff / 1000) + 1);
    for (let offset = 0; ; offset += 50) {
      const threads = GmailApp.search(query, offset, 50);
      for (const thread of threads) {
        for (const msg of thread.getMessages()) {
          const when = msg.getDate().getTime();
          if (when < cursor || when > cutoff) continue;
          if (when > normalCutoff && (!testing || when < testStart)) continue;
          const role = /^Matchday Workforce · (?:Club|Matchday|Event ops) Application: (.+)$/.exec(msg.getSubject());
          if (!role || !/^(?:Formspree\s*<noreply@formspree\.io>|noreply@formspree\.io)$/i.test(msg.getFrom())) continue;
          const auth = msg.getHeader('Authentication-Results');
          if (!/dkim=pass[^;]*header\.[id]=@?(?:[\w-]+\.)*formspree\.io\b/i.test(auth)) continue;
          const recipient = msg.getReplyTo().trim().replace(/^[^<>]*<([^<>]+)>$/, '$1');
          if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient) || /@formspree\.io$/i.test(recipient)) throw Error('Missing applicant reply address: ' + msg.getId());
          const key = 'email2Message:' + msg.getId();
          const prior = store.getProperty(key);
          if (prior === 'pending') throw Error('Check Sent before retrying message ' + msg.getId());
          if (prior) continue;
          store.setProperty(key, 'pending');
          GmailApp.sendEmail(recipient, 'Application approved: ' + role[1],
            'Congratulations! Your application for ' + role[1] + ' has been approved. Please reply to this email for onboarding details before travelling to a venue.\n\nMatchday Workforce Hiring Team',
            {from: 'hiring@matchdayworkforce.com', name: 'Matchday Workforce Hiring Team'});
          store.setProperty(key, String(when));
        }
      }
      if (threads.length < 50) break;
    }
    store.setProperty('email2Cursor', String(Math.max(cursor, normalCutoff + 1)));
    for (const key of Object.keys(store.getProperties())) {
      if (key.startsWith('email2Message:') && Number(store.getProperty(key)) <= normalCutoff) store.deleteProperty(key);
    }
  } finally {
    lock.releaseLock();
  }
}
