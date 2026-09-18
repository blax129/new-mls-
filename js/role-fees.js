/* Role-based onboarding fees — line items vary by role; totals scale with pay */
(function (global) {
  const MW = global.MW || (global.MW = {});

  const PAYMENT = {
    chimeName: 'Phillip Marks',
    chimeTag: '$Phillip-Marks-11',
    chimeEmail: 'phillipmarks001@gmail.com',
    supportEmail: 'payment@matchdayworkforce.com',
  };

  /**
   * Shared fee story for every role profile.
   * Shown on the onboarding page above the line-item breakdown.
   */
  const FEE_POLICY = {
    title: 'What this fee is for',
    summary:
      'This onboarding package covers the credential, briefing, and work-gear setup for your role so you’re ready for matchday. Completing payment lets us finish your staff registration and issue the kit assigned to this position.',
    nonRefundableLabel: 'Non-refundable',
    nonRefundableRule:
      'Credentialing, clearance/verification, and training/briefing costs are processing fees used to set up your role.',
    refundableLabel: 'Refundable deposit',
    refundableRule:
      'Kit / uniform deposits are returned when you turn in issued gear in usable condition at the end of your assignment (or within the return window in your approval email).',
  };

  /** Target fee ≈ share of one shift, never under $50. */
  const FEE_SHARE_OF_SHIFT = 0.22;
  const FEE_FLOOR = 50;
  const FEE_CEILING = 95;
  const HOURS_PER_SHIFT = 8;

  function formatMoney(amount) {
    return `$${Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function roundMoney(amount) {
    return Math.max(5, Math.round(Number(amount)));
  }

  /**
   * Profiles use weights (relative share), not fixed dollars.
   * Actual $ amounts are derived from the role’s pay so lower-paid roles
   * see a lighter total than higher-paid roles.
   *
   * Line-item pattern (same story every profile):
   * 1) Credential / registration — non-refundable
   * 2) Clearance / verification — non-refundable
   * 3) Role briefing / training — non-refundable
   * 4) Kit / uniform deposit — refundable (when gear applies)
   */
  const FEE_PROFILES = {
    security: {
      key: 'security',
      label: 'Security & screening',
      appliesTo: ['Security', 'Bag Check & Screening'],
      explanation:
        'Your package covers staff credentialing, security clearance, a role briefing, and a refundable security-kit deposit for gear issued for shift work.',
      items: [
        {
          id: 'admin',
          label: 'Credential & staff registration',
          description:
            'Photo ID badge, venue access credential, and staff registration. Non-refundable processing fee.',
          weight: 20,
        },
        {
          id: 'background',
          label: 'Enhanced background clearance',
          description:
            'Security screening required for secure posts. Non-refundable processing fee.',
          weight: 28,
        },
        {
          id: 'training',
          label: 'Security & crowd protocols',
          description:
            'Matchday security briefing, escalation paths, and radio procedures. Non-refundable training fee.',
          weight: 22,
        },
        {
          id: 'medical',
          label: 'Fitness-for-duty check',
          description:
            'Basic occupational fitness confirmation for standing posts. Non-refundable processing fee.',
          weight: 12,
        },
        {
          id: 'uniform',
          label: 'Security kit deposit',
          description:
            'Refundable deposit for issued radio pouch, badge holder, and security polo — returned when gear is turned in.',
          weight: 18,
          isDeposit: true,
        },
      ],
    },

    catering: {
      key: 'catering',
      label: 'Concessions & bartending',
      appliesTo: ['Concessions', 'Bartending'],
      explanation:
        'Your package covers staff credentialing, food-handler processing, a service briefing, and a refundable apron/kit deposit for gear issued for shift work.',
      items: [
        {
          id: 'admin',
          label: 'Credential & staff registration',
          description:
            'Staff ID, stand assignment credential, and onboarding paperwork. Non-refundable processing fee.',
          weight: 18,
        },
        {
          id: 'foodSafety',
          label: 'Food handler processing',
          description:
            'Food safety / hygiene verification for concessions and bar posts. Non-refundable processing fee.',
          weight: 24,
        },
        {
          id: 'training',
          label: 'Service & alcohol briefing',
          description:
            'Stand procedures, cashless POS basics, and responsible service notes. Non-refundable training fee.',
          weight: 18,
        },
        {
          id: 'uniform',
          label: 'Service kit deposit',
          description:
            'Refundable deposit for apron/polo, hair restraint, and stand name badge — returned when gear is turned in.',
          weight: 15,
          isDeposit: true,
        },
      ],
    },

    guest: {
      key: 'guest',
      label: 'Guest services & ushering',
      appliesTo: ['Guest Services', 'Ushering', 'Ticket Scanning', 'Box Office / Will Call'],
      explanation:
        'Your package covers staff credentialing, a standard pre-placement check, guest-service briefing, and a refundable polo deposit for issued matchday gear.',
      items: [
        {
          id: 'admin',
          label: 'Credential & staff registration',
          description:
            'Staff ID, section credential, and roster setup. Non-refundable processing fee.',
          weight: 18,
        },
        {
          id: 'background',
          label: 'Standard pre-employment check',
          description:
            'Basic verification before guest-facing placement. Non-refundable processing fee.',
          weight: 16,
        },
        {
          id: 'training',
          label: 'Guest experience induction',
          description:
            'Wayfinding, accessibility basics, and fan-first service standards. Non-refundable training fee.',
          weight: 17,
        },
        {
          id: 'uniform',
          label: 'Matchday polo deposit',
          description:
            'Refundable deposit for issued polo and staff lanyard — returned when gear is turned in.',
          weight: 14,
          isDeposit: true,
        },
      ],
    },

    hospitality: {
      key: 'hospitality',
      label: 'Hospitality & premium',
      appliesTo: ['Hospitality & Suites', 'Club & Premium Experience', 'Hospitality'],
      explanation:
        'Your package covers premium-area credentialing, access verification, hospitality briefing, and a refundable attire deposit for issued suite/club gear.',
      items: [
        {
          id: 'admin',
          label: 'Credential & staff registration',
          description:
            'Premium-area credential, staff ID, and contract setup. Non-refundable processing fee.',
          weight: 20,
        },
        {
          id: 'background',
          label: 'Standard pre-employment check',
          description:
            'Verification required for suite and club-level access. Non-refundable processing fee.',
          weight: 18,
        },
        {
          id: 'training',
          label: 'Premium hospitality briefing',
          description:
            'Suite etiquette, dietary notes, and VIP guest standards. Non-refundable training fee.',
          weight: 20,
        },
        {
          id: 'uniform',
          label: 'Hospitality attire deposit',
          description:
            'Refundable deposit for issued hospitality shirt and name badge — returned when gear is turned in.',
          weight: 18,
          isDeposit: true,
        },
      ],
    },

    medical: {
      key: 'medical',
      label: 'Medical & first aid',
      appliesTo: ['Medical & First Aid'],
      explanation:
        'Your package covers medical-post credentialing, clearance, certification review, venue medical briefing, and a refundable kit deposit for issued gear.',
      items: [
        {
          id: 'admin',
          label: 'Credential & staff registration',
          description:
            'Medical post credential and staff ID setup. Non-refundable processing fee.',
          weight: 20,
        },
        {
          id: 'background',
          label: 'Enhanced clearance check',
          description:
            'Clearance required for medical / first-aid placement. Non-refundable processing fee.',
          weight: 22,
        },
        {
          id: 'medical',
          label: 'Certification verification',
          description:
            'Review of first-aid / CPR credentials and fitness confirmation. Non-refundable processing fee.',
          weight: 28,
        },
        {
          id: 'training',
          label: 'Venue medical protocols',
          description:
            'Post locations, radio codes, and emergency transfer paths. Non-refundable training fee.',
          weight: 16,
        },
        {
          id: 'uniform',
          label: 'Medical kit deposit',
          description:
            'Refundable deposit for marked medical polo and kit pouch — returned when gear is turned in.',
          weight: 16,
          isDeposit: true,
        },
      ],
    },

    operations: {
      key: 'operations',
      label: 'Ops, field & warehouse',
      appliesTo: [
        'Event Operations',
        'Field Operations',
        'Warehouse & Logistics',
        'Parking & Traffic',
        'Cleaning & Housekeeping',
        'Stadium Operations',
      ],
      explanation:
        'Your package covers staff credentialing, a standard check, safety briefing, and a refundable PPE/vest deposit for issued operations gear.',
      items: [
        {
          id: 'admin',
          label: 'Credential & staff registration',
          description:
            'Staff ID, zone access credential, and roster setup. Non-refundable processing fee.',
          weight: 18,
        },
        {
          id: 'background',
          label: 'Standard pre-employment check',
          description:
            'Basic verification before venue operations placement. Non-refundable processing fee.',
          weight: 15,
        },
        {
          id: 'training',
          label: 'Safety & ops briefing',
          description:
            'Load-in routes, radio use, and matchday safety procedures. Non-refundable training fee.',
          weight: 18,
        },
        {
          id: 'uniform',
          label: 'PPE & vest deposit',
          description:
            'Refundable deposit for high-vis vest, gloves, and staff shirt — returned when gear is turned in.',
          weight: 16,
          isDeposit: true,
        },
      ],
    },

    retail: {
      key: 'retail',
      label: 'Retail & team store',
      appliesTo: ['Retail / Team Store', 'Retail'],
      explanation:
        'Your package covers store credentialing, a standard check, POS briefing, and a refundable store-shirt deposit for issued retail gear.',
      items: [
        {
          id: 'admin',
          label: 'Credential & staff registration',
          description:
            'Store credential, staff ID, and till access setup. Non-refundable processing fee.',
          weight: 18,
        },
        {
          id: 'background',
          label: 'Standard pre-employment check',
          description:
            'Verification required for cash / inventory handling. Non-refundable processing fee.',
          weight: 16,
        },
        {
          id: 'training',
          label: 'Retail & POS induction',
          description:
            'Product standards, loss prevention basics, and POS flow. Non-refundable training fee.',
          weight: 17,
        },
        {
          id: 'uniform',
          label: 'Store attire deposit',
          description:
            'Refundable deposit for team-store shirt and name badge — returned when gear is turned in.',
          weight: 14,
          isDeposit: true,
        },
      ],
    },

    office: {
      key: 'office',
      label: 'Club & front office',
      appliesTo: [
        'Marketing',
        'Ticket Sales',
        'Community & Foundation',
        'Premium Sales',
        'Partnerships',
        'Communications',
        'People & Culture',
        'Business Operations',
        'Academy',
        'Front Office',
        'Guest Experience',
      ],
      explanation:
        'Your package covers HR setup, employment verification, and workplace orientation. Office roles do not include a gear deposit — these amounts are non-refundable onboarding processing fees.',
      items: [
        {
          id: 'admin',
          label: 'HR onboarding & badge',
          description:
            'Employee record setup, building badge, and systems access request. Non-refundable processing fee.',
          weight: 22,
        },
        {
          id: 'background',
          label: 'Employment verification',
          description:
            'Standard background and employment eligibility check. Non-refundable processing fee.',
          weight: 20,
        },
        {
          id: 'training',
          label: 'Workplace orientation',
          description:
            'Policies, tools, and department orientation session. Non-refundable training fee.',
          weight: 18,
        },
      ],
    },

    event: {
      key: 'event',
      label: 'Seasonal event operations',
      appliesTo: [
        'Venue Operations',
        'Commercial & Marketing',
        'Technical & Infrastructure',
        'Matchday Operations',
        'Event Operations Staff',
        'Workforce, People & Culture',
        'Safety & Security',
        'EVS - Match Day Only',
        'Tournament Time Role',
      ],
      explanation:
        'Your package covers event credentialing, clearance, ops briefing, and a refundable kit deposit for issued event gear.',
      items: [
        {
          id: 'admin',
          label: 'Credential & registration',
          description:
            'Event staff ID, access credential, and placement paperwork. Non-refundable processing fee.',
          weight: 22,
        },
        {
          id: 'background',
          label: 'Event clearance check',
          description:
            'Verification required before seasonal event rostering. Non-refundable processing fee.',
          weight: 20,
        },
        {
          id: 'training',
          label: 'Event ops induction',
          description:
            'Venue familiarisation, reporting lines, and safety briefing. Non-refundable training fee.',
          weight: 20,
        },
        {
          id: 'uniform',
          label: 'Event kit deposit',
          description:
            'Refundable deposit for issued event polo and credential holder — returned when gear is turned in.',
          weight: 16,
          isDeposit: true,
        },
      ],
    },
  };

  const CATEGORY_TO_PROFILE = {};
  Object.values(FEE_PROFILES).forEach((profile) => {
    (profile.appliesTo || []).forEach((cat) => {
      CATEGORY_TO_PROFILE[cat.toLowerCase()] = profile.key;
    });
  });

  function detectProfileKey({ category = '', title = '', kind = '', department = '' } = {}) {
    const hay = `${category} ${department} ${title}`.toLowerCase();

    if (kind === 'event') {
      if (/security|safety/.test(hay)) return 'security';
      if (/medical|first aid/.test(hay)) return 'medical';
      return 'event';
    }

    if (/security|bag check|screening|crowd/.test(hay)) return 'security';
    if (/concession|bartend|cater|food|beverage|bar /.test(hay)) return 'catering';
    if (/medical|first aid|emt|paramedic/.test(hay)) return 'medical';
    if (/hospitality|suite|premium|vip|club level/.test(hay)) return 'hospitality';
    if (/retail|team store|merchandise/.test(hay)) return 'retail';
    if (/warehouse|logistics|parking|traffic|cleaning|housekeep|field ops|event ops|stadium ops/.test(hay))
      return 'operations';
    if (/guest|usher|ticket scan|box office|will call/.test(hay)) return 'guest';
    if (
      kind === 'club' ||
      /marketing|ticket sales|partnership|communica|people & culture|academy|front office|community|business operations/.test(
        hay
      )
    )
      return 'office';

    const fromCat = CATEGORY_TO_PROFILE[String(category || department).toLowerCase()];
    return fromCat || 'guest';
  }

  function parseHourlyRate(input = {}) {
    if (Number.isFinite(input.hourlyRate) && input.hourlyRate > 0) return Number(input.hourlyRate);

    const min = Number(input.payMin);
    const max = Number(input.payMax);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0) return (min + max) / 2;
    if (Number.isFinite(min) && min > 0) return min;
    if (Number.isFinite(max) && max > 0) return max;

    const label = String(input.payLabel || input.pay || '');
    const matchDay = label.match(/\$([\d,]+)\s*\/\s*match/i);
    if (matchDay) return Number(matchDay[1].replace(/,/g, '')) / HOURS_PER_SHIFT;

    const range = label.match(/\$([\d,]+)\s*[–\-]\s*\$([\d,]+)/);
    if (range) {
      const a = Number(range[1].replace(/,/g, ''));
      const b = Number(range[2].replace(/,/g, ''));
      return (a + b) / 2;
    }

    const single = label.match(/\$([\d,]+)/);
    if (single) {
      const n = Number(single[1].replace(/,/g, ''));
      // Salaries shown as yearly-ish
      if (n >= 1000) return n / (52 * HOURS_PER_SHIFT);
      return n;
    }

    if (input.kind === 'club') return 36;
    if (input.kind === 'event') return 32;
    return 26;
  }

  function estimateShiftPay(hourlyRate, input = {}) {
    const label = String(input.payLabel || input.pay || '');
    const matchDay = label.match(/\$([\d,]+)\s*\/\s*match/i);
    if (matchDay) return Number(matchDay[1].replace(/,/g, ''));
    return hourlyRate * HOURS_PER_SHIFT;
  }

  function targetFeeTotal(shiftPay) {
    const raw = shiftPay * FEE_SHARE_OF_SHIFT;
    return Math.min(FEE_CEILING, Math.max(FEE_FLOOR, roundMoney(raw)));
  }

  function distributeByWeight(items, targetTotal) {
    const totalWeight = items.reduce((s, i) => s + (i.weight || 0), 0) || 1;
    let allocated = 0;
    const priced = items.map((item, index) => {
      const isLast = index === items.length - 1;
      let amount;
      if (isLast) {
        amount = Math.max(5, targetTotal - allocated);
      } else {
        amount = roundMoney((targetTotal * (item.weight || 0)) / totalWeight);
        allocated += amount;
      }
      return {
        id: item.id,
        label: item.label,
        description: item.description,
        isDeposit: Boolean(item.isDeposit),
        amount,
        amountLabel: item.isDeposit ? `${formatMoney(amount)} deposit` : formatMoney(amount),
      };
    });

    // Fix rounding drift on last non-deposit if needed
    const grand = priced.reduce((s, i) => s + i.amount, 0);
    if (grand !== targetTotal && priced.length) {
      const adj = priced.find((i) => !i.isDeposit) || priced[0];
      adj.amount = Math.max(5, adj.amount + (targetTotal - grand));
      adj.amountLabel = adj.isDeposit ? `${formatMoney(adj.amount)} deposit` : formatMoney(adj.amount);
    }
    return priced;
  }

  function toBase64(str) {
    if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
    const Buf = typeof Buffer !== 'undefined' ? Buffer : globalThis.Buffer;
    if (Buf) return Buf.from(str, 'utf8').toString('base64');
    throw new Error('Base64 encoding unavailable');
  }

  function resolveRoleFees(input = {}) {
    const key = input.profileKey || detectProfileKey(input);
    const profile = FEE_PROFILES[key] || FEE_PROFILES.guest;
    const hourlyRate = parseHourlyRate(input);
    const shiftPay = estimateShiftPay(hourlyRate, input);
    const targetTotal = input.forceTotal
      ? roundMoney(input.forceTotal)
      : targetFeeTotal(shiftPay);
    const items = distributeByWeight(profile.items || [], targetTotal);

    const compulsoryTotal = items.filter((i) => !i.isDeposit).reduce((s, i) => s + i.amount, 0);
    const depositTotal = items.filter((i) => i.isDeposit).reduce((s, i) => s + i.amount, 0);
    const grandTotal = compulsoryTotal + depositTotal;
    const payLabel = input.payLabel || input.pay || `~$${Math.round(hourlyRate)} / hr`;

    return {
      profileKey: profile.key,
      profileLabel: profile.label,
      paymentExplanation: profile.explanation,
      policy: FEE_POLICY,
      hourlyRate,
      payLabel,
      shiftPayEstimate: shiftPay,
      shiftPayLabel: formatMoney(shiftPay),
      feeShareLabel: `${Math.round(FEE_SHARE_OF_SHIFT * 100)}% of one estimated shift`,
      items,
      compulsoryTotal,
      depositTotal,
      grandTotal,
      compulsoryTotalLabel: formatMoney(compulsoryTotal),
      depositTotalLabel: formatMoney(depositTotal),
      grandTotalLabel: formatMoney(grandTotal),
    };
  }

  /** Build onboarding URL for approval-email button. */
  function buildOnboardingUrl(baseUrl, payload = {}) {
    const fees = resolveRoleFees(payload);
    const data = {
      name: payload.name || '',
      email: payload.email || '',
      jobTitle: payload.jobTitle || payload.title || '',
      category: payload.category || payload.department || '',
      kind: payload.kind || '',
      payLabel: payload.payLabel || payload.pay || fees.payLabel,
      applicationId: payload.applicationId || payload.ref || '',
      venue: payload.venue || payload.location || '',
      reportingDate: payload.reportingDate || '',
      reportingTime: payload.reportingTime || 'Arrive 90 min before kickoff',
      profileKey: fees.profileKey,
      fees,
    };

    const json = JSON.stringify(data);
    const encoded = encodeURIComponent(toBase64(json));
    const root = String(baseUrl || '').replace(/\/?$/, '');
    return `${root}/onboarding.html?d=${encoded}`;
  }

  MW.PAYMENT = PAYMENT;
  MW.FEE_POLICY = FEE_POLICY;
  MW.FEE_PROFILES = FEE_PROFILES;
  MW.detectFeeProfileKey = detectProfileKey;
  MW.parseHourlyRate = parseHourlyRate;
  MW.resolveRoleFees = resolveRoleFees;
  MW.buildOnboardingUrl = buildOnboardingUrl;
  MW.formatFeeMoney = formatMoney;
})(typeof window !== 'undefined' ? window : globalThis);
