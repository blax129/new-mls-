/* Render fee details passed by the approval email. */
(function () {
  const root = document.getElementById('onboarding-content');
  if (!root) return;

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function decodePayload() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('d');
    if (encoded) {
      try {
        const binary = atob(encoded);
        const utf8 = Array.from(binary, (character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`
        ).join('');
        return JSON.parse(decodeURIComponent(utf8));
      } catch {
        return null;
      }
    }

    const role = (params.get('role') || '').trim();
    const applicationId = (params.get('id') || params.get('ref') || '').trim();
    if (!role && !applicationId) return null;

    return {
      role,
      applicationId,
      category: (params.get('cat') || params.get('category') || '').trim(),
      pay: (params.get('pay') || params.get('payLabel') || '').trim(),
      reporting: {
        date: (params.get('date') || '').trim(),
        time: (params.get('time') || '').trim(),
        venue: (params.get('venue') || '').trim(),
      },
    };
  }

  function feesFromPayload(data) {
    const fees = data && data.fees;
    const items = fees && Array.isArray(fees.items) ? fees.items : [];
    const totalCents = fees ? cents(fees.total) : null;
    const amounts = items.map((item) => item && cents(item.amount));
    const lineTotal = amounts.every((amount) => amount !== null)
      ? amounts.reduce((sum, amount) => sum + amount, 0)
      : null;

    if (
      items.length &&
      items.every((item) => item && typeof item.label === 'string' && item.label.trim()) &&
      totalCents !== null &&
      lineTotal === totalCents
    ) {
      return fees;
    }

    const resolve = window.MW && typeof window.MW.resolveRoleFees === 'function'
      ? window.MW.resolveRoleFees
      : null;
    if (!resolve || !data) return null;

    const resolved = resolve({
      title: data.role || data.jobTitle || '',
      category: data.category || '',
      payLabel: data.pay || data.payLabel || '',
      kind: data.kind || '',
    });
    const format = window.MW.formatFeeMoney || ((n) => `$${Number(n).toFixed(2)}`);
    return {
      items: (resolved.items || []).map((item) => ({
        label: item.label,
        amount: format(item.amount),
        isDeposit: Boolean(item.isDeposit),
      })),
      total: resolved.grandTotalLabel || format(resolved.grandTotal),
    };
  }

  function cents(value) {
    const match = /^\$(\d+)(?:\.(\d{2}))?$/.exec(String(value));
    return match ? Number(match[1]) * 100 + Number(match[2] || 0) : null;
  }

  const data = decodePayload();
  const applicantRole = document.getElementById('onboarding-applicant-role');
  if (applicantRole) {
    applicantRole.textContent = data && typeof data.role === 'string' && data.role.trim()
      ? data.role.trim()
      : 'See your approval email';
  }
  const applicationId = document.getElementById('onboarding-application-id');
  if (applicationId) {
    applicationId.textContent = data && typeof data.applicationId === 'string' && data.applicationId.trim()
      ? data.applicationId.trim()
      : 'See your approval email';
  }
  const reportingSection = document.getElementById('onboarding-reporting');
  const reporting = data && data.reporting && typeof data.reporting === 'object' ? data.reporting : {};
  const reportingFields = [
    ['date', 'onboarding-reporting-date-row', 'onboarding-reporting-date'],
    ['time', 'onboarding-reporting-time-row', 'onboarding-reporting-time'],
    ['instructions', 'onboarding-reporting-instructions-row', 'onboarding-reporting-instructions'],
    ['venue', 'onboarding-reporting-venue-row', 'onboarding-reporting-venue']
  ];
  let hasReportingInfo = false;
  reportingFields.forEach(([key, rowId, valueId]) => {
    const value = typeof reporting[key] === 'string' ? reporting[key].trim() : '';
    const row = document.getElementById(rowId);
    const target = document.getElementById(valueId);
    if (row && target && value) {
      target.textContent = value;
      row.hidden = false;
      hasReportingInfo = true;
    }
  });
  if (reportingSection) reportingSection.hidden = !hasReportingInfo;
  const fees = feesFromPayload(data);
  const items = fees && Array.isArray(fees.items) ? fees.items : [];

  if (
    !items.length ||
    items.some((item) => typeof item.label !== 'string' || !item.label.trim()) ||
    !fees.total
  ) {
    root.innerHTML = '<p class="onboarding-fees__unavailable">Fee breakdown unavailable. Please refer to the itemized amounts in your approval email.</p>';
    return;
  }

  const rows = items.map((item) => `
    <div class="onboarding-fee-row">
      <p class="onboarding-fee-row__label">
        ${escapeHtml(item.label)}
        ${item.isDeposit ? '<span class="onboarding-fee-row__badge">Refundable deposit</span>' : ''}
      </p>
      <p class="onboarding-fee-row__amount">${escapeHtml(item.amount)}</p>
    </div>`).join('');
  const depositItems = items.filter((item) => item.isDeposit === true);
  const depositCents = depositItems.reduce((sum, item) => sum + cents(item.amount), 0);
  const depositNote = depositCents > 0
    ? `${escapeHtml(`$${(depositCents / 100).toFixed(2)}`)} refundable for ${escapeHtml(depositItems.map((item) => item.label).join(', '))}. Returned when issued gear is returned in usable condition, subject to your approval email.`
    : 'No refundable deposit is listed for this role.';
  const payment = window.MW && window.MW.PAYMENT ? window.MW.PAYMENT : {};
  const chimeValues = [
    ['Recipient name', payment.chimeName],
    ['Chime tag', payment.chimeTag],
    ['Payment email', payment.chimeEmail]
  ];
  const hasCompleteChimeDetails = chimeValues.every(([, value]) => typeof value === 'string' && value.trim());
  const chimeDetails = hasCompleteChimeDetails
    ? `<dl class="onboarding-chime-details__list">${chimeValues.map(([label, value]) => `
        <div class="onboarding-chime-details__row">
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value.trim())}</dd>
          </div>
          <button type="button" class="onboarding-chime-details__copy" data-copy="${escapeHtml(value.trim())}" aria-label="Copy ${escapeHtml(label)}">Copy</button>
        </div>`).join('')}
      </dl>`
    : '<p class="onboarding-chime-details__notice">Chime payment details are not fully configured. Confirm the recipient name, Chime tag, and payment email with the hiring team before sending money.</p>';

  root.innerHTML = `
    <section class="onboarding-payment-summary" aria-labelledby="onboarding-payment-summary-title">
      <p class="onboarding-eyebrow">Payment summary</p>
      <h2 id="onboarding-payment-summary-title">Amount and fee type</h2>
      <dl class="onboarding-payment-summary__list">
        <div>
          <dt>Total due</dt>
          <dd>${escapeHtml(fees.total)}</dd>
        </div>
        <div>
          <dt>Fee type</dt>
          <dd>${depositCents > 0 ? 'Role-specific processing fees and refundable deposit' : 'Role-specific processing fees; no refundable deposit'}</dd>
        </div>
        <div>
          <dt>Deposit note</dt>
          <dd>${depositNote}</dd>
        </div>
      </dl>
    </section>
    <section class="onboarding-methods" aria-labelledby="onboarding-methods-title">
      <p class="onboarding-eyebrow">How would you like to pay?</p>
      <h2 id="onboarding-methods-title">Payment method</h2>
      <fieldset class="onboarding-methods__choices">
        <legend class="visually-hidden">Choose a payment method</legend>
        <label class="onboarding-method-option is-selected">
          <input type="radio" name="onboarding-payment-method" value="chime" checked>
          <span class="onboarding-method-option__content"><strong>Chime</strong><small>Pay with Chime</small></span>
        </label>
        <label class="onboarding-method-option">
          <input type="radio" name="onboarding-payment-method" value="card">
          <span class="onboarding-method-option__content"><strong>Card</strong><small>Debit or credit card</small></span>
        </label>
      </fieldset>
      <div class="onboarding-chime-details" id="onboarding-chime-details" aria-live="polite">${chimeDetails}</div>
      <div class="onboarding-methods__message" id="onboarding-method-message" aria-live="polite">Use only the Chime recipient and instructions confirmed by the hiring team. If payment details are not in your approval email, contact the team before sending money.</div>
      <section class="onboarding-chime-guide" id="onboarding-chime-guide" aria-labelledby="onboarding-chime-guide-title">
        <h3 id="onboarding-chime-guide-title">Before using Chime</h3>
        <ol>
          <li>Verify the job and any requested charge directly with the organization using contact details from its official website.</li>
          <li>Confirm the recipient and exact amount with the hiring team. If anything is missing or does not match, do not send money.</li>
          <li>Chime warns that Pay Anyone payments to another Chime member are instant and irreversible, and says Chime will never ask you to send money through Pay Anyone.</li>
        </ol>
        <p>Download Chime only from its official app store listing:</p>
        <div class="onboarding-chime-guide__links">
          <a href="https://apps.apple.com/us/app/chime-mobile-banking/id836215269" target="_blank" rel="noopener noreferrer">Chime for iPhone</a>
          <a href="https://play.google.com/store/apps/details?id=com.onedebit.chime" target="_blank" rel="noopener noreferrer">Chime for Android</a>
        </div>
      </section>
    </section>
    <section class="onboarding-fees" aria-labelledby="onboarding-fees-title">
      <p class="onboarding-eyebrow">Role-specific costs</p>
      <h2 id="onboarding-fees-title">Fee breakdown</h2>
      <p class="onboarding-fees__intro">${escapeHtml(data.role || 'Your approved role')} · Details from your approval email</p>
      <div class="onboarding-fees__list">${rows}</div>
      <div class="onboarding-fees__total">
        <span>Total</span>
        <strong>${escapeHtml(fees.total)}</strong>
      </div>
    </section>`;

  const methodMessage = document.getElementById('onboarding-method-message');
  const chimeDetailsSection = document.getElementById('onboarding-chime-details');
  const chimeGuide = document.getElementById('onboarding-chime-guide');
  root.querySelectorAll('input[name="onboarding-payment-method"]').forEach((input) => {
    input.addEventListener('change', () => {
      root.querySelectorAll('.onboarding-method-option').forEach((option) => {
        option.classList.toggle('is-selected', option.contains(input) && input.checked);
      });
      if (!methodMessage) return;
      if (chimeDetailsSection) chimeDetailsSection.hidden = input.value !== 'chime';
      if (chimeGuide) chimeGuide.hidden = input.value !== 'chime';
      methodMessage.classList.toggle('is-maintenance', input.value === 'card');
      methodMessage.textContent = input.value === 'card'
        ? 'Card payments are under maintenance right now. Please choose Chime or contact the hiring team for help.'
        : 'Use only the Chime recipient and instructions confirmed by the hiring team. If payment details are not in your approval email, contact the team before sending money.';
    });
  });

  root.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy') || '';
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = 'Copied';
        button.disabled = true;
        window.setTimeout(() => {
          button.textContent = 'Copy';
          button.disabled = false;
        }, 1600);
      } catch {
        button.textContent = 'Copy failed';
      }
    });
  });
})();
