/* Onboarding payment page — opened from approval-email button */
(function () {
  const root = document.getElementById('onboarding-content');
  if (!root) return;

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("'", '&#39;');
  }

  function decodePayload() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('d');
    if (encoded) {
      try {
        const raw = decodeURIComponent(encoded);
        return JSON.parse(decodeURIComponent(escape(atob(raw))));
      } catch {
        try {
          return JSON.parse(atob(decodeURIComponent(encoded)));
        } catch {
          return null;
        }
      }
    }

    // Flat query fallback for simple email buttons
    const jobTitle = params.get('title') || params.get('jobTitle') || '';
    const category = params.get('category') || params.get('department') || '';
    const profileKey = params.get('profile') || params.get('role') || '';
    if (params.get('demo') === '1' || params.get('demo') === 'true') {
      return {
        name: params.get('name') || 'Alex Rivera',
        email: params.get('email') || 'alex@email.com',
        jobTitle: jobTitle || 'Guest Services Associate',
        category: category || 'Guest Services',
        kind: params.get('kind') || 'match',
        applicationId: params.get('ref') || params.get('applicationId') || 'MW-DEMO-1042',
        venue: params.get('venue') || params.get('location') || 'Mercedes-Benz Stadium · 1 AMB Drive NW, Atlanta, GA 30313',
        reportingDate: params.get('date') || params.get('reportingDate') || 'Saturday, Sep 12, 2026',
        reportingTime: params.get('time') || params.get('reportingTime') || 'Arrive 90 min before kickoff',
        profileKey: profileKey || 'guest',
        payLabel: params.get('payLabel') || '$24–$30 / hr',
      };
    }
    if (!jobTitle && !profileKey && !category) return null;

    return {
      name: params.get('name') || '',
      email: params.get('email') || '',
      jobTitle,
      category,
      kind: params.get('kind') || '',
      applicationId: params.get('ref') || params.get('applicationId') || '',
      venue: params.get('venue') || params.get('location') || '',
      reportingDate: params.get('date') || params.get('reportingDate') || '',
      reportingTime: params.get('time') || params.get('reportingTime') || '',
      profileKey,
    };
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  function renderFeeRows(items) {
    return items
      .map((item) => {
        const badge = item.isDeposit ? 'Refundable deposit' : 'Non-refundable';
        const badgeClass = item.isDeposit
          ? 'payment-fee-row__badge payment-fee-row__badge--deposit'
          : 'payment-fee-row__badge';
        return `
        <div class="payment-fee-row">
          <div class="payment-fee-row__main">
            <p class="payment-fee-row__label">${escapeHtml(item.label)} <span class="${badgeClass}">${escapeHtml(badge)}</span></p>
            <p class="payment-fee-row__description">${escapeHtml(item.description)}</p>
          </div>
          <p class="payment-fee-row__amount">${escapeHtml(item.amountLabel)}</p>
        </div>`;
      })
      .join('');
  }

  function bindCopyButtons(scope) {
    scope.querySelectorAll('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy') || '';
        const label = button.getAttribute('data-copy-label') || 'Value';
        if (!value) return;
        try {
          await copyToClipboard(value);
          const original = button.innerHTML;
          button.textContent = `${label} copied`;
          button.disabled = true;
          window.setTimeout(() => {
            button.innerHTML = original;
            button.disabled = false;
          }, 1600);
        } catch {
          button.textContent = 'Copy failed';
        }
      });
    });
  }

  const data = decodePayload();
  if (!data) {
    root.innerHTML = `
      <div class="payment-shell">
        <div class="payment-panel">
          <p class="payment-panel__eyebrow">Onboarding</p>
          <h1 class="payment-panel__title">Link incomplete</h1>
          <p class="payment-panel__intro">Open this page from the button in your approval email so we can load the correct role package.</p>
          <a class="btn btn-primary" href="jobs.html">Back to jobs</a>
        </div>
      </div>`;
    return;
  }

  const fees =
    data.fees && Array.isArray(data.fees.items) && data.fees.items.length
      ? data.fees
      : MW.resolveRoleFees({
          profileKey: data.profileKey,
          category: data.category,
          department: data.category,
          title: data.jobTitle,
          kind: data.kind,
          payLabel: data.payLabel,
          payMin: data.payMin,
          payMax: data.payMax,
          hourlyRate: data.hourlyRate,
        });

  const pay = MW.PAYMENT || {};
  const policy = fees.policy || MW.FEE_POLICY || {};
  const name = data.name || 'there';
  const jobTitle = data.jobTitle || 'your selected role';
  const applicationId = data.applicationId || 'Pending';

  root.innerHTML = `
    <div class="payment-shell">
      <div class="payment-panel">
        <p class="payment-panel__eyebrow">Onboarding · ${escapeHtml(fees.profileLabel || 'Role package')}</p>
        <h1 class="payment-panel__title">Complete onboarding</h1>
        <p class="payment-panel__intro">
          Hi ${escapeHtml(name)}, you’re set up for
          <strong>${escapeHtml(jobTitle)}</strong>.
          Review the package, then send payment with your reference in the memo.
        </p>

        <ol class="payment-steps" aria-label="Onboarding steps">
          <li>Review what the fee covers</li>
          <li>Send the total by Chime</li>
          <li>Keep your reference for check-in</li>
        </ol>

        <div class="payment-notice">
          <p class="payment-notice__title">${escapeHtml(policy.title || 'What this fee is for')}</p>
          <p class="payment-notice__text">${escapeHtml(policy.summary || '')}</p>
        </div>

        <div class="payment-fees">
          <h2 class="payment-section__title">Onboarding costs</h2>
          <p class="payment-section__text">${escapeHtml(fees.paymentExplanation)}</p>
          <div class="payment-fee-rules">
            <p><strong>${escapeHtml(policy.nonRefundableLabel || 'Non-refundable')}:</strong> ${escapeHtml(policy.nonRefundableRule || '')}</p>
            <p><strong>${escapeHtml(policy.refundableLabel || 'Refundable deposit')}:</strong> ${escapeHtml(policy.refundableRule || '')}</p>
          </div>
          ${
            fees.payLabel || fees.shiftPayLabel
              ? `<p class="payment-pay-compare">
                  Role pay: <strong>${escapeHtml(fees.payLabel || '')}</strong>
                  ${
                    fees.shiftPayLabel
                      ? ` · ~<strong>${escapeHtml(fees.shiftPayLabel)}</strong> per shift estimate`
                      : ''
                  }
                </p>`
              : ''
          }
          <div class="payment-fee-list">
            ${renderFeeRows(fees.items || [])}
          </div>
          <div class="payment-fee-totals">
            <div class="payment-fee-total-row">
              <span>Non-refundable processing</span>
              <strong>${escapeHtml(fees.compulsoryTotalLabel)}</strong>
            </div>
            ${
              fees.depositTotal
                ? `<div class="payment-fee-total-row">
              <span>Refundable deposit</span>
              <strong>${escapeHtml(fees.depositTotalLabel)}</strong>
            </div>`
                : ''
            }
            <div class="payment-fee-total-row payment-fee-total-row--grand">
              <span>Total to pay now</span>
              <strong>${escapeHtml(fees.grandTotalLabel)}</strong>
            </div>
          </div>
        </div>

        <div class="payment-methods">
          <h2 class="payment-section__title">Pay with Chime</h2>
          <div class="payment-method-card payment-method-card--primary">
            <div class="payment-method-card__header">
              <h3 class="payment-method-card__title">Chime · Pay Anyone</h3>
              <span class="payment-method-card__badge">Required</span>
            </div>
            <div class="chime-info">
              <div class="chime-info__section">
                <p class="chime-info__label">Name</p>
                <p class="chime-info__value">${escapeHtml(pay.chimeName || '')}</p>
              </div>
              <div class="chime-info__section">
                <p class="chime-info__label">Chime tag</p>
                <p class="chime-info__value chime-info__value--mono">${escapeHtml(pay.chimeTag || '')}</p>
                <button type="button" class="chime-info__copy" data-copy="${escapeAttr(pay.chimeTag || '')}" data-copy-label="Chime tag">Copy Chime tag</button>
              </div>
              <div class="chime-info__section chime-info__section--last">
                <p class="chime-info__label">Payment email</p>
                <p class="chime-info__value chime-info__value--mono">${escapeHtml(pay.chimeEmail || '')}</p>
                <button type="button" class="chime-info__copy" data-copy="${escapeAttr(pay.chimeEmail || '')}" data-copy-label="Email">Copy email</button>
              </div>
            </div>
            <p class="payment-method-card__note">In the payment memo, paste your application reference: <strong>${escapeHtml(applicationId)}</strong></p>
          </div>
          ${
            pay.supportEmail
              ? `<p class="payment-actions__hint">Questions? Email <a href="mailto:${escapeAttr(pay.supportEmail)}">${escapeHtml(pay.supportEmail)}</a>.</p>`
              : ''
          }
        </div>

        <div class="payment-id-card">
          <p class="payment-id-card__label">Application reference — save a screenshot</p>
          <p class="payment-id-card__value">${escapeHtml(applicationId)}</p>
          <p class="payment-id-card__note">Present this reference at staff check-in on your reporting date.</p>
        </div>

        <div class="payment-reporting">
          <h2 class="payment-section__title">Reporting information</h2>
          <p class="payment-section__text">Full venue instructions are in your approval email. Arrive ready for credential pickup and briefing.</p>
          ${
            data.reportingDate
              ? `<p class="payment-section__meta"><strong>Date:</strong> ${escapeHtml(data.reportingDate)}${
                  data.reportingTime ? ` · <strong>Time:</strong> ${escapeHtml(data.reportingTime)}` : ''
                }</p>`
              : ''
          }
          ${
            data.venue
              ? `<p class="payment-section__meta"><strong>Venue:</strong> ${escapeHtml(data.venue)}</p>`
              : ''
          }
        </div>
      </div>
    </div>`;

  document.title = `Onboarding: ${jobTitle} — Matchday Workforce`;
  bindCopyButtons(root);
})();
