document.addEventListener('DOMContentLoaded', () => {
    // Current step index (1, 2, or 3)
    let currentStepIndex = 1;
    const TOTAL_STEPS = 3;

    // DOM Elements - Stepper
    const stepsIndicators = document.querySelectorAll('.step');
    const formSteps = document.querySelectorAll('.form-step');
    
    // DOM Elements - Form & Fields
    const articleTypeSelect = document.getElementById('articleType');
    const typeFields = document.querySelectorAll('.type-fields');
    const emptySpecificFields = document.getElementById('emptySpecificFields');
    
    // DOM Elements - Buttons
    const backBtn = document.getElementById('backBtn');
    const resetBtn = document.getElementById('resetBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const copyBtn = document.getElementById('copyBtn');
    const form = document.getElementById('articleForm');

    // State Variables
    const state = {
        common: {},
        specific: {},
        articleType: ''
    };

    /**
     * Stepper & View Update Logic
     */
    function updateView() {
        // 1. Update Stepper GUI
        stepsIndicators.forEach((indicator, index) => {
            if (index < currentStepIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        // 2. Form Views
        formSteps.forEach((stepEl, index) => {
            if (index + 1 === currentStepIndex) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.remove('active');
            }
        });

        // 3. Buttons
        if (currentStepIndex === 1) {
            backBtn.classList.add('hidden');
            resetBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
            copyBtn.classList.add('hidden');
        } else if (currentStepIndex === TOTAL_STEPS) {
            nextBtn.classList.add('hidden');
            
            // 만약 이미 결과창이 떠있다면 복사버튼/다시만들기를, 아니라면 제출/뒤로가기를 노출
            const resultState = document.getElementById('resultState');
            if (resultState && !resultState.classList.contains('hidden')) {
                backBtn.classList.add('hidden');
                resetBtn.classList.remove('hidden');
                submitBtn.classList.add('hidden');
                copyBtn.classList.remove('hidden');
            } else {
                backBtn.classList.remove('hidden');
                resetBtn.classList.add('hidden');
                submitBtn.classList.remove('hidden');
                copyBtn.classList.add('hidden');
            }
        } else {
            backBtn.classList.remove('hidden');
            resetBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
            copyBtn.classList.add('hidden');
        }
        
        validateCurrentStep();
    }

    /**
     * Form Validation Logic
     */
    function validateCurrentStep() {
        let isValid = true;
        if (currentStepIndex === 1) {
            const requiredIds = ['topic', 'main_content', 'category', 'keywords', 'articleType'];
            requiredIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el || !el.value.trim() || el.value === 'none') {
                    isValid = false;
                }
            });
            nextBtn.disabled = !isValid;
        } else if (currentStepIndex === 2) {
            const currentType = state.articleType;
            if (currentType) {
                const targetFields = document.getElementById(`${currentType}_fields`);
                const inputs = targetFields.querySelectorAll('input, textarea');
                inputs.forEach(input => {
                    // _quote로 끝나는 코멘트 항목은 옵션이므로 필수 체크에서 제외
                    if (!input.id.endsWith('_quote') && !input.value.trim()) {
                        isValid = false;
                    }
                });
            } else {
                isValid = false;
            }
            submitBtn.disabled = !isValid;
        }
    }

    // Bind validation events to all inputs
    const allInputs = form.querySelectorAll('input, textarea, select');
    allInputs.forEach(input => {
        input.addEventListener('input', validateCurrentStep);
        input.addEventListener('change', validateCurrentStep);
    });

    /**
     * Next / Back Button Handlers
     */
    nextBtn.addEventListener('click', () => {
        // Validation for step 1
        if (currentStepIndex === 1) {
            const tempType = articleTypeSelect.value;
            // Native HTML5 validity check on the active form section
            const step1Inputs = document.querySelectorAll('#step1 input[required], #step1 textarea[required], #step1 select[required]');
            let isValid = true;
            step1Inputs.forEach(input => {
                if(!input.checkValidity()) {
                    input.reportValidity();
                    isValid = false;
                }
            });
            // Proceed anyway if not enforcing strictly here, but good standard.
            
            // Re-render Step 2 contents based on selection
            if(tempType) {
                emptySpecificFields.classList.add('hidden');
            } else {
                emptySpecificFields.classList.remove('hidden');
            }
        }

        if (currentStepIndex < TOTAL_STEPS) {
            currentStepIndex++;
            updateView();
        }
    });

    backBtn.addEventListener('click', () => {
        if (currentStepIndex > 1) {
            currentStepIndex--;
            updateView();
        }
    });

    /**
     * Reset / Start Over Handler (Step 3)
     */
    resetBtn.addEventListener('click', () => {
        // 1. Form Reset
        form.reset();
        
        // 2. State Reset
        state.common = {};
        state.specific = {};
        state.articleType = '';
        
        // 3. UI Reset
        typeFields.forEach(field => field.classList.add('hidden'));
        emptySpecificFields.classList.remove('hidden');
        
        document.getElementById('resultState').classList.add('hidden');
        document.getElementById('readyMessage').classList.remove('hidden');
        document.getElementById('finalArticleOutput').value = '';
        document.getElementById('finalArticleOutput').style.height = 'auto';
        
        // 4. Return to Step 1
        currentStepIndex = 1;
        updateView();
        validateCurrentStep();
    });

    /**
     * Type Change logic
     */
    articleTypeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        state.articleType = selectedType;

        // Hide all specifics
        typeFields.forEach(field => {
            field.classList.add('hidden');
            // Remove required
            const inputs = field.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.required = false;
            });
        });

        if (selectedType) {
            emptySpecificFields.classList.add('hidden');
            const targetFields = document.getElementById(`${selectedType}_fields`);
            if (targetFields) {
                targetFields.classList.remove('hidden');
            }
        }
        validateCurrentStep();
    });

    /**
     * Submit Logic
     */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Loading UI 전환 및 제출/뒤로가기 버튼 비활성화 (숨기지 않고 유지)
        document.getElementById('readyMessage').classList.add('hidden');
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('resultState').classList.add('hidden');
        
        submitBtn.disabled = true;
        backBtn.disabled = true;
        resetBtn.classList.add('hidden'); // 혹시 모를 상황 대비 숨김 유지

        // 확실한 데이터 수집을 위해 HTML5 FormData API를 사용합니다.
        const formData = new FormData(form);
        const currentType = formData.get('articleType');
        
        const collectedCommon = {
            topic: formData.get('topic') || '',
            main_content: formData.get('main_content') || '',
            category: formData.get('category') || '',
            keywords: formData.get('keywords') || ''
        };

        const collectedSpecific = {};
        if (currentType && currentType !== 'none') {
            for (let [key, value] of formData.entries()) {
                if (!['topic', 'main_content', 'category', 'keywords', 'articleType'].includes(key)) {
                    collectedSpecific[key] = value || '';
                }
            }
        }

        // 전송할 페이로드 객체 조립 및 State 동기화
        state.common = collectedCommon;
        state.specific = collectedSpecific;
        state.articleType = currentType;

        const payload = {
            articleType: state.articleType,
            common: state.common,
            specific: state.specific
        };

        console.log('\n[DEBUG] 1. 프론트엔드 API 요청 직전 페이로드 데이터');
        console.log(JSON.stringify(payload, null, 2));

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                document.getElementById('resultState').classList.remove('hidden');
                
                const outputEl = document.getElementById('finalArticleOutput');
                
                // 불필요한 머리말 제거 후 출력
                let cleanedText = data.final_text.replace(/\[최종 보도자료\]\s*/g, '').trim();
                outputEl.value = cleanedText;
                
                // Auto-resize logic: 값을 넣은 뒤 높이 재계산
                outputEl.style.height = 'auto'; // 리셋 후
                outputEl.style.height = outputEl.scrollHeight + 'px'; // 스크롤 높이만큼 설정
                
                submitBtn.classList.add('hidden'); // Hide submit button once generated
                backBtn.classList.add('hidden'); // Hide back button once generated
                copyBtn.classList.remove('hidden'); // Show copy button
                resetBtn.classList.remove('hidden'); // 결과 나오면 다시 만들기 복구
            } else {
                alert('에러 발생: ' + (data.error || '알 수 없는 오류'));
                document.getElementById('readyMessage').classList.remove('hidden');
                submitBtn.classList.remove('hidden'); // 에러 발생 시 버튼 복구
                backBtn.classList.remove('hidden'); // 에러 발생 시 뒤로가기 복구
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('서버와 통신할 수 없습니다. (Node.js 서버가 실행 중인지 확인하세요)');
            document.getElementById('readyMessage').classList.remove('hidden');
            submitBtn.classList.remove('hidden'); // 에러 발생 시 버튼 복구
            backBtn.classList.remove('hidden'); // 에러 발생 시 뒤로가기 버튼 복구
        } finally {
            document.getElementById('loadingState').classList.add('hidden');
            submitBtn.disabled = false; // Re-enable submit button in case of error or completion
            backBtn.disabled = false; // Re-enable back button
        }
    });

    /**
     * Copy Button Logic
     */
    copyBtn.addEventListener('click', () => {
        const textToCopy = document.getElementById('finalArticleOutput').value;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = '복사하기';
            copyBtn.innerText = '복사 완료! ✅';
            setTimeout(() => {
                copyBtn.innerText = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('복사하기에 실패했습니다. 직접 텍스트를 드래그하여 복사해주세요.');
        });
    });

    /**
     * Textarea Auto-resize on User Input
     */
    const outputEl = document.getElementById('finalArticleOutput');
    outputEl.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    // Initialize View
    updateView();
});
