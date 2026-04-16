document.addEventListener('DOMContentLoaded', () => {
    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────
    const state = {
        currentStep: 1,
        articleType: 'typeA',  // 기본값: 첫 번째 탭 '\ud589사 \ucc38\uc5ec'
        specific: {}
    };

    const TOTAL_STEPS = 2;

    // ─────────────────────────────────────────────
    // DOM References
    // ─────────────────────────────────────────────
    const formSteps         = document.querySelectorAll('.form-step');
    const tabs              = document.querySelectorAll('.tab');
    const articleTypeHidden = document.getElementById('articleType');
    const typeFieldDivs     = document.querySelectorAll('.type-fields');
    const form              = document.getElementById('articleForm');

    const backBtn   = document.getElementById('backBtn');
    const resetBtn  = document.getElementById('resetBtn');
    const nextBtn   = document.getElementById('nextBtn');
    const copyBtn      = document.getElementById('copyBtn');
    const modalSubtitle = document.getElementById('modalSubtitle');

    // ─────────────────────────────────────────────
    // 유형별 데이터 매핑 테이블
    // UI에서 삭제된 공통 변수(topic, main_content)를
    // 유형별 특화 필드에서 자동으로 채워 백엔드로 전달합니다.
    // ─────────────────────────────────────────────
    const TYPE_FIELD_MAP = {
        typeA: { topic: 'event_name',   main_content: 'event_role'    },
        typeB: { topic: 'cert_name',    main_content: 'cert_core'     },
        typeC: { topic: 'launch_name',  main_content: 'launch_solution'},
        typeD: { topic: 'achieve_name', main_content: 'achieve_case'  }
    };

    // ─────────────────────────────────────────────
    // Tab Selection → Conditional Rendering
    // ─────────────────────────────────────────────
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedType = tab.dataset.type;

            // 이미 선택된 탭을 다시 클릭해도 그대로 유지 (탭은 항상 선택 상태)
            if (state.articleType === selectedType) return;

            // 탭 활성 상태 업데이트
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 상태 저장
            state.articleType = selectedType;
            articleTypeHidden.value = selectedType;

            // 해당 유형 필드 열기
            showTypeFields(selectedType);

            // 유효성 재검사
            validateStep1();
        });
    });

    function showTypeFields(type) {
        typeFieldDivs.forEach(div => {
            if (div.id === `${type}_fields`) {
                div.classList.add('expanded');
            } else {
                div.classList.remove('expanded');
            }
        });
    }

    function collapseAllTypeFields() {
        typeFieldDivs.forEach(div => div.classList.remove('expanded'));
    }

    // ─────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────
    function validateStep1() {
        // 활성 유형 내부의 keywords 필드에서 값을 읽음
        // (keywords 필드가 각 type-fields-inner 첫 번째 항목으로 이동됨)
        let keywordsValue = '';
        if (state.articleType) {
            const activeKeywordsEl = document.getElementById(`keywords_${state.articleType.replace('type', '')}`)
                                  || document.querySelector(`#${state.articleType}_fields input[name="keywords"]`);
            if (activeKeywordsEl) keywordsValue = activeKeywordsEl.value.trim();
        }

        if (!keywordsValue || !state.articleType) {
            nextBtn.disabled = true;
            return;
        }

        const companyVal = document.getElementById('company').value.trim();
        if (!companyVal) {
            nextBtn.disabled = true;
            return;
        }

        // 선택된 유형의 필수 입력 검사
        // 제외 목록: _quote(선택), event_metrics(선택), keywords_*(이미 검사)
        // typeA는 몇 필드를 keywords_*와 함께 field-row 하위 필드도 포함됨
        const OPTIONAL_IDS = new Set([
            'event_metrics',   // 행사 규모 및 성과 수치 - 선택
            'launch_promo',    // 런칭 프로모션 - 선택
            'achieve_case',    // 우수 사례 - 선택
            'speaker_A', 'speaker_B', 'speaker_C', 'speaker_D', // 관계자명 및 직함 - 선택
            'event_quote', 'cert_quote', 'launch_quote', 'achieve_quote'  // 코멘트 - 선택
        ]);
        const OPTIONAL_NAME_PREFIXES = ['keywords'];

        const targetFields = document.getElementById(`${state.articleType}_fields`);
        const requiredInputs = targetFields.querySelectorAll('input:not([type="hidden"]), textarea');
        let allFilled = true;
        requiredInputs.forEach(input => {
            const isOptionalById   = OPTIONAL_IDS.has(input.id);
            const isOptionalByName = OPTIONAL_NAME_PREFIXES.some(prefix => input.name?.startsWith(prefix));
            if (!isOptionalById && !isOptionalByName && !input.value.trim()) {
                allFilled = false;
            }
        });

        nextBtn.disabled = !allFilled;
    }

    // 모든 입력 이벤트에 유효성 재검사 연결
    form.addEventListener('input', () => {
        if (state.currentStep === 1) validateStep1();
    });

    // ─────────────────────────────────────────────
    // View Update (버튼 가시성)
    // ─────────────────────────────────────────────
    function updateView() {
        const step = state.currentStep;

        // Form 섹션 전환
        formSteps.forEach((el, index) => {
            if (index + 1 === step) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // 버튼 가시성
        if (step === 1) {
            backBtn.classList.add('hidden');
            resetBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
            copyBtn.classList.add('hidden');
            validateStep1();
        } else {
            // step2: loading / result 상태
            nextBtn.classList.add('hidden');
            backBtn.classList.add('hidden');
            resetBtn.classList.add('hidden');
            copyBtn.classList.add('hidden');
        }
    }

    // ─────────────────────────────────────────────
    // Next / Back Buttons
    // ─────────────────────────────────────────────
    nextBtn.addEventListener('click', () => {
        if (state.currentStep < TOTAL_STEPS) {
            state.currentStep++;
            updateView();
            submitArticle();
        }
    });

    backBtn.addEventListener('click', () => {
        if (state.currentStep > 1) {
            state.currentStep--;
            updateView();
        }
    });

    // ─────────────────────────────────────────────
    // Reset / Start Over
    // ─────────────────────────────────────────────
    resetBtn.addEventListener('click', () => {
        form.reset();

        state.currentStep = 1;
        state.articleType = '';
        state.specific = {};

        tabs.forEach(t => t.classList.remove('active'));
        // 첫 번째 탭('행사 참여') 로 복원
        const firstTab = document.querySelector('.tab[data-type="typeA"]');
        if (firstTab) firstTab.classList.add('active');
        articleTypeHidden.value = 'typeA';
        state.articleType = 'typeA';
        showTypeFields('typeA');

        // 모든 유형별 keywords 필드 초기화
        document.querySelectorAll('input[name="keywords"], input[id^="keywords_"]').forEach(el => el.value = '');

        document.getElementById('resultState').classList.add('hidden');
        document.getElementById('loadingState').classList.add('hidden');
        modalSubtitle.classList.remove('hidden');
        const outputEl = document.getElementById('finalArticleOutput');
        outputEl.value = '';
        outputEl.style.height = 'auto';

        updateView();
    });

    // ─────────────────────────────────────────────
    // Submit (AI 생성 요청)
    // ─────────────────────────────────────────────
    const modalFooter = document.querySelector('.modal-footer');

    async function submitArticle() {
        // Loading 상태 즉시 표시 + footer 숨김 + 설명 문구 숨김
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('resultState').classList.add('hidden');
        modalFooter.classList.add('hidden');
        modalSubtitle.classList.add('hidden');

        const formData = new FormData(form);
        const currentType = state.articleType;

        const activeKeywordsEl = document.querySelector(`#${currentType}_fields input[name="keywords"]`);
        const keywordsValue = activeKeywordsEl ? activeKeywordsEl.value.trim() : '';

        const activeSpeakerEl = document.querySelector(`#${currentType}_fields input[name="speaker"]`);
        const speakerValue = activeSpeakerEl ? activeSpeakerEl.value.trim() : '';

        // ─── 특화 데이터 수집 ───
        const collectedSpecific = {};
        if (currentType) {
            for (let [key, value] of formData.entries()) {
                if (!['keywords', 'articleType', 'speaker'].includes(key)) {
                    collectedSpecific[key] = value || '';
                }
            }
        }
        collectedSpecific.speaker = speakerValue;

        // ─── [typeA 전용] 분리된 3필드를 event_info로 병합 ───────────────────────
        // event_date, event_place, event_org → "일시: [v], 장소: [v], 주최: [v]" 형태
        if (currentType === 'typeA') {
            const rawDate  = collectedSpecific.event_date  || '';
            const place    = collectedSpecific.event_place || '';
            const org      = collectedSpecific.event_org   || '';

            // 날짜 YYYY-MM-DD → 한국어 패턴으로 변환
            let formattedDate = rawDate;
            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d)) {
                    formattedDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                }
            }

            const parts = [];
            if (formattedDate) parts.push(`일시: ${formattedDate}`);
            if (place)         parts.push(`장소: ${place}`);
            if (org)           parts.push(`주최: ${org}`);
            collectedSpecific.event_info = parts.join(', ');

            // 프론트엔드에서만 사용하는 리터럴 필드는 payload에서 제거
            delete collectedSpecific.event_date;
            delete collectedSpecific.event_place;
            delete collectedSpecific.event_org;
        }

        state.specific = collectedSpecific;

        // ─── 공통 변수 자동 매핑 ───────────────────────────────────────
        const mapping = TYPE_FIELD_MAP[currentType];
        const mappedTopic       = mapping ? (collectedSpecific[mapping.topic]        || '') : '';
        const mappedMainContent = mapping ? (collectedSpecific[mapping.main_content] || '') : '';

        const collectedCommon = {
            topic:        mappedTopic,
            main_content: mappedMainContent,
            keywords:     keywordsValue
        };

        const payload = {
            articleType: currentType,
            common:      collectedCommon,
            specific:    collectedSpecific
        };

        console.log('\n[DEBUG] 프론트엔드 → 백엔드 API 요청 페이로드:');
        console.log(JSON.stringify(payload, null, 2));
        console.log('[매핑 정보]', {
            topic:        `${mapping?.topic} → topic`,
            main_content: `${mapping?.main_content} → main_content`,
            category:     '고정값 (서버에서 주입)'
        });

        try {
            const response = await fetch('/api/generate', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                document.getElementById('resultState').classList.remove('hidden');

                const rawText = data.final_text.replace(/\[최종 보도자료\]\s*/g, '').trim();
                
                // Parsing logic
                let mainTitle = '';
                let varTitle1 = '';
                let varTitle2 = '';
                let bodyText = '';

                // Extract titles
                const titleMatch = rawText.match(/제목:\s*(.+?)(?=\n|$)/);
                if (titleMatch) mainTitle = titleMatch[1].trim();

                const var1Match = rawText.match(/\(베리에이션 1:\s*(.+?)\)/);
                if (var1Match) varTitle1 = var1Match[1].trim();

                const var2Match = rawText.match(/\(베리에이션 2:\s*(.+?)\)/);
                if (var2Match) varTitle2 = var2Match[1].trim();

                // Extract body text
                const bodyTextIdx = rawText.indexOf('본문:');
                if (bodyTextIdx !== -1) {
                    bodyText = rawText.substring(bodyTextIdx + '본문:'.length).trim();
                } else {
                    bodyText = rawText; // Fallback
                }

                // UI Update
                const mainTitleEl = document.getElementById('mainTitleOutput');
                mainTitleEl.value = mainTitle;
                mainTitleEl.style.height = 'auto';
                mainTitleEl.style.height = mainTitleEl.scrollHeight + 'px';

                const bodyTextEl = document.getElementById('bodyTextOutput');
                bodyTextEl.value = bodyText;
                bodyTextEl.style.height = 'auto';
                bodyTextEl.style.height = bodyTextEl.scrollHeight + 'px';

                // Chips Rendering
                const chipsContainer = document.getElementById('variationChips');
                chipsContainer.innerHTML = ''; // Clear existing chips

                let activeChipEl = null;

                const addChip = (titleText, label, isDefault = false) => {
                    if (!titleText) return;
                    const chip = document.createElement('div');
                    chip.className = 'variation-chip';
                    chip.innerHTML = `
                        <span class="chip-checkbox">
                            <svg width="10" height="8" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                                <path d="M1 5L4.5 8.5L11 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                        <span class="chip-text">${label}</span>
                    `;
                    
                    // Click chip to replace main title
                    const activateChip = () => {
                        // Handle active state
                        if (activeChipEl) {
                            activeChipEl.classList.remove('active');
                            const activeSvg = activeChipEl.querySelector('svg');
                            if (activeSvg) activeSvg.style.display = 'none';
                        }
                        
                        chip.classList.add('active');
                        const svg = chip.querySelector('svg');
                        if (svg) svg.style.display = 'block';
                        activeChipEl = chip;
                        
                        mainTitleEl.value = titleText;
                        mainTitleEl.style.height = 'auto';
                        mainTitleEl.style.height = mainTitleEl.scrollHeight + 'px';
                    };

                    chip.addEventListener('click', activateChip);

                    chipsContainer.appendChild(chip);

                    if (isDefault) {
                        activateChip();
                    }
                };

                addChip(mainTitle, '제목 1', true);
                addChip(varTitle1, '제목 2');
                addChip(varTitle2, '제목 3');

                copyBtn.classList.remove('hidden');
                resetBtn.classList.remove('hidden');
                modalFooter.classList.remove('hidden');
            } else {
                alert('에러 발생: ' + (data.error || '알 수 없는 오류'));
                state.currentStep = 1;
                updateView();
                modalFooter.classList.remove('hidden');
                modalSubtitle.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('서버와 통신할 수 없습니다. (Node.js 서버가 실행 중인지 확인하세요)');
            state.currentStep = 1;
            updateView();
            modalFooter.classList.remove('hidden');
            modalSubtitle.classList.remove('hidden');
        } finally {
            document.getElementById('loadingState').classList.add('hidden');
        }
    }

    // ─────────────────────────────────────────────
    // Copy
    // ─────────────────────────────────────────────
    copyBtn.addEventListener('click', () => {
        const mainTitle = document.getElementById('mainTitleOutput').value.trim();
        const bodyText = document.getElementById('bodyTextOutput').value.trim();
        
        let textToCopy = '';
        if (mainTitle) textToCopy += mainTitle + '\n\n';
        textToCopy += bodyText;

        navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.innerText = '복사 완료! ✅';
            setTimeout(() => { copyBtn.innerText = '복사하기'; }, 2000);
        }).catch(() => {
            alert('복사하기에 실패했습니다. 직접 텍스트를 드래그하여 복사해주세요.');
        });
    });

    // ─────────────────────────────────────────────
    // Textarea Auto-resize
    // ─────────────────────────────────────────────
    const autoResize = function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    };

    document.getElementById('mainTitleOutput').addEventListener('input', autoResize);
    document.getElementById('bodyTextOutput').addEventListener('input', autoResize);

    // ─────────────────────────────────────────────
    // Init — 첫 번째 탭(행사 참여)을 기본 선택 상태로 설정
    // ─────────────────────────────────────────────
    const defaultTab = document.querySelector('.tab[data-type="typeA"]');
    if (defaultTab) defaultTab.classList.add('active');
    articleTypeHidden.value = 'typeA';
    showTypeFields('typeA');
    updateView();
});
