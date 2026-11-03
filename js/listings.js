// 매물 페이지(listings.html) 스크립트입니다.
// 광고 폴더의 매물은 상위 폴더의 매물_업데이트.py 가 js/listings-data.js 로 자동 생성합니다.
// 광고 폴더 없이 직접 추가할 매물이 있으면 아래 SK_LISTINGS 배열에 적어주세요.
// 가격 단위는 만원입니다. (sale = 매매가 / deposit = 보증금 / monthly = 월세)
// 면적 단위는 ㎡ 입니다. (평은 자동 계산)

const SK_LISTINGS = [
    // 예시)
    // {
    //     id: "manual-001",
    //     type: "공장",                    // 공장 / 사무실
    //     deals: ["임대"],                 // ["매매"] / ["임대"] / ["매매", "임대"]
    //     building: "테크동",              // 넥스동 / 테크동 / 메카동
    //     floor: "2층",
    //     area: 330,                       // 전용면적 ㎡
    //     deposit: 2000,
    //     monthly: 300,
    //     title: "드라이브인 가능한 제조 공장",
    //     tags: ["드라이브인", "공장등록"],
    //     images: ["images/listings/예시/01.jpg"],
    //     desc: "매물 설명",
    //     date: "2026-10-27"
    // },
];

(function () {
    const STORE_KEY = 'sk-listings-local';
    // 사진이 없는 매물은 다른 사진 대신 '사진 준비 중' 표시를 보여줍니다. (예전 기본 사진 경로도 사진 없음으로 취급)
    const OLD_DEFAULT_IMAGES = ["새 폴더 (3)/sk테크노파크-공간구성/제조·가공 공장.png", "새 폴더 (3)/sk테크노파크-공간구성/사무실.png"];
    const NO_PHOTO_ICON = { "공장": "factory", "사무실": "business_center" };

    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const icon = n => '<span class="material-symbols-outlined" aria-hidden="true">' + n + '</span>';

    // 이 브라우저에서 등록한 매물 (localStorage)
    function loadLocal() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
    }
    function saveLocal(list) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
    }

    // 예전 형식(deal/price/image)도 같은 형식으로 맞춤
    function normalize(p) {
        const n = Object.assign({}, p);
        if (!n.deals) n.deals = [n.deal || '임대'];
        if (n.price != null && n.sale == null && n.deposit == null) {
            if (n.deals[0] === '매매') n.sale = n.price; else n.deposit = n.price;
        }
        n.images = (n.images || (n.image ? [n.image] : [])).filter(src => src && !OLD_DEFAULT_IMAGES.includes(src));
        return n;
    }

    function noPhoto(p, cls) {
        return '<div class="lst-nophoto ' + cls + '" role="img" aria-label="사진 준비 중">'
            + icon(NO_PHOTO_ICON[p.type] || 'factory')
            + '<strong>사진 준비 중</strong></div>';
    }

    let local = loadLocal();
    let deal = '전체', type = '전체', uploaded = null, toastTimer;
    const all = () => local.concat(window.SK_LISTINGS_AUTO || [], SK_LISTINGS).map(normalize);

    function amount(n) {
        n = Number(n) || 0;
        if (n >= 10000) return Math.floor(n / 10000) + '억' + (n % 10000 ? ' ' + (n % 10000).toLocaleString() : '');
        return n.toLocaleString();
    }
    function priceLines(p) {
        const lines = [];
        if (p.deals.includes('매매') && p.sale) lines.push('매매 ' + amount(p.sale));
        if (p.deals.includes('임대')) lines.push('임대 ' + amount(p.deposit) + ' / ' + amount(p.monthly));
        return lines;
    }
    const pyeong = m2 => (Number(m2) / 3.3058).toFixed(1);
    // 가격 낮은 순: 임대(월세, 같으면 보증금) 다음 매매(매매가). 높은 순은 그 반대. 월세와 매매가는 단위가 달라 섞지 않습니다.
    const byPrice = (a, b) => Boolean(a.sale) - Boolean(b.sale)
        || (a.sale || a.monthly || 0) - (b.sale || b.monthly || 0)
        || (a.deposit || 0) - (b.deposit || 0);

    function notify(t) {
        const el = $('lst-toast');
        el.textContent = t;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
    }

    function render() {
        let rows = all().filter(p => (deal === '전체' || p.deals.includes(deal)) && (type === '전체' || p.type === type));
        const sort = $('lst-sort').value;
        rows.sort(sort === 'high' ? (a, b) => byPrice(b, a) : byPrice);

        const filtered = deal !== '전체' || type !== '전체';
        $('lst-sub').textContent = filtered ? rows.length + '개의 매물을 찾았어요' : 'SK테크노파크 단지 내 공장·사무실 매물을 확인하세요.';

        $('lst-cards').innerHTML = rows.length ? rows.map(p => {
            const badge = p.local ? '내가 등록한 매물' : p.deals.join('·');
            return '<article class="lst-card" tabindex="0" role="button" aria-label="' + esc(p.title) + ' 상세 보기" data-id="' + esc(p.id) + '">'
                + '<div class="lst-photo">' + (p.images.length ? '<img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="lazy">' : noPhoto(p, ''))
                + '<span class="lst-badge">' + icon('verified') + esc(badge) + '</span>'
                + (p.images.length > 1 ? '<span class="lst-count">' + icon('photo_library') + p.images.length + '</span>' : '')
                + '</div>'
                + '<div class="lst-info">'
                + '<div class="lst-type"><span>' + esc(p.type) + ' · ' + esc(p.floor) + '</span></div>'
                + '<div class="lst-price">' + priceLines(p).map(l => '<span>' + esc(l) + '</span>').join('') + '</div>'
                + '<h3 class="lst-name">' + esc(p.title) + '</h3>'
                + '<div class="lst-details">전용 ' + esc(p.area) + '㎡ (' + pyeong(p.area) + '평)</div>'
                + '<div class="lst-tags">' + (p.tags || []).map(t => '<span>' + esc(t) + '</span>').join('') + '</div>'
                + '</div></article>';
        }).join('') : '<div class="lst-empty">' + (all().length ? '조건에 맞는 매물이 아직 없어요.' : '현재 등록된 매물이 없어요.')
            + '<br>원하시는 조건을 말씀해 주시면 직접 찾아드립니다.'
            + '<div class="lst-empty-actions">' + (all().length ? '<button type="button" class="lst-primary" data-action="reset">전체 매물 보기</button>' : '')
            + '<a class="lst-outline" href="tel:010-5623-2454">' + icon('phone') + '010-5623-2454</a></div></div>';

        document.querySelectorAll('[data-lst-deal]').forEach(b => {
            b.classList.toggle('active', b.dataset.lstDeal === deal);
            b.setAttribute('aria-pressed', b.dataset.lstDeal === deal);
        });
        document.querySelectorAll('[data-lst-type]').forEach(b => {
            b.classList.toggle('active', b.dataset.lstType === type);
            b.setAttribute('aria-pressed', b.dataset.lstType === type);
        });
    }

    function reset() {
        deal = type = '전체';
        render();
    }

    function openDetail(id) {
        const p = all().find(p => String(p.id) === String(id));
        if (!p) return;
        const details = Object.assign({ '층수': p.floor, '매물 유형': p.type }, p.details || {});
        if (!details['전용면적']) details['전용면적'] = p.area + '㎡ (' + pyeong(p.area) + '평)';
        $('lst-detail-title').textContent = p.floor + ' ' + p.type;
        $('lst-detail-content').innerHTML =
            '<div class="lst-gallery">'
            + (p.images.length ? '<img class="lst-detail-photo" id="lst-main-photo" src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '">' : noPhoto(p, 'lst-nophoto-lg'))
            + (p.images.length > 1 ? '<div class="lst-thumbs">' + p.images.map((src, i) =>
                '<button type="button" class="lst-thumb' + (i ? '' : ' active') + '" data-src="' + esc(src) + '" aria-label="사진 ' + (i + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>').join('') + '</div>' : '')
            + '</div>'
            + '<div class="lst-detail-body">'
            + '<h3>' + priceLines(p).map(esc).join('<br>') + '</h3>'
            + '<p class="lst-detail-lead">' + esc(p.title) + '</p>'
            + '<dl class="lst-spec">' + Object.entries(details).map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>'
            + '<p>' + esc(p.desc) + '</p>'
            + '<p class="lst-vat">가격은 부가세 별도입니다.</p>'
            + '<div class="lst-detail-actions">'
            + '<a class="lst-primary" href="tel:010-5623-2454">' + icon('phone') + '전화 문의 010-5623-2454</a>'
            + (p.local ? '<button type="button" class="lst-outline lst-danger" data-action="delete" data-id="' + esc(p.id) + '">' + icon('delete') + '매물 삭제</button>' : '')
            + '</div></div>';
        $('lst-detail').showModal();
        $('lst-detail').scrollTop = 0;
    }

    // 업로드 사진은 저장 용량을 줄이기 위해 최대 1200px JPEG로 축소합니다.
    function shrink(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const img = new Image();
                img.onerror = reject;
                img.onload = () => {
                    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const uploadPlaceholder = () => icon('upload') + '<strong>매물이 잘 보이는 사진을 올려주세요</strong>클릭하여 사진 선택 · JPG, PNG, WEBP · 최대 10MB';

    function resetRegisterForm() {
        $('lst-register-form').reset();
        uploaded = null;
        $('lst-upload-text').innerHTML = uploadPlaceholder();
        $('lst-new-deal').onchange();
    }

    window.openRegister = () => $('lst-register').showModal();

    document.addEventListener('DOMContentLoaded', () => {
        if (!$('lst-cards')) return;

        document.querySelectorAll('[data-lst-deal]').forEach(b => b.onclick = () => { deal = b.dataset.lstDeal; render(); });
        document.querySelectorAll('[data-lst-type]').forEach(b => b.onclick = () => { type = b.dataset.lstType; render(); });
        $('lst-sort').onchange = render;
        $('lst-search').onsubmit = e => e.preventDefault();

        $('lst-cards').addEventListener('click', e => {
            if (e.target.closest('[data-action="reset"]')) return reset();
            const card = e.target.closest('.lst-card');
            if (card) openDetail(card.dataset.id);
        });
        $('lst-cards').addEventListener('keydown', e => {
            const card = e.target.closest('.lst-card');
            if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(card.dataset.id); }
        });

        $('lst-detail-content').addEventListener('click', e => {
            const thumb = e.target.closest('.lst-thumb');
            if (thumb) {
                $('lst-main-photo').src = thumb.dataset.src;
                document.querySelectorAll('.lst-thumb').forEach(t => t.classList.toggle('active', t === thumb));
                return;
            }
            const btn = e.target.closest('[data-action="delete"]');
            if (!btn || !confirm('이 매물을 삭제할까요?')) return;
            local = local.filter(p => String(p.id) !== btn.dataset.id);
            saveLocal(local);
            $('lst-detail').close();
            render();
            notify('매물을 삭제했어요.');
        });

        $('lst-new-deal').onchange = () => {
            const isRent = $('lst-new-deal').value === '임대';
            $('lst-monthly-field').hidden = !isRent;
            $('lst-new-monthly').required = isRent;
            $('lst-price-label').textContent = (isRent ? '보증금' : '매매가') + ' (만원) *';
        };
        $('lst-new-deal').onchange();

        $('lst-photo-input').onchange = async e => {
            const f = e.target.files[0];
            if (!f) return;
            if (f.size > 10485760 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
                notify('10MB 이하의 JPG, PNG, WEBP 사진을 선택해주세요.');
                e.target.value = '';
                return;
            }
            try {
                uploaded = await shrink(f);
                $('lst-upload-text').innerHTML = '<img src="' + uploaded + '" alt="업로드 사진 미리보기"><strong>' + esc(f.name) + '</strong>';
            } catch (err) {
                notify('사진을 불러오지 못했어요. 다른 사진을 선택해주세요.');
                e.target.value = '';
            }
        };

        $('lst-register-form').onsubmit = e => {
            e.preventDefault();
            const title = $('lst-new-title').value.trim();
            if (!title) { notify('매물 제목을 입력해주세요.'); return; }
            const t = $('lst-new-type').value;
            const d = $('lst-new-deal').value;
            const price = Number($('lst-new-price').value);
            const item = {
                id: 'local-' + Date.now(),
                local: true,
                type: t,
                deals: [d],
                building: $('lst-new-building').value,
                floor: $('lst-new-floor').value.trim() || '층 미입력',
                area: Number($('lst-new-area').value),
                title,
                tags: $('lst-new-tags').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4),
                images: uploaded ? [uploaded] : [],
                desc: $('lst-new-desc').value.trim() || '상세 내용은 전화로 문의해 주세요.',
                date: new Date().toISOString().slice(0, 10)
            };
            if (d === '매매') item.sale = price;
            else { item.deposit = price; item.monthly = Number($('lst-new-monthly').value) || 0; }
            local.unshift(item);
            if (!saveLocal(local)) {
                local.shift();
                notify('저장 공간이 부족해 등록하지 못했어요. 사진을 빼거나 더 작은 사진으로 다시 시도해주세요.');
                return;
            }
            $('lst-register').close();
            resetRegisterForm();
            reset();
            render();
            $('listings').scrollIntoView({ behavior: 'smooth' });
            notify('매물이 등록되었어요.');
        };

        if (location.hash === '#register') openRegister();
        render();
    });
})();
