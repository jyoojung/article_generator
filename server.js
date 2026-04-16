import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Helper Function: Read Prompt File
async function getPromptContent(filename) {
    // Vercel 환경 호환을 위해 __dirname 대신 process.cwd() 사용
    const filePath = path.join(process.cwd(), 'prompts', filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
}

// Helper Function: Inject Variables into Prompt
function injectVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        // Replace {{variable_name}} with the actual value. Use global replacement.
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value || '');
    }
    return result;
}

// Article Type to Prompt File Mapping
const typeToFileMap = {
    'typeA': 'maker_event.md',
    'typeB': 'maker_cert.md',
    'typeC': 'maker_launch.md',
    'typeD': 'maker_achieve.md'
};

// API Endpoint for processing LLM generation
app.post('/api/generate', async (req, res) => {
    try {
        console.log('\n======================================');
        console.log('[DEBUG] 2. 백엔드 API 요청받은 직후 수신 데이터');
        console.log(JSON.stringify(req.body, null, 2));
        console.log('======================================\n');

        const { articleType, common, specific } = req.body;

        if (!articleType || !typeToFileMap[articleType]) {
            return res.status(400).json({ success: false, error: 'Invalid or missing articleType' });
        }

        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY가 서버의 .env 파일에 설정되어 있지 않습니다.');
        }



        // Combine all variables for injection
        const allVariables = { ...common, ...specific };

        // 1. Maker LLM (Step 2 & 3)
        const makerFilename = typeToFileMap[articleType];
        const makerTemplate = await getPromptContent(makerFilename);
        const makerPrompt = injectVariables(makerTemplate, allVariables);

        console.log('\n======================================');
        console.log('[DEBUG] 3. Maker LLM에 던지기 직전 완성된 시스템 프롬프트 전문');
        console.log(makerPrompt);
        console.log('--- 주입된 사용자 데이터 (User Message Payload) ---');
        console.log(JSON.stringify(allVariables, null, 2));
        console.log('======================================\n');
        
        console.log(`[Backend] Invoking Maker LLM...`);
        
        const makerResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: makerPrompt },
                { 
                    role: 'user', 
                    content: `주어진 [사용자 입력 데이터]를 바탕으로 기사 초안을 작성해주세요.\n\n[사용자 입력 데이터]\n${JSON.stringify(allVariables, null, 2)}` 
                }
            ],
            temperature: 0.7
        });
        const draftArticle = makerResponse.choices[0].message.content;
        
        console.log('\n======================================');
        console.log('[DEBUG] 2. Maker LLM Output (draftArticle):');
        console.log(draftArticle);
        console.log('======================================\n');

        // 2. Checker LLM (Step 4)
        const checkerTemplate = await getPromptContent('checker.md');
        
        // Inject original inputs into checker prompt as well, 
        // AND inject the maker_output variable newly provided
        const checkerInputs = { ...allVariables, maker_output: draftArticle };
        const checkerPrompt = injectVariables(checkerTemplate, checkerInputs);

        console.log(`[Backend] Invoking Checker LLM for validation...`);
        
        const checkerResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: checkerPrompt },
                { role: 'user', content: '생성된 기사 초안 내용을 검수해주세요.' }
            ],
            temperature: 0.3
        });
        const finalOutput = checkerResponse.choices[0].message.content;
        
        console.log('\n======================================');
        console.log('[DEBUG] 3. Checker LLM Final Output:');
        console.log(finalOutput);
        console.log('======================================\n');

        // Return final text (Step 5)
        res.status(200).json({ success: true, final_text: finalOutput });

    } catch (error) {
        console.error('\n======================================');
        console.error('[Backend] API Pipeline Error:');
        console.error(error);
        console.error('======================================\n');
        
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error processing the pipeline.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
