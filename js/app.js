/* Matchday Workforce — shared UI helpers */
(function () {
  const params = new URLSearchParams(window.location.search);
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdavpbew';
  const EMAILJS_SERVICE_ID = 'service_qqu6dlk';
  const EMAILJS_TEMPLATE_ID = 'template_som7doc';
  const EMAILJS_PUBLIC_KEY = 'h_8DZt_Ej5jOjpLXm';

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return [...root.querySelectorAll(sel)];
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function monthDay(iso) {
    const d = new Date(iso + 'T12:00:00');
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: String(d.getDate()),
    };
  }

  function stadiumImageURL(stadium) {
    if (!stadium?.image) return '';
    return stadium.image
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
  }

  function ensureEventJobs() {
    if (Array.isArray(MW.eventJobs)) return Promise.resolve(MW.eventJobs);
    if (MW._eventJobsPromise) return MW._eventJobsPromise;
    MW._eventJobsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/event-jobs.js';
      s.async = true;
      s.dataset.eventJobs = '1';
      s.onload = () => resolve(MW.eventJobs || []);
      s.onerror = () => reject(new Error('Failed to load event roles'));
      document.head.appendChild(s);
    });
    return MW._eventJobsPromise;
  }

  function showToast(message) {
    let el = qs('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function setActiveNav() {
    const path = location.pathname.split('/').pop() || 'index.html';
    qsa('.nav-links a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  function initWeAreSlideshow() {
    /* Homepage slideshow is parked in index.html (restore:start we-are-slideshow). */
    const root = qs('#we-are-slideshow');
    if (!root) return;
    const slides = qsa('.multi-slide', root);
    const dots = qsa('.multi-dots button', root);
    if (slides.length < 2) return;

    let index = 0;
    let timer;

    const show = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((slide, n) => slide.classList.toggle('is-active', n === index));
      dots.forEach((dot, n) => dot.classList.toggle('is-active', n === index));
    };

    const next = () => show(index + 1);

    const start = () => {
      clearInterval(timer);
      timer = setInterval(next, 2000);
    };

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        show(Number(dot.dataset.slide) || 0);
        start();
      });
    });

    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', start);

    show(0);
    start();
  }

  function initValuesTrack() {
    const track = qs('#values-track');
    if (!track) return;
    let down = false;
    let startX = 0;
    let scrollLeft = 0;
    track.addEventListener('pointerdown', (e) => {
      down = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointerup', () => { down = false; });
    track.addEventListener('pointerleave', () => { down = false; });
    track.addEventListener('pointermove', (e) => {
      if (!down) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      track.scrollLeft = scrollLeft - (x - startX);
    });
  }

  function initNav() {
    const nav = qs('.site-nav');
    const toggle = qs('.nav-toggle');
    const links = qs('.nav-links');

    if (nav) {
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 860) {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    setActiveNav();
  }

  function initFooterDrops() {
    const drops = qsa('.footer-drop');
    if (!drops.length) return;
    drops.forEach((drop) => {
      drop.addEventListener('toggle', () => {
        if (!drop.open) return;
        drops.forEach((other) => {
          if (other !== drop) other.open = false;
        });
      });
    });
  }

  function initFloatingJobsCta() {
    const heroBtn = qs('#hero-search-jobs');
    const floatBtn = qs('#floating-search-jobs');
    if (!heroBtn || !floatBtn) return;

    const setVisible = (visible) => {
      floatBtn.classList.toggle('is-visible', visible);
      floatBtn.setAttribute('aria-hidden', visible ? 'false' : 'true');
      floatBtn.tabIndex = visible ? 0 : -1;
    };

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(heroBtn);
    setVisible(false);
  }

  function jobRowHTML(job) {
    const s = job.stadium;
    const badgeClass =
      job.status === 'Open' ? 'badge-open' : job.status === 'Hiring soon' ? 'badge-event' : 'badge-closed';
    return `
      <a class="job-row" href="job.html?id=${job.id}">
        <div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.35rem">
            <h3>${job.title}</h3>
            <span class="badge ${badgeClass}">${job.status}</span>
            ${job.urgent ? '<span class="badge badge-urgent">Urgent</span>' : ''}
          </div>
          <div class="job-meta">
            <span>${s.name}</span>
            <span>${s.city}, ${s.state}</span>
            <span>${job.category}</span>
            <span>${job.type}</span>
            <span>Apply by ${formatDate(job.deadline)}</span>
          </div>
        </div>
        <div class="pay">${job.payLabel}</div>
      </a>
    `;
  }

  function eventItemHTML(evt) {
    const s = MW.getStadium(evt.stadiumId);
    const md = monthDay(evt.date);
    return `
      <article class="event-item">
        <div class="event-date">
          <div class="month">${md.month}</div>
          <div class="day">${md.day}</div>
        </div>
        <div>
          <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:0.25rem">${evt.title}</h3>
          <div class="job-meta">
            <span>${s.name} · ${s.city}</span>
            <span>${evt.time}</span>
            <span>${evt.roles.join(', ')}</span>
          </div>
        </div>
        <a class="btn btn-secondary btn-sm" href="events.html?id=${evt.id}">Details</a>
      </article>
    `;
  }

  function stadiumTileHTML(s) {
    const openCount = MW.jobs.filter((j) => j.stadiumId === s.id && j.status === 'Open').length;
    return `
      <a class="stadium-tile" href="stadium.html?id=${s.id}">
        <h3>${s.name}</h3>
        <p>${s.city}, ${s.state} · ${openCount} open roles</p>
      </a>
    `;
  }

  function filterJobs(filters = {}) {
    return MW.enrichedJobs()
      .filter((job) => {
        if (filters.q) {
          const hay = `${job.title} ${job.category} ${job.stadium.name} ${job.stadium.city} ${job.stadium.club}`.toLowerCase();
          if (!hay.includes(filters.q.toLowerCase())) return false;
        }
        if (filters.city && job.stadium.city !== filters.city) return false;
        if (filters.club && job.stadium.club !== filters.club) return false;
        if (filters.stadium && job.stadiumId !== filters.stadium) return false;
        if (filters.category && job.category !== filters.category) return false;
        if (filters.type && job.type !== filters.type) return false;
        if (filters.payMin && job.payMax < Number(filters.payMin)) return false;
        if (filters.status && job.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  function renderHome() {
    const featured = qs('#featured-jobs');
    const events = qs('#upcoming-events');
    const stadiums = qs('#stadium-strip');
    if (featured) {
      featured.innerHTML = MW.enrichedJobs()
        .filter((j) => j.status === 'Open')
        .slice(0, 4)
        .map(jobRowHTML)
        .join('');
    }
    if (events) {
      events.innerHTML = MW.upcomingEvents().slice(0, 3).map(eventItemHTML).join('');
    }
    if (stadiums) {
      stadiums.innerHTML = MW.stadiums.map(stadiumTileHTML).join('');
    }

    const form = qs('#hero-search');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = qs('#search-q')?.value || '';
        const city = qs('#search-city')?.value || '';
        const role = qs('#search-role')?.value || '';
        const url = new URL('jobs.html', location.href);
        if (q) url.searchParams.set('q', q);
        if (city) url.searchParams.set('city', city);
        if (role) url.searchParams.set('category', role);
        location.href = url.toString();
      });
    }
  }

  function renderJobsPage() {
    const form = qs('#filters-form');
    const fixturesList = qs('#fixtures-list');
    const clubList = qs('#club-jobs-list');
    const eventList = qs('#event-jobs-list');
    if (!form || (!fixturesList && !clubList && !eventList)) return;

    const fixturesView = qs('#fixtures-view');
    const rolesView = qs('#match-roles-view');
    const matchHero = qs('#match-hero');
    const rolesList = qs('#match-roles-list');
    const fixturesCount = qs('#fixtures-count');
    const rolesCount = qs('#roles-count');
    const clubCount = qs('#club-jobs-count');
    const eventCount = qs('#event-jobs-count');
    const matchdayPanel = qs('#matchday-panel');
    const clubPanel = qs('#club-panel');
    const eventsPanel = qs('#events-panel');
    const citySel = qs('#filter-city');
    const clubSel = qs('#filter-club');
    const stadiumSel = qs('#filter-stadium');
    const categorySel = qs('#filter-category');
    const monthGroup = qs('#filter-month')?.closest('.filter-group');
    const clubGroup = clubSel?.closest('.filter-group');
    const stadiumGroup = stadiumSel?.closest('.filter-group');
    const filterPanel = qs('#filter-panel');
    const filterToggle = qs('#filter-toggle');
    const filterCount = qs('#filter-active-count');
    const clearBtn = qs('#clear-filters');

    const MLS_CATEGORY_OPTIONS = categorySel
      ? [...categorySel.querySelectorAll('option')].map((o) => ({ value: o.value, label: o.textContent }))
      : [];

    let activeTab =
      params.get('tab') === 'club' ? 'club' : params.get('tab') === 'events' ? 'events' : 'matchday';
    let selectedMatchId = params.get('match') || '';
    let eventKind = 'all';
    let eventQuery = '';
    let eventReady = Array.isArray(MW.eventJobs);

    const filters = () =>
      form ? Object.fromEntries(new FormData(form).entries()) : Object.fromEntries(params.entries());

    const activeFilterCount = () =>
      ['city', 'club', 'stadium', 'month', 'category'].reduce((n, key) => {
        const el = form.elements[key];
        return n + (el && el.value ? 1 : 0);
      }, 0);

    const syncFilterChrome = () => {
      const n = activeFilterCount();
      if (filterCount) {
        filterCount.textContent = String(n);
        filterCount.hidden = n === 0;
      }
      if (clearBtn) clearBtn.disabled = n === 0;
      if (filterToggle) {
        filterToggle.setAttribute(
          'aria-expanded',
          filterPanel && !filterPanel.classList.contains('is-collapsed') ? 'true' : 'false'
        );
      }
    };

    const stadiumsFor = (cityFilter = '', clubFilter = '') =>
      MW.stadiums.filter((s) => {
        if (cityFilter && s.city !== cityFilter) return false;
        if (clubFilter && s.club !== clubFilter) return false;
        return true;
      });

    const populateClubOptions = (cityFilter = citySel?.value || '') => {
      if (!clubSel) return;
      const selected = clubSel.value;
      clubSel.innerHTML = '<option value="">Any club</option>';
      [...new Set(stadiumsFor(cityFilter).map((s) => s.club))]
        .sort((a, b) => a.localeCompare(b))
        .forEach((club) => {
          clubSel.insertAdjacentHTML('beforeend', `<option value="${club}">${club}</option>`);
        });
      if ([...clubSel.options].some((o) => o.value === selected)) clubSel.value = selected;
    };

    const populateStadiumOptions = (
      cityFilter = citySel?.value || '',
      clubFilter = clubSel?.value || ''
    ) => {
      if (!stadiumSel) return;
      const selected = stadiumSel.value;
      stadiumSel.innerHTML = '<option value="">Any stadium</option>';
      stadiumsFor(cityFilter, clubFilter)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((s) => {
          stadiumSel.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.name}</option>`);
        });
      if ([...stadiumSel.options].some((o) => o.value === selected)) stadiumSel.value = selected;
    };

    const populateMlsCities = () => {
      if (!citySel) return;
      const selected = citySel.value;
      citySel.innerHTML = '<option value="">Any city</option>';
      MW.marketRegions.forEach((region) => {
        const options = region.cities
          .map((c) => `<option value="${c.city}">${c.city}, ${c.state}</option>`)
          .join('');
        citySel.insertAdjacentHTML('beforeend', `<optgroup label="${region.label}">${options}</optgroup>`);
      });
      if ([...citySel.options].some((o) => o.value === selected)) citySel.value = selected;
    };

    const populateEventCities = () => {
      if (!citySel) return;
      const selected = citySel.value;
      citySel.innerHTML = '<option value="">Any city</option>';
      [...new Set((MW.eventJobs || []).map((j) => j.city).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .forEach((city) => {
          citySel.insertAdjacentHTML('beforeend', `<option value="${city}">${city}</option>`);
        });
      if ([...citySel.options].some((o) => o.value === selected)) citySel.value = selected;
    };

    const populateCategoryOptions = () => {
      if (!categorySel) return;
      const selected = categorySel.value;
      if (activeTab === 'events') {
        categorySel.innerHTML = '<option value="">Any department</option>';
        [...new Set((MW.eventJobs || []).map((j) => j.department).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b))
          .forEach((dept) => {
            categorySel.insertAdjacentHTML('beforeend', `<option value="${dept}">${dept}</option>`);
          });
        const label = categorySel.previousElementSibling;
        if (label && label.tagName === 'LABEL') label.textContent = 'Department';
      } else {
        categorySel.innerHTML = MLS_CATEGORY_OPTIONS.map(
          (o) => `<option value="${o.value}">${o.label}</option>`
        ).join('');
        const label = categorySel.previousElementSibling;
        if (label && label.tagName === 'LABEL') label.textContent = 'Role category';
      }
      if ([...categorySel.options].some((o) => o.value === selected)) categorySel.value = selected;
      else categorySel.value = '';
    };

    const syncFilterVisibility = () => {
      const events = activeTab === 'events';
      if (clubGroup) clubGroup.hidden = events;
      if (stadiumGroup) stadiumGroup.hidden = events;
      if (monthGroup) monthGroup.hidden = events;
      if (events) {
        if (clubSel) clubSel.value = '';
        if (stadiumSel) stadiumSel.value = '';
        const monthSel = form.elements.month;
        if (monthSel) monthSel.value = '';
      }
    };

    const refreshLocationFilters = () => {
      if (activeTab === 'events') {
        populateEventCities();
      } else {
        populateMlsCities();
        populateClubOptions();
        populateStadiumOptions();
      }
      populateCategoryOptions();
      syncFilterVisibility();
    };

    const setUrl = () => {
      const f = filters();
      const url = new URL(location.href);
      ['city', 'club', 'stadium', 'month', 'category'].forEach((key) => {
        if (f[key]) url.searchParams.set(key, f[key]);
        else url.searchParams.delete(key);
      });
      if (activeTab === 'club' || activeTab === 'events') url.searchParams.set('tab', activeTab);
      else url.searchParams.delete('tab');
      if (selectedMatchId && activeTab === 'matchday') url.searchParams.set('match', selectedMatchId);
      else url.searchParams.delete('match');
      history.replaceState({}, '', url);
    };

    const filterFixtures = (f) =>
      MW.enrichedFixtures().filter((fx) => {
        const s = fx.stadium;
        if (!s) return false;
        if (f.city && s.city !== f.city) return false;
        if (f.club && s.club !== f.club && fx.home !== f.club && fx.away !== f.club) return false;
        if (f.stadium && fx.stadiumId !== f.stadium) return false;
        if (f.month && !fx.date.startsWith(f.month)) return false;
        return true;
      });

    const filterClubJobs = (f) =>
      (MW.clubJobs || []).filter((job) => {
        if (f.city && job.city !== f.city) return false;
        if (f.club && job.club !== f.club) return false;
        if (f.stadium) {
          const home = MW.stadiums.find((s) => s.id === f.stadium);
          if (home && job.club !== home.club) return false;
        }
        return true;
      });

    const filterEventJobs = (f) =>
      (MW.eventJobs || []).filter((job) => {
        if (f.city && job.city !== f.city) return false;
        if (f.category && job.department !== f.category) return false;
        if (eventKind === 'matchday' && !job.matchDay) return false;
        if (eventKind === 'seasonal' && job.matchDay) return false;
        if (eventQuery) {
          const hay = `${job.title} ${job.department} ${job.location} ${job.city}`.toLowerCase();
          if (!hay.includes(eventQuery)) return false;
        }
        return true;
      });

    const filterMatchRoles = (f) =>
      (MW.matchRoles || []).filter((role) => {
        if (f.category && role.category !== f.category) return false;
        return true;
      });

    const fixtureCardHTML = (fx, index) => {
      const s = fx.stadium;
      const md = monthDay(fx.date);
      const img = stadiumImageURL(s);
      const openRoles = typeof MW.openMatchRoleCount === 'function' ? MW.openMatchRoleCount(fx.id) : fx.openings;
      return `
        <button type="button" class="fixture-card${img ? ' has-photo' : ''}" data-match-id="${fx.id}" style="--i:${index}">
          ${img ? `<img class="fixture-bg" src="${img}" alt="" loading="lazy" decoding="async" />` : ''}
          <div class="fixture-date">
            <span class="month">${md.month}</span>
            <span class="day">${md.day}</span>
          </div>
          <div class="fixture-body">
            <p class="fixture-match">${fx.home} <span>vs</span> ${fx.away}</p>
            <p class="fixture-meta">${fx.time} · ${s.name}, ${s.city}</p>
            <p class="fixture-openings">${openRoles} role${openRoles === 1 ? '' : 's'} hiring</p>
          </div>
          <span class="fixture-cta btn btn-primary btn-sm">View roles</span>
        </button>
      `;
    };

    const roleCardHTML = (role, fixture) => {
      const remaining =
        typeof MW.remainingMatchRoleSlots === 'function'
          ? MW.remainingMatchRoleSlots(fixture.id, role.id)
          : role.slots;
      const filled = remaining <= 0;
      return `
      <article class="role-card${filled ? ' is-filled' : ''}">
        <div class="role-card-main">
          <h3>${role.title}</h3>
          <p class="role-card-meta">${role.category} · ${role.type} · ${fixture.stadium.name}</p>
          <p class="role-card-slots">${filled ? 'Filled' : `${remaining} spot${remaining === 1 ? '' : 's'} left`} · ${role.payLabel}</p>
        </div>
        ${
          filled
            ? `<span class="btn btn-secondary btn-sm" aria-disabled="true">Filled</span>`
            : `<a class="btn btn-primary btn-sm" href="job.html?match=${encodeURIComponent(fixture.id)}&role=${encodeURIComponent(role.id)}">View</a>`
        }
      </article>
    `;
    };
    const clubJobCardHTML = (job, index) => {
      const logo = MW.clubLogo(job.club);
      const mark = logo
        ? `<img class="club-job-mark club-job-logo" src="${logo}" alt="${job.club}" loading="lazy" decoding="async" />`
        : `<div class="club-job-mark" aria-hidden="true">${MW.clubInitials(job.club)}</div>`;
      const remaining =
        typeof MW.remainingSlotsForOpening === 'function'
          ? MW.remainingSlotsForOpening({ kind: 'club', clubJobId: job.id })
          : MW.DEFAULT_CLUB_SLOTS;
      const filled = remaining <= 0;
      return `
      <article class="club-job-card${filled ? ' is-filled' : ''}" style="--i:${index}">
        ${mark}
        <div class="club-job-main">
          <h3>${job.title}</h3>
          <p class="club-job-org">${job.club}</p>
          <p class="club-job-loc">${job.city} · ${job.state}</p>
          <p class="club-job-level">${filled ? 'Filled' : `${remaining} spot${remaining === 1 ? '' : 's'} left`} · ${job.level || job.type}</p>
        </div>
        ${
          filled
            ? `<span class="club-job-view" aria-disabled="true"><span>Filled</span></span>`
            : `<a class="club-job-view" href="job.html?clubJob=${encodeURIComponent(job.id)}">
          <span>View</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>`
        }
      </article>
    `;
    };

    const eventJobCardHTML = (job, index) => {
      const remaining =
        typeof MW.remainingSlotsForOpening === 'function'
          ? MW.remainingSlotsForOpening({ kind: 'event', eventJobId: job.id })
          : MW.DEFAULT_EVENT_SLOTS;
      const filled = remaining <= 0;
      return `
      <article class="club-job-card${filled ? ' is-filled' : ''}" style="--i:${index}">
        <div class="club-job-mark event-job-mark" aria-hidden="true">EVT</div>
        <div class="club-job-main">
          <h3>${job.title}</h3>
          <p class="club-job-org">${job.department}</p>
          <p class="club-job-loc">${job.location}</p>
          <p class="club-job-level">${filled ? 'Filled' : `${remaining} spot${remaining === 1 ? '' : 's'} left`} · ${job.matchDay ? 'Match day' : 'Seasonal'} · ${job.payLabel}</p>
        </div>
        ${
          filled
            ? `<span class="club-job-view" aria-disabled="true"><span>Filled</span></span>`
            : `<a class="club-job-view" href="job.html?eventJob=${encodeURIComponent(job.id)}">
          <span>View</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>`
        }
      </article>
    `;
    };
    const showMatchRoles = (matchId) => {
      const fixture = MW.enrichFixture(MW.getFixture(matchId) || {});
      if (!fixture?.id || !fixture.stadium || MW.isPastDate(fixture.date)) {
        selectedMatchId = '';
        showFixtures();
        return;
      }
      selectedMatchId = matchId;
      fixturesView.hidden = true;
      rolesView.hidden = false;
      const md = monthDay(fixture.date);
      const img = stadiumImageURL(fixture.stadium);
      matchHero.classList.toggle('has-photo', Boolean(img));
      matchHero.style.backgroundImage = '';
      const venueLine = MW.formatStadiumLocation(fixture.stadium);
      matchHero.innerHTML = `
        ${img ? `<img class="match-hero-bg" src="${img}" alt="" loading="eager" decoding="async" />` : ''}
        <div class="match-hero-date">
          <span class="month">${md.month}</span>
          <span class="day">${md.day}</span>
        </div>
        <div>
          <p class="match-hero-kicker">Matchday hiring · ${fixture.stadium.name}</p>
          <h3>${fixture.home} <span>vs</span> ${fixture.away}</h3>
          <p class="match-hero-when">${fixture.time} · ${fixture.stadium.city}, ${fixture.stadium.state}</p>
          ${venueLine ? `<p class="match-hero-address">${venueLine}</p>` : ''}
        </div>
      `;
      const roles = filterMatchRoles(filters());
      rolesCount.textContent = `${roles.length} role${roles.length === 1 ? '' : 's'}`;
      rolesList.innerHTML = roles.length
        ? roles.map((r) => roleCardHTML(r, fixture)).join('')
        : `<div class="empty">No roles in that category for this match. Clear the role filter.</div>`;
      setUrl();
      rolesView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const showFixtures = () => {
      selectedMatchId = '';
      fixturesView.hidden = false;
      rolesView.hidden = true;
      const results = filterFixtures(filters());
      fixturesCount.textContent = `${results.length} matchday${results.length === 1 ? '' : 's'}`;
      fixturesList.innerHTML = results.length
        ? results.map(fixtureCardHTML).join('')
        : `<div class="empty">No matchdays match those filters.</div>`;
      setUrl();
    };

    const showClubJobs = () => {
      const results = filterClubJobs(filters());
      clubCount.textContent = `${results.length} role${results.length === 1 ? '' : 's'}`;
      clubList.innerHTML = results.length
        ? results.map(clubJobCardHTML).join('')
        : `<div class="empty">No club roles match those filters.</div>`;
      setUrl();
    };

    const showEventJobs = () => {
      if (!eventReady) {
        if (eventCount) eventCount.textContent = '';
        if (eventList) eventList.innerHTML = `<div class="empty">Loading event roles…</div>`;
        setUrl();
        return;
      }
      const results = filterEventJobs(filters());
      if (eventCount) eventCount.textContent = `${results.length} role${results.length === 1 ? '' : 's'}`;
      if (eventList) {
        eventList.innerHTML = results.length
          ? results.map(eventJobCardHTML).join('')
          : `<div class="empty">No event roles match those filters.</div>`;
      }
      setUrl();
    };

    const loadEventTab = async () => {
      if (eventReady) {
        refreshLocationFilters();
        showEventJobs();
        return;
      }
      showEventJobs();
      try {
        await ensureEventJobs();
        eventReady = true;
        refreshLocationFilters();
        showEventJobs();
      } catch {
        if (eventList) {
          eventList.innerHTML = `<div class="empty">Couldn’t load event roles. Refresh and try again.</div>`;
        }
      }
    };

    const setTab = (tab) => {
      activeTab = tab;
      qsa('.jobs-tab').forEach((btn) => {
        const on = btn.dataset.jobsTab === tab;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (matchdayPanel) {
        matchdayPanel.hidden = tab !== 'matchday';
        matchdayPanel.classList.toggle('is-active', tab === 'matchday');
      }
      if (clubPanel) {
        clubPanel.hidden = tab !== 'club';
        clubPanel.classList.toggle('is-active', tab === 'club');
      }
      if (eventsPanel) {
        eventsPanel.hidden = tab !== 'events';
        eventsPanel.classList.toggle('is-active', tab === 'events');
      }
      if (tab === 'club') {
        selectedMatchId = '';
        refreshLocationFilters();
        showClubJobs();
      } else if (tab === 'events') {
        selectedMatchId = '';
        loadEventTab();
      } else if (selectedMatchId) {
        refreshLocationFilters();
        showMatchRoles(selectedMatchId);
      } else {
        refreshLocationFilters();
        showFixtures();
      }
    };

    const apply = () => {
      if (activeTab !== 'events') {
        populateClubOptions();
        populateStadiumOptions();
      }
      syncFilterChrome();
      if (activeTab === 'club') showClubJobs();
      else if (activeTab === 'events') showEventJobs();
      else if (selectedMatchId) showMatchRoles(selectedMatchId);
      else showFixtures();
    };

    ['city', 'club', 'stadium', 'month', 'category'].forEach((key) => {
      const el = form.elements[key];
      if (el && params.get(key)) el.value = params.get(key);
    });

    const monthSel = form.elements.month;
    if (monthSel) {
      const today = MW.todayISO();
      const currentMonth = today.slice(0, 7);
      [...monthSel.querySelectorAll('option')].forEach((opt) => {
        if (!opt.value) return;
        if (opt.value < currentMonth) opt.remove();
      });
      if (monthSel.value && monthSel.value < currentMonth) monthSel.value = '';
    }

    if (activeFilterCount() > 0 && filterPanel) {
      filterPanel.classList.remove('is-collapsed');
    }

    refreshLocationFilters();
    setTab(activeTab);
    syncFilterChrome();

    filterToggle?.addEventListener('click', () => {
      filterPanel?.classList.toggle('is-collapsed');
      syncFilterChrome();
    });

    form.addEventListener('change', apply);
    form.addEventListener('input', apply);
    clearBtn?.addEventListener('click', () => {
      form.reset();
      selectedMatchId = '';
      eventKind = 'all';
      eventQuery = '';
      const searchInput = qs('#event-search');
      if (searchInput) searchInput.value = '';
      qsa('.event-kind-btn').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.eventKind === 'all');
      });
      refreshLocationFilters();
      apply();
    });

    qsa('.jobs-tab').forEach((btn) => {
      btn.addEventListener('click', () => setTab(btn.dataset.jobsTab));
    });

    qs('#event-search')?.addEventListener('input', (e) => {
      eventQuery = String(e.target.value || '').trim().toLowerCase();
      if (activeTab === 'events') showEventJobs();
    });

    qsa('.event-kind-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        eventKind = btn.dataset.eventKind || 'all';
        qsa('.event-kind-btn').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        if (activeTab === 'events') showEventJobs();
      });
    });

    fixturesList?.addEventListener('click', (e) => {
      const card = e.target.closest('[data-match-id]');
      if (!card) return;
      showMatchRoles(card.dataset.matchId);
    });

    qs('#match-back')?.addEventListener('click', () => {
      selectedMatchId = '';
      showFixtures();
      fixturesView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderStadiumPage() {
    const root = qs('#stadium-page');
    if (!root) return;
    const id = params.get('id') || 'providence-park';
    const s = MW.getStadium(id);
    if (!s) {
      root.innerHTML = `<div class="empty">Stadium not found.</div>`;
      return;
    }
    const jobs = MW.enrichedJobs().filter((j) => j.stadiumId === s.id);
    const events = MW.upcomingEvents().filter((e) => e.stadiumId === s.id);
    const homeMatches = typeof MW.homeFixtures === 'function' ? MW.homeFixtures(s.id) : [];

    const venueImg = stadiumImageURL(s);
    root.innerHTML = `
      <div class="venue-hero${venueImg ? ' has-photo' : ''}">
        ${venueImg ? `<img class="venue-hero-bg" src="${venueImg}" alt="" loading="eager" decoding="async" />` : ''}
        <p class="section-kicker" style="color:rgba(255,255,255,0.75)">${s.club}</p>
        <h1>${s.name}</h1>
        <p style="opacity:0.85;margin-top:0.35rem">${s.city}, ${s.state}${s.capacity ? ` · Capacity ${s.capacity}` : ''}</p>
        ${s.address ? `<p class="venue-hero-address">${s.address}</p>` : ''}
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <p>${s.about || ''}</p>
          <h2>Upcoming home matches</h2>
          <p style="color:var(--muted);font-size:0.9rem;margin-bottom:0.75rem">Upcoming 2026 home fixtures for this venue.</p>
          <div class="job-grid">
            ${
              homeMatches.length
                ? homeMatches
                    .map(
                      (m) => `
              <a class="job-row" href="jobs.html?match=${encodeURIComponent(m.id)}&stadium=${encodeURIComponent(s.id)}">
                <div>
                  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:0.25rem">
                    <h3>vs ${m.away}</h3>
                    <span class="badge badge-status">MLS</span>
                  </div>
                  <div class="job-meta">
                    <span>${formatDate(m.date)}</span>
                    <span>${m.time}</span>
                    <span>${m.openings} roles hiring</span>
                  </div>
                </div>
              </a>`
                    )
                    .join('')
                : '<div class="empty">No upcoming home matches right now.</div>'
            }
          </div>
          <h2>Open positions</h2>
          <div class="job-grid">${jobs.map(jobRowHTML).join('') || '<div class="empty">No openings right now.</div>'}</div>
          <h2>Hiring events</h2>
          <div class="event-list">${events.map(eventItemHTML).join('') || '<div class="empty">No events scheduled.</div>'}</div>
        </div>
        <aside class="side-panel">
          <h3>Venue info</h3>
          <div class="meta-stack" style="margin-top:1rem">
            <div class="meta-row"><span>Report to</span><span>${s.reportTo}</span></div>
            <div class="meta-row"><span>Staffing partner</span><span>${s.partner}</span></div>
            ${s.capacity ? `<div class="meta-row"><span>Capacity</span><span>${s.capacity}</span></div>` : ''}
            <div class="meta-row"><span>Check-in</span><span>${s.mapNote}</span></div>
          </div>
          <a class="btn btn-primary" style="width:100%" href="jobs.html?stadium=${s.id}">View all jobs</a>
        </aside>
      </div>
    `;
  }

  function resolveOpening() {
    const matchId = params.get('match');
    const roleId = params.get('role');
    const clubJobId = params.get('clubJob');
    const jobId = params.get('job') || params.get('id');

    if (matchId && roleId) {
      const fixture = MW.getFixture(matchId);
      const role = MW.getMatchRole(roleId);
      const stadium = fixture && MW.getStadium(fixture.stadiumId);
      if (fixture && role && stadium) {
        if (MW.isPastDate(fixture.date)) {
          return {
            kind: 'match',
            expired: true,
            matchId,
            roleId,
            title: role.title,
            eyebrow: 'Matchday closed',
            summary: `${fixture.home} vs ${fixture.away}`,
            club: stadium.club,
            orgLabel: 'Club',
            location: MW.formatStadiumLocation(stadium),
            category: role.category,
            type: role.type,
            pay: role.payLabel,
            slots: 'No longer hiring',
            when: `${formatDate(fixture.date)} · ${fixture.time}`,
            applyHref: 'jobs.html',
            detailHref: `job.html?match=${encodeURIComponent(matchId)}&role=${encodeURIComponent(roleId)}`,
            backHref: 'jobs.html',
            description:
              `This matchday (${formatDate(fixture.date)}) has already passed, so applications for this role are closed.`,
            responsibilities: [],
            qualifications: [],
          };
        }
        const qs = `match=${encodeURIComponent(matchId)}&role=${encodeURIComponent(roleId)}`;
        const remaining =
          typeof MW.remainingMatchRoleSlots === 'function'
            ? MW.remainingMatchRoleSlots(matchId, roleId)
            : role.slots;
        if (remaining <= 0) {
          return {
            kind: 'match',
            filled: true,
            expired: true,
            matchId,
            roleId,
            title: role.title,
            eyebrow: 'Role filled',
            summary: `${fixture.home} vs ${fixture.away}`,
            club: stadium.club,
            orgLabel: 'Club',
            location: MW.formatStadiumLocation(stadium),
            category: role.category,
            type: role.type,
            pay: role.payLabel,
            slots: '0 spots left',
            when: `${formatDate(fixture.date)} · ${fixture.time}`,
            applyHref: 'jobs.html',
            detailHref: `job.html?${qs}`,
            backHref: `jobs.html?match=${encodeURIComponent(matchId)}`,
            description:
              `All spots for ${role.title} on this matchday have been filled. Browse other open roles.`,
            responsibilities: [],
            qualifications: [],
          };
        }
        return {
          kind: 'match',
          matchId,
          roleId,
          title: role.title,
          eyebrow: 'Matchday role',
          summary: `${fixture.home} vs ${fixture.away}`,
          club: stadium.club,
          orgLabel: 'Club',
          location: MW.formatStadiumLocation(stadium),
          category: role.category,
          type: role.type,
          pay: role.payLabel,
          slots: `${remaining} spot${remaining === 1 ? '' : 's'} left`,
          remainingSlots: remaining,
          when: `${formatDate(fixture.date)} · ${fixture.time}`,
          applyHref: `apply.html?${qs}`,
          detailHref: `job.html?${qs}`,
          backHref: `jobs.html?match=${encodeURIComponent(matchId)}`,
          description:
            `Help deliver a great fan experience for ${fixture.home} vs ${fixture.away} at ${stadium.name}. This is an event-based matchday role with the home club staffing team.`,
          responsibilities: [
            'Arrive on time for pre-match briefing and assigned post',
            'Support guests with a professional, fan-first attitude',
            'Follow venue safety and operations procedures',
            'Stay flexible as matchday needs shift through the event',
          ],
          qualifications: [
            'Reliable communication and customer service skills',
            'Ability to stand and move for extended periods',
            'Available for the full matchday shift window',
            'Prior stadium, retail, hospitality, or event experience is a plus',
          ],
        };
      }
    }

    if (clubJobId) {
      const clubJob = MW.getClubJob(clubJobId);
      if (clubJob) {
        const qs = `clubJob=${encodeURIComponent(clubJobId)}`;
        const openingBase = { kind: 'club', clubJobId };
        const remaining =
          typeof MW.remainingSlotsForOpening === 'function'
            ? MW.remainingSlotsForOpening(openingBase)
            : MW.DEFAULT_CLUB_SLOTS;
        if (remaining <= 0) {
          return {
            kind: 'club',
            filled: true,
            expired: true,
            clubJobId,
            title: clubJob.title,
            eyebrow: 'Role filled',
            summary: clubJob.club,
            club: clubJob.club,
            orgLabel: 'Club',
            location: `${clubJob.city}, ${clubJob.state}`,
            category: clubJob.category,
            type: clubJob.type,
            level: clubJob.level,
            pay: clubJob.type === 'Part-time'
              ? 'Part-time · $26–$34 / hr'
              : 'Full-time · $62,000–$92,000 / yr',
            slots: '0 spots left',
            when: 'No longer hiring',
            applyHref: 'jobs.html?tab=club',
            detailHref: `job.html?${qs}`,
            backHref: 'jobs.html?tab=club',
            description: `All spots for this club role have been filled. Browse other open roles.`,
            responsibilities: [],
            qualifications: [],
          };
        }
        return {
          kind: 'club',
          clubJobId,
          title: clubJob.title,
          eyebrow: 'Club & front office',
          summary: clubJob.club,
          club: clubJob.club,
          orgLabel: 'Club',
          location: `${clubJob.city}, ${clubJob.state}`,
          category: clubJob.category,
          type: clubJob.type,
          level: clubJob.level,
          pay: clubJob.type === 'Part-time'
            ? 'Part-time · $26–$34 / hr'
            : 'Full-time · $62,000–$92,000 / yr',
          slots: `${remaining} spot${remaining === 1 ? '' : 's'} left`,
          remainingSlots: remaining,
          when: 'Hiring now',
          applyHref: `apply.html?${qs}`,
          detailHref: `job.html?${qs}`,
          backHref: 'jobs.html?tab=club',
          description:
            `Join ${clubJob.club} in a ${clubJob.category.toLowerCase()} role. This opening supports day-to-day club operations and is not limited to a single matchday.`,
          responsibilities: [
            'Own core responsibilities for this department with clear follow-through',
            'Collaborate across club teams and external partners as needed',
            'Represent the club professionally with fans, staff, and stakeholders',
            'Support matchday or event needs when the role requires it',
          ],
          qualifications: [
            'Relevant experience for this role level and department',
            'Strong written and verbal communication',
            'Organized, deadline-driven, and comfortable in a team environment',
            'Passion for soccer and live event culture is a plus',
          ],
        };
      }
    }

    const eventJobId = params.get('eventJob');
    if (eventJobId) {
      const eventJob = typeof MW.getEventJob === 'function' ? MW.getEventJob(eventJobId) : null;
      if (eventJob) {
        const qs = `eventJob=${encodeURIComponent(eventJobId)}`;
        const desc = String(eventJob.description || '')
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .join('</p><p>');
        const openingBase = { kind: 'event', eventJobId };
        const remaining =
          typeof MW.remainingSlotsForOpening === 'function'
            ? MW.remainingSlotsForOpening(openingBase)
            : MW.DEFAULT_EVENT_SLOTS;
        if (remaining <= 0) {
          return {
            kind: 'event',
            filled: true,
            expired: true,
            eventJobId,
            title: eventJob.title,
            eyebrow: 'Role filled',
            summary: eventJob.department,
            club: 'Matchday Workforce',
            orgLabel: 'Organization',
            location: eventJob.location || [eventJob.city, eventJob.province].filter(Boolean).join(', '),
            category: eventJob.department,
            type: eventJob.type || (eventJob.matchDay ? 'Match day' : 'Seasonal'),
            level: eventJob.workplace || '',
            pay: eventJob.payLabel || eventJob.payDetail || 'Competitive',
            slots: '0 spots left',
            when: 'No longer hiring',
            applyHref: 'jobs.html?tab=events',
            detailHref: `job.html?${qs}`,
            backHref: 'jobs.html?tab=events',
            description: 'All spots for this event role have been filled. Browse other open roles.',
            responsibilities: [],
            qualifications: [],
          };
        }
        return {
          kind: 'event',
          eventJobId,
          title: eventJob.title,
          eyebrow: eventJob.matchDay ? 'Match day · Event ops' : 'Event operations',
          summary: eventJob.department,
          club: 'Matchday Workforce',
          orgLabel: 'Organization',
          location: eventJob.location || [eventJob.city, eventJob.province].filter(Boolean).join(', '),
          category: eventJob.department,
          type: eventJob.type || (eventJob.matchDay ? 'Match day' : 'Seasonal'),
          level: eventJob.workplace || '',
          pay: eventJob.payLabel || eventJob.payDetail || 'Competitive',
          slots: `${remaining} spot${remaining === 1 ? '' : 's'} left`,
          remainingSlots: remaining,
          when: eventJob.matchDay ? 'Match day hiring' : 'Seasonal hiring',
          applyHref: `apply.html?${qs}`,
          detailHref: `job.html?${qs}`,
          backHref: 'jobs.html?tab=events',
          description: desc || 'Event operations role with Matchday Workforce.',
          responsibilities: Array.isArray(eventJob.responsibilities) ? eventJob.responsibilities : [],
          qualifications: Array.isArray(eventJob.qualifications) ? eventJob.qualifications : [],
        };
      }
    }

    if (jobId && MW.getJob(jobId)) {
      const job = MW.enrichJob(MW.getJob(jobId));
      if (job.deadline && MW.isPastDate(job.deadline)) {
        return {
          kind: 'job',
          expired: true,
          jobId: job.id,
          title: job.title,
          eyebrow: 'Closed role',
          summary: job.stadium.club,
          club: job.stadium.club,
          orgLabel: 'Club',
          location: MW.formatStadiumLocation(job.stadium),
          category: job.category,
          type: job.type,
          pay: job.payLabel,
          slots: 'Applications closed',
          when: `Deadline was ${formatDate(job.deadline)}`,
          applyHref: 'jobs.html',
          detailHref: `job.html?job=${encodeURIComponent(job.id)}`,
          backHref: 'jobs.html',
          description: `The apply-by date for this role (${formatDate(job.deadline)}) has passed.`,
          responsibilities: [],
          qualifications: [],
        };
      }
      const qs = `job=${encodeURIComponent(job.id)}`;
      return {
        kind: 'job',
        jobId: job.id,
        title: job.title,
        eyebrow: 'Open role',
        summary: job.stadium.club,
        club: job.stadium.club,
        orgLabel: 'Club',
        location: MW.formatStadiumLocation(job.stadium),
        category: job.category,
        type: job.type,
        pay: job.payLabel,
        slots: job.status,
        when: `Apply by ${formatDate(job.deadline)}`,
        applyHref: `apply.html?${qs}`,
        detailHref: `job.html?${qs}`,
        backHref: 'jobs.html',
        description: job.description,
        responsibilities: job.responsibilities || [],
        qualifications: job.qualifications || [],
      };
    }

    return null;
  }

  function initFlowBack(fallbackHref) {
    const btn = qs('#flow-back');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      location.href = fallbackHref || 'jobs.html';
    });
  }

  async function renderJobPage() {
    const root = qs('#job-page');
    if (!root) return;

    if (params.get('eventJob')) {
      try {
        await ensureEventJobs();
      } catch {
        root.innerHTML = `
          <div class="apply-panel apply-panel--message">
            <h1 class="apply-panel__title">Couldn’t load role</h1>
            <p class="apply-panel__text">Event roles failed to load. Please refresh and try again.</p>
            <a class="btn btn-primary" href="jobs.html?tab=events">Back to Event operations</a>
          </div>`;
        return;
      }
    }

    const opening = resolveOpening();
    initFlowBack(opening?.backHref || 'jobs.html');

    if (!opening) {
      root.innerHTML = `
        <div class="apply-panel apply-panel--message">
          <h1 class="apply-panel__title">Role not found</h1>
          <p class="apply-panel__text">That opening is no longer available or the link is incomplete.</p>
          <a class="btn btn-primary" href="jobs.html">Back to jobs</a>
        </div>`;
      return;
    }

    document.title = `${opening.title} — Matchday Workforce`;
    const categoryLabel = opening.kind === 'event' ? 'Department' : 'Category';
    const applyCta = opening.expired
      ? `<a class="floating-cta btn btn-primary" href="jobs.html">Browse open matchdays</a>`
      : `<a class="floating-cta btn btn-primary" id="job-apply-floating" href="${opening.applyHref}">Apply now</a>`;
    root.innerHTML = `
      <article class="role-detail">
        <header class="role-detail__header">
          <p class="role-detail__eyebrow">${opening.eyebrow}</p>
          <h1 class="role-detail__title">${opening.title}</h1>
          <p class="role-detail__summary">${opening.summary}</p>
          ${opening.slots ? `<p class="role-detail__slots">${opening.slots}</p>` : ''}
          ${
            opening.expired
              ? `<p class="role-detail__notice">This matchday has passed — applications are closed.</p>`
              : ''
          }
        </header>

        <div class="role-detail__meta">
          <div class="role-detail__meta-item"><span>${opening.orgLabel || 'Club'}</span><strong>${opening.club}</strong></div>
          <div class="role-detail__meta-item"><span>Location</span><strong>${opening.location}</strong></div>
          <div class="role-detail__meta-item"><span>${categoryLabel}</span><strong>${opening.category}</strong></div>
          <div class="role-detail__meta-item"><span>Type</span><strong>${opening.type || opening.level || ''}</strong></div>
          <div class="role-detail__meta-item"><span>Pay</span><strong>${opening.pay}</strong></div>
          <div class="role-detail__meta-item"><span>Timing</span><strong>${opening.when}</strong></div>
        </div>

        <section class="role-detail__section">
          <h2>About the role</h2>
          <p>${opening.description}</p>
        </section>
        <section class="role-detail__section">
          <h2>Responsibilities</h2>
          <ul>${(opening.responsibilities || []).map((item) => `<li>${item}</li>`).join('') || '<li>Details provided during interview.</li>'}</ul>
        </section>
        <section class="role-detail__section">
          <h2>Qualifications</h2>
          <ul>${(opening.qualifications || []).map((item) => `<li>${item}</li>`).join('') || '<li>Relevant experience preferred.</li>'}</ul>
        </section>
      </article>
      ${applyCta}
    `;
  }

  async function renderApply() {
    const root = qs('#apply-content');
    if (!root) return;

    if (params.get('eventJob')) {
      try {
        await ensureEventJobs();
      } catch {
        root.innerHTML = `
          <div class="apply-shell apply-shell--single">
            <div class="apply-panel apply-panel--message">
              <h1 class="apply-panel__title">Couldn’t load role</h1>
              <p class="apply-panel__text">Event roles failed to load. Please refresh and try again.</p>
              <a class="btn btn-primary" href="jobs.html?tab=events">Back to Event operations</a>
            </div>
          </div>`;
        return;
      }
    }

    const opening = resolveOpening();
    initFlowBack(opening?.detailHref || opening?.backHref || 'jobs.html');

    if (!opening) {
      root.innerHTML = `
        <div class="apply-shell apply-shell--single">
          <div class="apply-panel apply-panel--message">
            <h1 class="apply-panel__title">Unable to apply</h1>
            <p class="apply-panel__text">Choose a role from Jobs first, then continue to the application form.</p>
            <a class="btn btn-primary" href="jobs.html">Back to jobs</a>
          </div>
        </div>`;
      return;
    }

    if (opening.expired) {
      root.innerHTML = `
        <div class="apply-shell apply-shell--single">
          <div class="apply-panel apply-panel--message">
            <h1 class="apply-panel__title">${opening.filled ? 'Role filled' : 'Matchday closed'}</h1>
            <p class="apply-panel__text">${opening.description}</p>
            <a class="btn btn-primary" href="${opening.backHref || 'jobs.html'}">Browse open roles</a>
          </div>
        </div>`;
      return;
    }

    const remainingNow =
      typeof MW.remainingSlotsForOpening === 'function' ? MW.remainingSlotsForOpening(opening) : null;
    if (remainingNow === 0) {
      root.innerHTML = `
        <div class="apply-shell apply-shell--single">
          <div class="apply-panel apply-panel--message">
            <h1 class="apply-panel__title">Role filled</h1>
            <p class="apply-panel__text">All spots for this role were just taken. Browse other open roles.</p>
            <a class="btn btn-primary" href="${opening.backHref || 'jobs.html'}">Browse open roles</a>
          </div>
        </div>`;
      return;
    }

    document.title = `Apply: ${opening.title} — Matchday Workforce`;

    const categoryLabel = opening.kind === 'event' ? 'Department' : 'Category';
    const metaRows = [
      [opening.orgLabel || 'Club', opening.club],
      ['Location', opening.location],
      [categoryLabel, opening.category],
      ['Type', opening.type || opening.level],
      ['Pay', opening.pay],
      ['Timing', opening.when],
      opening.slots ? ['Availability', opening.slots] : null,
    ]
      .filter(Boolean)
      .map(
        ([label, value]) => `
        <div class="apply-sidebar__item">
          <dt class="apply-sidebar__label">${label}</dt>
          <dd class="apply-sidebar__value">${value}</dd>
        </div>`
      )
      .join('');

    root.innerHTML = `
      <div class="apply-shell">
        <aside class="apply-sidebar" aria-label="Role summary">
          <p class="apply-sidebar__eyebrow">Apply</p>
          <h1 class="apply-sidebar__title">${opening.title}</h1>
          <p class="apply-sidebar__summary">${opening.summary}</p>
          <dl class="apply-sidebar__meta">${metaRows}</dl>
          <p class="apply-sidebar__note">Your application is reviewed by the hiring team for this club or venue. You’ll get next steps by email.</p>
        </aside>

        <div class="apply-panel">
          <form class="apply-form" id="apply-form" novalidate>
            <section class="apply-form__section">
              <h2 class="apply-form__section-title"><span class="apply-form__section-number">1.</span> Personal details</h2>
              <p class="apply-form__section-intro">We’ll use these details to contact you about this role.</p>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-first-name">First name</label>
                <input class="apply-form__input" id="apply-first-name" name="firstName" type="text" autocomplete="given-name" required />
              </div>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-last-name">Last name</label>
                <input class="apply-form__input" id="apply-last-name" name="lastName" type="text" autocomplete="family-name" required />
              </div>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-email">Email address</label>
                <input class="apply-form__input" id="apply-email" name="email" type="email" autocomplete="email" required />
              </div>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-phone">Phone</label>
                <input class="apply-form__input" id="apply-phone" name="phone" type="tel" autocomplete="tel" required />
              </div>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-city">City</label>
                <input class="apply-form__input" id="apply-city" name="city" type="text" autocomplete="address-level2" required />
              </div>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-state">State / province</label>
                <input class="apply-form__input" id="apply-state" name="state" type="text" autocomplete="address-level1" required />
              </div>
            </section>

            <section class="apply-form__section">
              <h2 class="apply-form__section-title"><span class="apply-form__section-number">2.</span> Profile</h2>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-experience">Relevant experience</label>
                <textarea class="apply-form__textarea" id="apply-experience" name="experience" rows="4" placeholder="Customer service, events, retail, stadium, front office..." required></textarea>
              </div>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-resume">Résumé / CV <span class="apply-form__optional">(optional)</span></label>
                <p class="apply-form__field-note">PDF or Word · optional. File is not uploaded; include links in your experience if needed.</p>
                <input class="apply-form__input" id="apply-resume" name="resume" type="file" accept=".pdf,.doc,.docx" />
              </div>
            </section>

            <section class="apply-form__section">
              <h2 class="apply-form__section-title"><span class="apply-form__section-number">3.</span> Questions</h2>
              <p class="apply-form__section-intro">Help the hiring team understand your availability.</p>
              <div class="apply-form__subsection">
                <p class="apply-form__location-question">Are you legally authorized to work in the U.S. or Canada (as required for this role)?</p>
                <fieldset class="apply-form__yes-no">
                  <label class="apply-form__yes-no-option"><input type="radio" name="workAuth" value="yes" required /><span>Yes</span></label>
                  <label class="apply-form__yes-no-option"><input type="radio" name="workAuth" value="no" /><span>No</span></label>
                </fieldset>
              </div>
              <div class="apply-form__subsection">
                <p class="apply-form__location-question">Are you available for evenings, weekends, and matchday shifts as needed?</p>
                <fieldset class="apply-form__yes-no">
                  <label class="apply-form__yes-no-option"><input type="radio" name="flexibleHours" value="yes" required /><span>Yes</span></label>
                  <label class="apply-form__yes-no-option"><input type="radio" name="flexibleHours" value="no" /><span>No</span></label>
                </fieldset>
              </div>
              <div class="apply-form__subsection">
                <p class="apply-form__location-question">Can you commute to ${opening.location} for this role?</p>
                <fieldset class="apply-form__yes-no">
                  <label class="apply-form__yes-no-option"><input type="radio" name="canCommute" value="yes" required /><span>Yes</span></label>
                  <label class="apply-form__yes-no-option"><input type="radio" name="canCommute" value="no" /><span>No</span></label>
                </fieldset>
              </div>
              <div class="apply-form__field">
                <label class="apply-form__label" for="apply-why">Why do you want this role?</label>
                <textarea class="apply-form__textarea" id="apply-why" name="why" rows="4" required></textarea>
              </div>
            </section>

            <section class="apply-form__section apply-form__section--submit">
              <h2 class="apply-form__section-title"><span class="apply-form__section-number">4.</span> Submit application</h2>
              <p class="apply-form__section-intro">By submitting, you agree we may process your application details as described in our <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>, including sharing them with hiring partners for this role and sending confirmation or next-step emails.</p>
              <div class="apply-form__choice">
                <input class="apply-form__checkbox" id="apply-consent" name="consent" type="checkbox" required />
                <label class="apply-form__checkbox-label" for="apply-consent">I agree to Matchday Workforce processing my personal information for this application, recruiting follow-up, and related hiring steps. I have read the Privacy Policy.</label>
              </div>
              <div class="apply-form__actions">
                <button class="btn btn-primary apply-form__submit" type="submit">Submit application</button>
              </div>
              <p class="apply-form__error" id="apply-form-error" hidden>Please complete all required fields before submitting.</p>
            </section>
          </form>
        </div>
      </div>
    `;

    const form = qs('#apply-form');
    const errorEl = qs('#apply-form-error');
    const submitBtn = form?.querySelector('.apply-form__submit');

    const radioValue = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value || '';

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = 'Please complete all required fields before submitting.';
        }
        form.reportValidity();
        return;
      }

      if (errorEl) errorEl.hidden = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }

      const firstName = form.firstName.value.trim();
      const lastName = form.lastName.value.trim();
      const email = form.email.value.trim();
      const sourceLabel =
        opening.kind === 'club'
          ? 'MLS Careers · Club'
          : opening.kind === 'match'
            ? 'MLS Careers · Matchday'
            : opening.kind === 'event'
              ? 'MLS Careers · Event ops'
              : 'MLS Careers';

      const payload = {
        firstName,
        lastName,
        email,
        _replyto: email,
        phone: form.phone.value.trim(),
        city: form.city.value.trim(),
        state: form.state.value.trim(),
        experience: form.experience.value.trim(),
        why: form.why.value.trim(),
        workAuth: radioValue('workAuth'),
        flexibleHours: radioValue('flexibleHours'),
        canCommute: radioValue('canCommute'),
        consent: form.consent.checked ? 'yes' : 'no',
        source: sourceLabel,
        role: opening.kind,
        jobId: opening.eventJobId || opening.clubJobId || opening.jobId || opening.roleId || '',
        matchId: opening.matchId || '',
        jobTitle: opening.title,
        jobLocation: opening.location,
        jobOrg: opening.club,
        jobCategory: opening.category,
        jobPay: opening.pay,
        jobType: opening.type || opening.level || '',
        _subject: `${sourceLabel} Application: ${opening.title}`,
        cv_url: 'not provided',
        cover_letter_url: 'not provided',
        document_url: 'not provided',
      };

      try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        let result = null;
        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (!response.ok) {
          const codes = result?.errors?.map((entry) => entry.code).filter(Boolean) || [];
          const fieldMessages =
            result?.errors?.map((entry) => entry.message).filter(Boolean).join(' ') || '';
          let message =
            result?.error || fieldMessages || 'We could not submit your application. Please try again.';
          if (response.status === 403 || codes.includes('FORBIDDEN') || /forbidden|origin/i.test(message)) {
            message =
              'This site domain is not allowed on the Formspree form yet. Add your GitHub Pages URL in Formspree → form settings → Allowed Domains, then try again.';
          }
          throw new Error(message);
        }

        // Reduce remaining spots after a successful application
        if (typeof MW.claimOpeningSlot === 'function') {
          MW.claimOpeningSlot(opening);
        }

        // Branded confirmation email to the applicant (EmailJS template)
        if (window.emailjs) {
          try {
            emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
              firstName,
              lastName,
              email,
              phone: payload.phone,
              city: payload.city,
              state: payload.state,
              source: payload.source,
              role: payload.role,
              jobId: payload.jobId,
              matchId: payload.matchId,
              jobTitle: payload.jobTitle,
              jobLocation: payload.jobLocation,
              jobOrg: payload.jobOrg,
              jobCategory: payload.jobCategory,
              jobPay: payload.jobPay,
              jobType: payload.jobType,
              to_email: email,
              to_name: firstName,
              reply_to: email,
            });
          } catch (mailErr) {
            console.warn('EmailJS confirmation failed:', mailErr);
            // Application already saved via Formspree — continue to thank-you
          }
        }

        const draft = {
          kind: opening.kind,
          title: opening.title,
          club: opening.club,
          matchId: opening.matchId,
          roleId: opening.roleId,
          clubJobId: opening.clubJobId,
          eventJobId: opening.eventJobId,
          jobId: opening.jobId,
          firstName,
          lastName,
          email,
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem('mw_last_application', JSON.stringify(draft));
        location.href = 'thank-you.html';
        return;
      } catch (err) {
        let message = err?.message || 'We could not submit your application. Please try again.';
        if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
          message =
            'Could not reach Formspree. Check your connection, and confirm this site’s domain is allowed on form mdavpbew.';
        }
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = message;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit application';
        }
      }
    });
  }

  function renderThankYou() {
    const root = qs('#thank-you-content');
    if (!root) return;

    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem('mw_last_application') || 'null');
    } catch {
      draft = null;
    }

    const jobsHref =
      draft?.kind === 'event'
        ? 'jobs.html?tab=events'
        : draft?.kind === 'club'
          ? 'jobs.html?tab=club'
          : 'jobs.html';

    initFlowBack(jobsHref);
    document.title = 'Thank you — Matchday Workforce';

    if (!draft?.title) {
      root.innerHTML = `
        <div class="apply-shell apply-shell--single">
          <div class="apply-panel apply-panel--message">
            <h1 class="apply-panel__title">No application found</h1>
            <p class="apply-panel__text">Apply for a role first, then you’ll land here after you submit.</p>
            <a class="btn btn-primary" href="jobs.html">Browse jobs</a>
          </div>
        </div>`;
      return;
    }

    const name = [draft.firstName, draft.lastName].filter(Boolean).join(' ');
    const greeting = name ? `Thanks, ${name}.` : 'Thank you for applying.';

    root.innerHTML = `
      <div class="apply-shell apply-shell--single">
        <div class="apply-panel apply-panel--message apply-panel--success">
          <p class="apply-panel__eyebrow">Application submitted</p>
          <h1 class="apply-panel__title">${greeting}</h1>
          <p class="apply-panel__text">Your application for <strong>${draft.title}</strong> has been received.</p>
          ${
            draft.email
              ? `<p class="apply-panel__text">A confirmation note will be sent to <strong>${draft.email}</strong>. The hiring team will follow up with next steps.</p>`
              : `<p class="apply-panel__text">The hiring team will follow up with next steps by email.</p>`
          }
          <p class="thank-you-next">If you’re selected, your next-steps note will include a short onboarding checklist for any required work gear for <em>this role</em> before your first shift.</p>
          <a class="btn btn-primary" href="${jobsHref}">View more openings</a>
        </div>
      </div>`;
  }

  function renderDashboard() {
    const apps = qs('#app-list');
    if (!apps) return;
    if (params.get('submitted') === '1') {
      showToast('Your application was received. Track status below.');
    }
    apps.innerHTML = MW.applications
      .map((a) => {
        const job = MW.enrichJob(MW.getJob(a.jobId));
        const dot =
          a.status.includes('Interview') ? 'interview' : a.status.includes('Documents') ? 'review' : 'review';
        return `
          <tr>
            <td>
              <strong>${job.title}</strong><br>
              <span style="color:var(--muted);font-size:0.85rem">${job.stadium.name}</span>
            </td>
            <td><span class="status-dot ${dot}"></span>${a.status}</td>
            <td>${a.updated}</td>
            <td>${a.next}</td>
          </tr>`;
      })
      .join('');

    const msgs = qs('#msg-list');
    if (msgs) {
      msgs.innerHTML = MW.messages
        .map(
          (m) => `
        <div class="course-item">
          <div>
            <strong>${m.subject}</strong>
            <div style="color:var(--muted);font-size:0.88rem;margin-top:0.2rem">${m.from} · ${m.time}</div>
            <p style="margin-top:0.35rem">${m.preview}</p>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" data-reply>Reply</button>
        </div>`
        )
        .join('');
      msgs.addEventListener('click', (e) => {
        if (e.target.matches('[data-reply]')) showToast('Message composer opens in the full product');
      });
    }
  }

  function renderEventsPage() {
    const list = qs('#events-list');
    const detail = qs('#event-detail');
    const upcoming = MW.upcomingEvents();
    if (list) {
      list.innerHTML = upcoming.length
        ? upcoming.map(eventItemHTML).join('')
        : `<div class="empty">No upcoming hiring events right now.</div>`;
    }
    if (detail) {
      if (!upcoming.length) {
        detail.innerHTML = `<div class="empty">No upcoming hiring events right now.</div>`;
        return;
      }
      const id = params.get('id');
      const evt = upcoming.find((e) => e.id === id) || upcoming[0];
      const s = MW.getStadium(evt.stadiumId);
      const md = monthDay(evt.date);
      detail.innerHTML = `
        <div class="panel">
          <div style="display:flex;gap:1rem;align-items:start;margin-bottom:1rem">
            <div class="event-date"><div class="month">${md.month}</div><div class="day">${md.day}</div></div>
            <div>
              <h2 style="font-family:var(--font-display);font-size:1.5rem">${evt.title}</h2>
              <p style="color:var(--muted);margin-top:0.25rem">${s.name} · ${s.city}, ${s.state}</p>
            </div>
          </div>
          <div class="meta-stack">
            <div class="meta-row"><span>Time</span><span>${evt.time}</span></div>
            <div class="meta-row"><span>Location</span><span>${evt.location}</span></div>
            <div class="meta-row"><span>Roles hiring</span><span>${evt.roles.join(', ')}</span></div>
            <div class="meta-row"><span>Spots</span><span>${evt.spots} remaining</span></div>
          </div>
          <h3 style="margin:1rem 0 0.5rem;font-family:var(--font-display)">What to bring</h3>
          <ul style="margin-left:1.1rem;list-style:disc">${evt.bring.map((b) => `<li style="margin-bottom:0.35rem;color:var(--ink-soft)">${b}</li>`).join('')}</ul>
          ${evt.note ? `<p style="margin-top:1rem;color:var(--muted);font-size:0.9rem">${evt.note}</p>` : ''}
          <button class="btn btn-primary" style="margin-top:1.25rem;width:100%" id="register-event" type="button">Register for this event</button>
          <p class="hint" style="margin-top:0.75rem;font-size:0.85rem;color:var(--muted);text-align:center">You'll receive a confirmation email with check-in details.</p>
        </div>`;
      qs('#register-event')?.addEventListener('click', () => {
        localStorage.setItem('mw_event_reg', evt.id);
        showToast('Registered! Confirmation email sent (demo).');
      });
    }
  }

  function renderTraining() {
    const list = qs('#course-list');
    if (!list) return;
    list.innerHTML = MW.courses
      .map(
        (c) => `
      <div class="course-item">
        <div>
          <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.25rem">
            <strong>${c.title}</strong>
            <span class="badge badge-status">${c.category}</span>
          </div>
          <div style="color:var(--muted);font-size:0.85rem">${c.minutes} min · ${c.progress}% complete</div>
          <div class="progress-bar"><span style="width:${c.progress}%"></span></div>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" data-course="${c.id}">
          ${c.progress === 100 ? 'Review' : c.progress > 0 ? 'Continue' : 'Start'}
        </button>
      </div>`
      )
      .join('');

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-course]');
      if (!btn) return;
      showToast('Lesson player opens in the full training module');
    });

    const overall = Math.round(MW.courses.reduce((sum, c) => sum + c.progress, 0) / MW.courses.length);
    const bar = qs('#overall-progress');
    if (bar) bar.style.width = overall + '%';
    const label = qs('#overall-label');
    if (label) label.textContent = overall + '% complete';
  }

  function renderWorker() {
    const root = qs('#worker-assignment');
    if (!root) return;
    const s = MW.getStadium('providence-park');
    if (!s) {
      root.innerHTML = `<div class="empty">Assignment unavailable.</div>`;
      return;
    }
    const upcoming =
      typeof MW.homeFixtures === 'function'
        ? MW.homeFixtures(s.id)
        : (s.matches || []).filter((m) => MW.isUpcomingDate?.(m.date) !== false);
    const next = upcoming[0];
    if (!next) {
      root.innerHTML = `
        <div class="assignment">
          <p class="section-kicker" style="color:rgba(255,255,255,0.7)">Next match assignment</p>
          <h2>No upcoming assignment</h2>
          <p class="sub">${s.name} · check back for the next home matchday</p>
        </div>`;
      return;
    }
    const opponent = next.away || next.opponent || 'TBD';
    const when = next.displayDate || formatDate(next.date) || next.date;
    const kickoff = next.time || next.kickoff || 'TBD';
    root.innerHTML = `
      <div class="assignment">
        <p class="section-kicker" style="color:rgba(255,255,255,0.7)">Next match assignment</p>
        <h2>Guest Services — Section 112</h2>
        <p class="sub">${s.name} · vs ${opponent} · ${when}</p>
        <dl class="assignment-grid">
          <div><dt>Kickoff</dt><dd>${kickoff}</dd></div>
          <div><dt>Shift time</dt><dd>Arrive 90 min before kickoff</dd></div>
          <div><dt>Report to</dt><dd>${s.reportTo}</dd></div>
          <div><dt>Supervisor</dt><dd>Chris Alvarez · Gate D Lead</dd></div>
          <div><dt>Uniform</dt><dd>Black polo, khaki pants, closed-toe shoes</dd></div>
          <div><dt>Competition</dt><dd>${next.competition || 'MLS'} · ${next.broadcast || 'Apple TV'}</dd></div>
          <div><dt>Check-in</dt><dd>Scan QR at staff desk · bring photo ID</dd></div>
          <div><dt>Map note</dt><dd>${s.mapNote}</dd></div>
        </dl>
      </div>
    `;
  }

  function renderAdmin() {
    const table = qs('#admin-applicants');
    if (!table) return;
    table.innerHTML = MW.applicantsAdmin
      .map((a) => {
        const cls =
          a.status === 'Interview'
            ? 'interview'
            : a.status === 'Offer'
              ? 'offer'
              : a.status === 'Declined'
                ? 'declined'
                : 'review';
        return `
        <tr>
          <td><strong>${a.name}</strong></td>
          <td>${a.role}<br><span style="color:var(--muted);font-size:0.85rem">${a.stadium}</span></td>
          <td><span class="status-dot ${cls}"></span>${a.status}</td>
          <td>${a.applied}</td>
          <td>
            <button class="btn btn-secondary btn-sm" type="button" data-action="status">Update</button>
          </td>
        </tr>`;
      })
      .join('');

    table.closest('table')?.addEventListener('click', (e) => {
      if (e.target.matches('[data-action]')) showToast('Status updated (demo)');
    });

    qsa('[data-admin-action]').forEach((btn) => {
      btn.addEventListener('click', () => showToast(btn.dataset.adminAction));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initFooterDrops();
    initFloatingJobsCta();
    initWeAreSlideshow();
    initValuesTrack();
    renderHome();
    renderJobsPage();
    renderStadiumPage();
    renderJobPage();
    renderApply();
    renderThankYou();
    renderDashboard();
    renderEventsPage();
    renderTraining();
    renderWorker();
    renderAdmin();
  });

  window.MWApp = { showToast, filterJobs, formatDate };
})();
