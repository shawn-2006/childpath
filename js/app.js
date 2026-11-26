(() => {
  'use strict';

  const L1_LABELS = {
    'L1-01': '注意與衝動控制',
    'L1-02': '安排、記住與完成事情',
    'L1-03': '閱讀',
    'L1-04': '寫字時的手部操作',
    'L1-05': '寫出字詞與想法',
    'L1-06': '數學',
    'L1-07': '聽懂口語說明',
    'L1-08': '用口語說明想法',
    'L1-09': '情緒與挫折適應',
    'L1-10': '同儕互動'
  };

  const L2_META = {
    'L2-01': {
      short: '先找人談談', title: '先找一個能聽你說明的窗口',
      pathHint: '可以從親師諮詢或家庭教育窗口開始，說說最近最困擾的一件事。',
      prep: '可以問：「我可以先和誰聊？如果需要其他支持，下一個窗口在哪裡？」'
    },
    'L2-02': {
      short: '了解是否需評估', title: '先問評估怎麼安排',
      pathHint: '可以先問校方如何觀察孩子的學習情況，或向評估單位詢問初談流程。',
      prep: '可以問：「這樣的困難可以先找誰討論？要帶作業、老師的觀察紀錄或轉介單嗎？」'
    },
    'L2-03': {
      short: '完整專業評估', title: '找評估窗口，確認評估的範圍',
      pathHint: '醫療評估、心理衡鑑與學校特教鑑定各有不同程序。先向窗口說明這次希望了解的問題。',
      prep: '可以問：「這裡的評估涵蓋哪些項目？要經學校提報或先掛門診嗎？後續如何了解結果？」'
    },
    'L2-04': {
      short: '希望學校協助', title: '從就讀學校或當地特教窗口開始',
      pathHint: '可先向導師或輔導室說明孩子在哪些活動遇到困難，再討論課堂調整或校內支持。',
      prep: '可以問：「在班上可以先怎麼幫忙？家長可以直接諮詢嗎？哪些服務需要由學校轉介？」'
    },
    'L2-05': {
      short: '安排介入／治療', title: '詢問後續介入或治療',
      pathHint: '如果已經完成評估，可先說明目前想改善的日常活動，再問機構是否有相關服務。',
      prep: '可以問：「能否參考已有的評估報告？預約需要醫囑或轉介嗎？費用和等候時間如何？」'
    },
    'L2-06': {
      short: '孩子心理支持', title: '找孩子可以使用的情緒支持',
      pathHint: '可向學校輔導或兒童心理服務窗口，了解孩子遇到情緒或人際困難時能獲得哪些協助。',
      prep: '可以問：「這項服務是否接待孩子本人？是個別或團體？家長如何參與？」'
    },
    'L2-07': {
      short: '教養與家長支持', title: '找家長自己能用的協助',
      pathHint: '可向家庭教育中心或家長團體詢問親職諮詢、照顧者支持和家長交流活動。',
      prep: '可以問：「家長能單獨參加嗎？可以先電話討論嗎？最近有什麼活動？」'
    },
    'L2-08': {
      short: '費用、交通與福利', title: '問清楚費用、交通和福利條件',
      pathHint: '可向社福窗口說明就學地、方便前往的地區，以及目前希望解決的費用或交通問題。',
      prep: '可以問：「哪個據點能受理？有就學地、戶籍或費用限制嗎？要準備哪些資料？」'
    }
  };

  const byId = (id) => document.getElementById(id);
  const wizard = byId('wizardSection');
  const wizardForm = byId('wizardForm');
  const results = byId('resultsSection');
  const county = byId('countySelect');
  const schoolCounty = byId('schoolCountySelect');
  const national = byId('includeNational');
  const filterCounty = byId('filterCounty');
  const filterSchoolCounty = byId('filterSchoolCounty');
  const resultsNational = byId('resultsNational');
  const filterCategory = byId('filterCategory');
  const filterFree = byId('filterFree');
  const filterOwnership = byId('filterOwnership');
  const keyword = byId('keywordInput');
  const groups = ['A', 'B'].map((key) => ({
    section: byId('group' + key),
    grid: byId('group' + key + 'Grid'),
    count: byId('group' + key + 'Count'),
    more: byId('group' + key + 'More'),
    items: []
  }));
  const batchSize = 6;
  let allItems = [];
  let step = 1;
  let guided = false;
  let ready = false;
  let groupBy = 'free';

  async function readDataset() {
    const local = byId('localDataset');
    if (local) return JSON.parse(local.textContent);
    if (location.protocol === 'file:') {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'data/offline.js';
        script.onload = () => { script.remove(); resolve(window.childPathOfflineData); };
        script.onerror = () => { script.remove(); reject(new Error('Offline index unavailable')); };
        document.head.append(script);
      });
    }
    const response = await fetch('data/services.min.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Index unavailable: ' + response.status);
    return response.json();
  }

  async function loadData() {
    const feedback = byId('dataFeedback');
    const message = byId('dataStatus');
    const retry = byId('retryDataBtn');
    const submit = wizardForm.querySelector('button[type="submit"]');
    const browse = byId('skipToAllBtn');
    ready = false;
    submit.disabled = browse.disabled = true;
    feedback.hidden = false;
    retry.hidden = true;
    message.textContent = '正在載入資源名錄…';
    results.setAttribute('aria-busy', 'true');
    try {
      const data = await readDataset();
      if (!Array.isArray(data?.items)) throw new Error('Invalid resource index');
      // These are legacy directory leads. A structured candidate has a separate
      // review and publication lifecycle, including when reading an older bundle.
      allItems = data.items.filter((item) => !item.spec_version &&
        item.public_release_allowed !== false && (!item.review_status || item.review_status === 'approved'));
      const categories = [...new Set(allItems.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
      filterCategory.replaceChildren(new Option('全部類型', 'ALL'));
      categories.forEach((name) => filterCategory.add(new Option(name, name)));
      byId('totalCountBadge').textContent = String(allItems.length);
      const updatedEl = byId('dataUpdatedAt');
      if (updatedEl && data.generated_at) {
        updatedEl.textContent = '· 名錄更新：' + data.generated_at + '（' + allItems.length + ' 筆）';
      }
      updateSchoolFields();
      ready = true;
      feedback.hidden = true;
      submit.disabled = browse.disabled = false;
    } catch (error) {
      message.textContent = location.protocol === 'file:'
        ? '無法載入資源名錄。請確認網站資料夾完整，再試一次。'
        : '無法載入資源名錄。請檢查網路連線，再試一次。';
      retry.hidden = false;
      console.error('OneKindKnock resource index', error);
    } finally {
      results.removeAttribute('aria-busy');
    }
  }

  function goToStep(next) {
    step = next;
    updateSelectionNotes();
    if (next === 3) updateSchoolFields();
    byId('hero').hidden = next !== 1;
    [1, 2, 3].forEach((n) => {
      const active = n === next;
      byId('step-' + n).hidden = !active;
      const progress = byId('prog-' + n);
      progress.classList.toggle('is-active', active);
      progress.classList.toggle('is-done', n < next);
      if (active) progress.setAttribute('aria-current', 'step');
      else progress.removeAttribute('aria-current');
    });
    byId('step' + next + 'Heading').focus();
  }

  function getSelectedL1() {
    return [...wizardForm.querySelectorAll('[name="l1"]:checked')].map((el) => el.value);
  }

  function getSelectedL2() {
    return [...wizardForm.querySelectorAll('[name="l2"]:checked')].map((el) => el.value);
  }

  function showResults(useGuide, keepFiltersOpen = false) {
    if (!ready) return;
    guided = useGuide;
    if (!guided) wizardForm.reset();
    keyword.value = '';
    filterCategory.value = 'ALL';
    if (filterFree) filterFree.value = 'ALL';
    if (filterOwnership) filterOwnership.value = 'ALL';
    filterCounty.value = county.value;
    filterSchoolCounty.value = schoolCounty.value;
    resultsNational.checked = national.checked;
    wizard.hidden = true;
    if (byId('referencesSection')) byId('referencesSection').hidden = true;
    if (!keepFiltersOpen) byId('resultFilters').open = false;
    byId('resultPreparation').open = false;
    results.hidden = false;
    renderResults();
    byId('resultsHeading').focus();
  }

  const normalize = (text) => text.normalize('NFKC').toLowerCase().replace(/臺/g, '台');

  // General inquiry windows accept questions across topics. Service listings
  // additionally need a difficulty tag when the family has selected one.
  function matchesServiceGoal(item, code) {
    const services = item.service_goals || [];
    if (code === 'L2-02') return services.includes('L2-03');
    if (code === 'L2-04') return false; // School contact roles are recorded in inquiry_goals.
    if (['L2-03', 'L2-05', 'L2-06'].includes(code)) return services.includes(code);
    return (item.l2_tags || []).includes(code);
  }

  function isSchoolContact(item) {
    return Boolean(item.school_area_rule || item.inquiry_goals?.includes('L2-04'));
  }

  function updateSchoolFields() {
    const goals = getSelectedL2();
    const relevant = allItems.some((item) => isSchoolContact(item) &&
      (!goals.length || goals.some((code) =>
        item.inquiry_goals?.includes(code) || matchesServiceGoal(item, code))));
    byId('schoolCountyField').hidden = !relevant;
    byId('refineSchoolCountyField').hidden = !relevant;
    return relevant;
  }

  function matchesLocation(item, area, schoolCity, includeNational) {
    if (item.county === '全國/跨區') return includeNational;
    const schoolArea = item.school_area_rule;
    if (schoolCity && schoolArea?.cities?.length) return schoolArea.cities.includes(schoolCity);
    if (schoolCity && isSchoolContact(item) && item.county === schoolCity) return true;
    return area === 'ALL' || area === item.county;
  }

  function bindGoalButtons() {
    const bar = byId('quickL2Bar');
    Object.entries(L2_META).forEach(([code, meta]) => {
      const box = wizardForm.querySelector('[name="l2"][value="' + code + '"]');
      const button = element('button', 'quick-l2-btn', meta.short);
      button.type = 'button';
      button.dataset.goal = code;
      button.addEventListener('click', () => {
        box.checked = !box.checked;
        guided = true;
        renderResults();
      });
      bar.append(button);
    });
  }

  function renderNextSteps(selected, goals, entries) {
    byId('quickL2Bar').querySelectorAll('button').forEach((button) => {
      const active = selected.includes(button.dataset.goal);
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const body = byId('nextStepsBody');
    body.replaceChildren();
    goals.forEach((code) => {
      const meta = L2_META[code];
      const details = element('details', 'next-step-item');
      details.open = goals.length <= 2;
      details.append(
        element('summary', '', meta.title),
        element('p', '', meta.pathHint),
        element('p', 'prep-note', meta.prep)
      );
      // Put a listed service before a general inquiry on the assessment route.
      const candidates = entries.filter((e) => e.services.includes(code) || e.inquiries.includes(code));
      if (code === 'L2-02') candidates.sort((a, b) =>
        Number(b.services.includes(code) && !b.awaitingSchool) - Number(a.services.includes(code) && !a.awaitingSchool));
      const links = element('div', 'route-entries');
      const linkedUrls = new Set();
      for (const entry of candidates) {
        const item = entry.item;
        if (!/^https?:\/\//i.test(item.official_url) || linkedUrls.has(item.official_url)) continue;
        const link = element('a', '', item.name + (entry.awaitingSchool ? '（先確認就學地）' : '') + ' ↗');
        link.href = item.official_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', item.name + '官方網站（另開分頁）');
        links.append(link);
        linkedUrls.add(item.official_url);
        if (linkedUrls.size === 2) break;
      }
      if (links.childElementCount) details.append(links);
      if (!candidates.length) details.append(element('p', 'prep-note', '目前條件下，名錄沒有列出這類具名窗口。'));
      body.append(details);
    });
  }

  function renderResults() {
    const l1 = getSelectedL1();
    const hasOther = byId('l1Other').checked;
    const l2 = getSelectedL2();
    const goals = l2;

    const area = filterCounty.value;
    const showSchool = updateSchoolFields();
    const schoolValue = showSchool ? filterSchoolCounty.value : 'UNKNOWN';
    const schoolCity = schoolValue === 'SAME' ? (area === 'ALL' ? '' : area) :
      (schoolValue === 'UNKNOWN' ? '' : schoolValue);
    const includeNational = resultsNational.checked;
    const category = filterCategory.value;
    const freeFilter = filterFree ? filterFree.value : 'ALL';
    const ownFilter = filterOwnership ? filterOwnership.value : 'ALL';
    const query = normalize(keyword.value.trim());

    const matches = [];
    for (const item of allItems) {
      if (!matchesLocation(item, area, schoolCity, includeNational)) continue;
      if (category !== 'ALL' && category !== item.category) continue;
      if (freeFilter === 'FREE' && !item.has_free_service) continue;
      if (freeFilter === 'PAID' && item.has_free_service) continue;
      if (ownFilter !== 'ALL' && item.ownership !== ownFilter) continue;
      if (query && !normalize([item.name, item.county, item.category, item.services_summary].join(' ')).includes(query)) continue;

      const topics = l1.filter((code) => (item.l1_tags || []).includes(code));
      const inquiries = goals.filter((code) => (item.inquiry_goals || []).includes(code));
      const services = (!l1.length || topics.length)
        ? goals.filter((code) => matchesServiceGoal(item, code)) : [];
      if (goals.length ? !services.length && !inquiries.length : l1.length && !topics.length) continue;
      const awaitingSchool = !schoolCity && Boolean(item.school_area_rule?.cities?.length);
      matches.push({ item, topics, inquiries, services, awaitingSchool });
    }
    matches.sort((a, b) => {
      if (area !== 'ALL') {
        const nationalOrder = Number(a.item.county === '全國/跨區') - Number(b.item.county === '全國/跨區');
        if (nationalOrder) return nationalOrder;
      }
      return b.topics.length - a.topics.length;
    });

    const descriptions = l1.map((code) => L1_LABELS[code]);
    if (hasOther) descriptions.push('其他困難');
    const difficulty = descriptions.join('、');
    const conditions = [];
    if (difficulty) conditions.push('觀察到的困難：' + difficulty);
    if (l2.length) conditions.push('想要的協助：' + l2.map((code) => L2_META[code].short).join('、'));
    conditions.push(area === 'ALL' ? '全部縣市' : '居住地：' + area);
    conditions.push(includeNational ? '含全國／跨區' : '不含全國／跨區');
    if (showSchool && (guided || schoolCity)) conditions.push(schoolCity ? '就學地：' + schoolCity : '就學地尚未指定');
    if (category !== 'ALL') conditions.push(category);
    if (freeFilter === 'FREE') conditions.push('有免費服務');
    else if (freeFilter === 'PAID') conditions.push('健保或自費');
    if (ownFilter !== 'ALL') conditions.push(ownFilter);
    if (query) conditions.push('關鍵字「' + keyword.value.trim() + '」');
    byId('activeSummary').replaceChildren(
      element('strong', 'summary-count', matches.length + ' 筆紀錄'),
      element('span', 'summary-criteria', conditions.join(' · '))
    );
    renderNextSteps(l2, goals, matches);

    const groupMeta = {
      free: {
        aTitle: '有免費服務', aBadge: '免費', aDesc: '包含免費諮詢、免費課後陪讀、公部門免費窗口或公益方案，實際資格與名額請向機構確認。',
        bTitle: '健保或自費服務', bBadge: '收費', bDesc: '依各醫療院所健保規定或民間機構自費標準收費，實際費用請先向窗口詢問。',
        isA: (item) => Boolean(item.has_free_service)
      },
      ownership: {
        aTitle: '公立機構／政府窗口', aBadge: '公立', aDesc: '含各縣市政府單位、學校特教／輔諮資源、公立與部立／市立醫院等。',
        bTitle: '私立機構／民間團體', bBadge: '私立', bDesc: '含民間職能／心理治療所、診所、財團／社團法人基金會與協會等。',
        isA: (item) => item.ownership === '公立'
      }
    }[groupBy];

    if (byId('groupATitleText')) byId('groupATitleText').textContent = groupMeta.aTitle;
    if (byId('groupBTitleText')) byId('groupBTitleText').textContent = groupMeta.bTitle;
    if (byId('groupABadge') && !byId('groupABadge').classList.contains('dot')) byId('groupABadge').textContent = groupMeta.aBadge;
    if (byId('groupBBadge') && !byId('groupBBadge').classList.contains('dot')) byId('groupBBadge').textContent = groupMeta.bBadge;
    if (byId('groupADesc')) byId('groupADesc').textContent = groupMeta.aDesc;
    if (byId('groupBDesc')) byId('groupBDesc').textContent = groupMeta.bDesc;

    const first = groups[0].section;
    const wrapper = byId('resourceGroups');
    if (first !== wrapper.firstElementChild) wrapper.prepend(first);

    groups.forEach((group, index) => {
      group.items = matches.filter(({ item }) => groupMeta.isA(item) === (index === 0));
      group.count.textContent = String(group.items.length);
      group.section.hidden = !group.items.length;
      group.grid.replaceChildren();
      appendBatch(group);
    });
    byId('emptyState').hidden = matches.length > 0;
  }

  function appendBatch(group, moveFocus = false) {
    const start = group.grid.childElementCount;
    const batch = group.items.slice(start, start + batchSize);
    const cards = batch.map(makeCard);
    group.grid.append(...cards);
    const remaining = group.items.length - start - batch.length;
    group.more.hidden = remaining === 0;
    group.more.textContent = '顯示更多（尚有 ' + remaining + ' 筆）';
    if (moveFocus && cards.length) cards[0].querySelector('h4').focus();
  }

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) el.textContent = content;
    return el;
  }

  function makeCard({ item, inquiries, services, topics, awaitingSchool }) {
    const card = element('article', 'service-card');
    const badges = element('div', 'card-badges');
    badges.append(
      element('span', 'badge badge-county', item.county),
      element('span', 'badge badge-cat', item.category),
      element('span', 'badge ' + (item.has_free_service ? 'badge-free' : 'badge-paid'), item.has_free_service ? '有免費服務' : '健保或自費'),
      element('span', 'badge ' + (item.ownership === '公立' ? 'badge-public' : 'badge-private'), item.ownership || '私立')
    );
    const title = element('h4', 'service-name', item.name);
    title.tabIndex = -1;
    card.append(badges, title);
    if (inquiries.length) {
      card.append(element('p', 'match-reason', '可先詢問：' + inquiries.map((code) => L2_META[code].short).join('、')));
    }
    const otherGoals = services.filter((code) => !inquiries.includes(code));
    if (otherGoals.length) {
      const label = awaitingSchool ? '先確認就學地，再詢問：' : '名錄線索，可聯絡了解：';
      card.append(element('p', 'match-reason', label + otherGoals.map((code) => L2_META[code].short).join('、')));
    }
    card.append(element('p', 'service-desc', item.services_summary));

    const meta = element('div', 'service-meta');
    meta.append(
      element('strong', 'service-contact-label', '聯絡窗口'),
      element('p', 'service-contact', item.public_contact || '請先向機構查詢聯絡與受理方式。')
    );
    if (item.address) {
      meta.append(element('p', 'service-address', '地址：' + item.address));
    }
    if (item.school_area_rule?.cities?.length) {
      const cities = item.school_area_rule.cities.join('、');
      const condition = awaitingSchool ? '就學地待確認。先問窗口是否服務孩子就讀的學校。' :
        '個別資格與轉介程序仍須向窗口確認。';
      meta.append(element('p', 'boundary-hint', '名錄列出的學校服務區域：' + cities + '。' + condition));
    } else if (isSchoolContact(item)) {
      meta.append(element('p', 'boundary-hint', '縣市標示為窗口所在地，適用的就學區域請先詢問。'));
    }
    const links = element('div', 'service-links');
    if (/^https?:\/\//i.test(item.official_url)) {
      const link = element('a', 'ext-link', '前往官方網站 ↗');
      link.href = item.official_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', item.name + '官方網站（另開分頁）');
      links.append(link);
    } else links.append(element('span', '', '原名錄未附官網'));
    if (item.map_url) {
      const mapLink = element('a', 'ext-link', 'Google 地圖 ↗');
      mapLink.href = item.map_url;
      mapLink.target = '_blank';
      mapLink.rel = 'noopener noreferrer';
      mapLink.setAttribute('aria-label', '在 Google 地圖查看' + item.name + '（另開分頁）');
      links.append(mapLink);
    }
    links.append(element('span', 'service-date', '查閱日 ' + item.checked_date));
    meta.append(links);
    card.append(meta);

    const matchedGoals = [...new Set([...inquiries, ...services])].map((code) => L2_META[code].short);
    const matchedTopics = topics.map((code) => L1_LABELS[code]);
    const notes = element('details', 'service-conditions');
    notes.append(element('summary', '', '符合哪些需求'));
    if (matchedTopics.length) {
      notes.append(element('p', '', '符合的困難面向：' + matchedTopics.join('、')));
    }
    if (matchedGoals.length) {
      notes.append(element('p', '', '符合的協助方向：' + matchedGoals.join('、')));
    }
    if (!matchedTopics.length && !matchedGoals.length) {
      const allL1 = (item.l1_tags || []).slice(0, 4).map((c) => L1_LABELS[c]).filter(Boolean);
      const allL2 = (item.l2_tags || []).slice(0, 4).map((c) => L2_META[c]?.short).filter(Boolean);
      if (allL1.length) notes.append(element('p', '', '可參考困難面向：' + allL1.join('、') + (item.l1_tags.length > 4 ? ' 等' : '')));
      if (allL2.length) notes.append(element('p', '', '可詢問協助方向：' + allL2.join('、') + (item.l2_tags.length > 4 ? ' 等' : '')));
    }
    notes.append(element('p', '', '聯絡前確認服務年齡、轉介或資格要求、費用及當期名額。'));
    card.append(notes);
    return card;
  }

  function updateSelectionNotes() {
    for (const n of [1, 2]) {
      const stepEl = byId('step-' + n);
      const count = stepEl.querySelectorAll('input[name="l' + n + '"]:checked, #l1Other:checked').length;
      byId('selection' + n).textContent = count ? '已選 ' + count + ' 項' : '尚未選擇';
    }
  }

  function bindEvents() {
    wizardForm.addEventListener('change', updateSelectionNotes);
    wizardForm.addEventListener('reset', () => queueMicrotask(updateSelectionNotes));
    bindGoalButtons();
    filterCounty.replaceChildren(...[...county.options].map((option) => option.cloneNode(true)));
    for (const option of county.options) {
      if (option.value !== 'ALL') schoolCounty.add(option.cloneNode(true));
    }
    filterSchoolCounty.replaceChildren(...[...schoolCounty.options].map((option) => option.cloneNode(true)));

    byId('clearStep1Btn').addEventListener('click', () => {
      wizardForm.querySelectorAll('[name="l1"], #l1Other').forEach((b) => { b.checked = false; });
      updateSelectionNotes();
    });
    byId('clearStep2Btn').addEventListener('click', () => {
      wizardForm.querySelectorAll('[name="l2"]').forEach((b) => { b.checked = false; });
      updateSelectionNotes();
      updateSchoolFields();
    });

    byId('toStep2Btn').addEventListener('click', () => goToStep(2));
    byId('backTo1Btn').addEventListener('click', () => goToStep(1));
    byId('toStep3Btn').addEventListener('click', () => goToStep(3));
    byId('backTo2Btn').addEventListener('click', () => goToStep(2));
    wizardForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (step === 3) showResults(true);
      else goToStep(step + 1);
    });
    byId('skipToAllBtn').addEventListener('click', () => showResults(false));
    byId('clearFiltersBtn').addEventListener('click', () => showResults(false, true));
    byId('emptyClearBtn')?.addEventListener('click', () => showResults(false));

    function returnToGuide() {
      results.hidden = true;
      wizard.hidden = false;
      if (byId('referencesSection')) byId('referencesSection').hidden = false;
      goToStep(1);
    }
    byId('restartWizardBtn').addEventListener('click', returnToGuide);
    byId('brandHome').addEventListener('click', returnToGuide);

    county.addEventListener('change', () => { filterCounty.value = county.value; });
    schoolCounty.addEventListener('change', () => { filterSchoolCounty.value = schoolCounty.value; });
    national.addEventListener('change', () => { resultsNational.checked = national.checked; });
    filterCounty.addEventListener('change', () => {
      county.value = filterCounty.value;
      renderResults();
    });
    filterSchoolCounty.addEventListener('change', () => {
      schoolCounty.value = filterSchoolCounty.value;
      renderResults();
    });
    resultsNational.addEventListener('change', () => {
      national.checked = resultsNational.checked;
      renderResults();
    });
    keyword.addEventListener('input', renderResults);
    filterCategory.addEventListener('change', renderResults);
    filterFree?.addEventListener('change', renderResults);
    filterOwnership?.addEventListener('change', renderResults);
    document.querySelectorAll('[data-groupby]').forEach((btn) => {
      btn.addEventListener('click', () => {
        groupBy = btn.dataset.groupby;
        document.querySelectorAll('[data-groupby]').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-selected', active);
          b.setAttribute('aria-pressed', String(active));
        });
        renderResults();
      });
    });
    byId('refineForm').addEventListener('submit', (event) => event.preventDefault());
    groups.forEach((group) => group.more.addEventListener('click', () => appendBatch(group, true)));

    const dialog = byId('legalDialog');
    byId('openLegalBtn').addEventListener('click', () => dialog.showModal());
    if (!('closedBy' in dialog)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
    }

    const fbDialog = byId('feedbackDialog');
    const fbForm = byId('feedbackForm');
    const fbStatus = byId('fbStatus');
    const exportBtn = byId('exportFeedbackBtn');
    const clearFbBtn = byId('clearFeedbackBtn');
    const fbSubmitBtn = fbForm?.querySelector('button[type="submit"]');
    const FB_KEY = 'childpath_anonymous_feedback_v1';
    // Configure either a Formspree/JSON endpoint OR a Google Forms formResponse endpoint:
    // e.g. { mode: 'formspree', url: 'https://formspree.io/f/XXXXXXXX' }
    //   or { mode: 'google_form', url: 'https://docs.google.com/forms/d/e/.../formResponse', fields: { type: 'entry.111', message: 'entry.222' } }
    const FEEDBACK_CONFIG = {
      mode: 'formspree',
      url: 'https://formspree.io/f/mdegbjdw',
      fields: { type: '', message: '' }
    };
    const readFb = () => {
      try { return JSON.parse(localStorage.getItem(FB_KEY) || '[]'); } catch { return []; }
    };
    const syncFbButtons = () => {
      const empty = readFb().length === 0;
      exportBtn.hidden = empty;
      if (clearFbBtn) clearFbBtn.hidden = empty;
    };
    byId('openFeedbackBtn')?.addEventListener('click', () => {
      fbStatus.hidden = true;
      syncFbButtons();
      fbDialog.showModal();
    });
    byId('closeFeedbackBtn')?.addEventListener('click', () => fbDialog.close());
    if (fbDialog && !('closedBy' in fbDialog)) {
      fbDialog.addEventListener('click', (event) => {
        if (event.target !== fbDialog) return;
        const rect = fbDialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) fbDialog.close();
      });
    }
    fbForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const entry = {
        submitted_at: new Date().toISOString(),
        type: byId('fbType').value,
        type_label: byId('fbType').selectedOptions[0]?.textContent || byId('fbType').value,
        message: byId('fbMessage').value.trim()
      };
      if (fbSubmitBtn) fbSubmitBtn.disabled = true;
      try {
        if (FEEDBACK_CONFIG.mode === 'google_form' && FEEDBACK_CONFIG.url) {
          const body = new FormData();
          body.append(FEEDBACK_CONFIG.fields.type, entry.type_label);
          body.append(FEEDBACK_CONFIG.fields.message, entry.message);
          await fetch(FEEDBACK_CONFIG.url, { method: 'POST', mode: 'no-cors', body });
          fbForm.reset();
          fbStatus.textContent = '已送出匿名回饋，感謝您的分享！';
        } else if (FEEDBACK_CONFIG.mode === 'formspree' && FEEDBACK_CONFIG.url) {
          const resp = await fetch(FEEDBACK_CONFIG.url, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 回饋類型: entry.type_label, 具體內容: entry.message, 送出時間: entry.submitted_at })
          });
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          fbForm.reset();
          fbStatus.textContent = '已送出匿名回饋，感謝您的分享！';
        } else {
          const list = readFb();
          list.push(entry);
          try { localStorage.setItem(FB_KEY, JSON.stringify(list)); } catch {}
          fbForm.reset();
          fbStatus.textContent = '已收到您的匿名回饋（尚未設定遠端接收端點，目前暫存於此裝置，共 ' + list.length + ' 筆）。';
          syncFbButtons();
        }
      } catch (err) {
        fbStatus.textContent = '送出時發生網路錯誤，請稍後再試。';
        console.error('Feedback submit error', err);
      } finally {
        fbStatus.hidden = false;
        if (fbSubmitBtn) fbSubmitBtn.disabled = false;
      }
    });
    clearFbBtn?.addEventListener('click', () => {
      try { localStorage.removeItem(FB_KEY); } catch {}
      syncFbButtons();
      fbStatus.textContent = '已清空本機暫存的匿名回饋紀錄。';
      fbStatus.hidden = false;
    });
    exportBtn?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(readFb(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'OneKindKnock-anonymous-feedback.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    byId('retryDataBtn').addEventListener('click', loadData);
  }

  bindEvents();
  loadData();
})();
