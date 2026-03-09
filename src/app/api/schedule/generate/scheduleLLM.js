import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { ChatOpenAI } from "@langchain/openai"; // [MOD] 기존 OpenAI 코드 주석 처리
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ScheduleResponseSchema } from "./scheduleModel.js";

/**
 * AI 여행 일정 생성 클래스 (Python의 ScheduleGPT 클래스와 호환)
 */
export class ScheduleGPT {
    constructor() {
        // [MOD] 기존 OpenAI 코드 주석 처리 보존
        /*
        this.llm = new ChatOpenAI({
            modelName: process.env.LLM_MODEL_SCHEDULE || "gpt-4o-mini",
            // temperature: 0.7,
        });
        */

        // [MOD] OpenAI에서 Google Gemini 모델로 교체 (Next.js 가 기본적으로 .env.local을 로드함)
        this.llm = new ChatGoogleGenerativeAI({
            model: "gemini-3-flash-preview", // [FIX] Google 모델은 modelName이 아닌 model 파라미터 사용
            apiKey: process.env.GOOGLE_API_KEY,
            // temperature: 0.7,
        });

        // Zod 스키마를 이용한 Output Parser 생성 (PydanticOutputParser 대체)
        this.outputParser = StructuredOutputParser.fromZodSchema(ScheduleResponseSchema);

        // 시스템 프롬프트 작성
        const systemPrompt = `너는 사용자의 여행 조건을 분석하여 최적화된 동선의 일정을 만들어주는 '상세 여행 스케줄러 AI'다.
반드시 JSON 형태로만 응답하며, 모든 필드는 제공된 스키마 규칙을 엄격히 따른다.

[입력 정보 활용 및 예산 규칙]
1. 위치(strWhere): 해당 지역의 실제 유명 장소와 맛집을 기반으로 일정을 구성해라.
2. 기간(dtDate1 ~ dtDate2): 시작일의 오전부터 종료일의 오후까지 전체 기간을 빠짐없이 채워라.
3. 동행자(strWithWho) & 인원(nTotalPeople): 동행자의 성격에 적합한 장소를 추천해라.
4. 이동수단(strTransport): 설정된 이동수단으로 이동 가능한 현실적인 동선을 고려해라.
5. 테마 및 예산: {strTripStyle}와 예산 비율({nTransportRatio}, {nLodgingRatio}, {nFoodRatio})을 반영하여 장소의 등급과 활동을 결정해라.

[동선 최적화 및 지역 제한 (핵심 지시)]
1. **권역 클러스터링**: {strWhere}를 세부 권역(예: 제주시-동부/서부, 서귀포시 등)으로 나누고, **하루 일정은 반드시 서로 인접한 1~2개 권역 내**에서만 구성하라. 
2. **일자 간 연속성**: N일차 마지막 장소(숙박)와 N+1일차 첫 번째 장소는 지리적으로 가까워야 한다. 자고 일어나서 갑자기 지역 반대편으로 점프하는 비현실적인 동선을 절대 금지한다.
3. **이동 시간 제한**: {strTransport} 이용 시, 장소 간 이동 시간이 **자차 30분 / 대중교통 45분**을 초과하는 무리한 이동을 일정 중간에 넣지 마라.
4. **기종점 규정**: 1일차 첫 일정과 마지막 날 마지막 일정은 메인 교통 허브(공항, 역 등)로 설정하되, 동선이 꼬이지 않도록 그 근처 장소부터 일정을 시작/종료하라. (단순 지하철역 제외)

[출력 형식 및 중복 방지 규칙]
1. 'dtSchedule'은 반드시 'YYYY-MM-DD HH:MM:SS' 형식이어야 한다.
2. 'place_name'은 카카오 지도 API 검색 정확도를 위해 반드시 **'입력받은 위치(strWhere) + 공식 명칭'** 형태로 작성하라. (예: '제주 자매국수', '부산 가야밀면')
3. **전체 기간 중복 금지**: 동일한 장소(place_name)는 **전체 여행 기간(Day1~마지막 날) 동안 딱 한 번만** 등장해야 한다. (단, 연박하는 숙소는 예외적으로 허용)
4. 'category_group_code' 매핑: 
   - 식당(FD6), 카페(CE7), 숙박(AD5)은 반드시 해당 코드를 입력하라.
   - 시장, 해수욕장, 테마파크, 산 등 일반 관광지는 카카오맵 분류 불일치로 인한 검색 실패 방지를 위해 **반드시 빈 문자열("")**로 비워두어라.
5. 'strMemo'는 해당 장소의 활동이나 메뉴를 15자 내외로 핵심만 요약하라.
6. 모든 출력은 한국어로 작성하며, 일정 중 숙박시설(AD5)을 반드시 1개 이상 포함하라.

[좋은 동선 vs 나쁜 동선 예시]
- Good: (1일차) 공항 도착 -> 공항 근처 식당 -> 인근 해안도로 카페 -> 근처 숙소 체크인
- Bad: (1일차) 공항(북쪽) 도착 -> 서귀포 식당(남쪽, 1시간 이동) -> 다시 애월 카페(서북쪽, 1시간 이동) -> 성산 숙소(동쪽, 1.5시간 이동)`;

        // [MOD] 기존 OpenAI 프롬프트 템플릿 주석 보존 (테마 추가)
        /*
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPrompt],
            ["system", "{format_instructions}"],
            [
                "human",
                "위치: {strWhere}, 기간: {dtDate1}~{dtDate2}, 동행: {strWithWho}, 교통: {strTransport}, 테마: {strTripStyle}, 총예산: {nTotalBudget}원(교통:{nTransportRatio}, 숙박:{nLodgingRatio}, 식비:{nFoodRatio})",
            ],
        ]);
        */

        // [FIX] Gemini는 시스템 메시지가 여러 개 연달아 오면 에러를 뱉으므로 하나의 배열 요소로 문자열 템플릿을 합칩니다.
        // [ADD] 테마(strTripStyle) 프롬프트에 추가
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", `${systemPrompt}\n\n{format_instructions}`],
            [
                "human",
                "위치: {strWhere}, 기간: {dtDate1}~{dtDate2}, 동행: {strWithWho}, 교통: {strTransport}, 테마: {strTripStyle}, 총예산: {nTotalBudget}원(교통:{nTransportRatio}, 숙박:{nLodgingRatio}, 식비:{nFoodRatio})",
            ],
        ]);

        // LangChain 파이프라인 구성: prompt -> llm -> outputParser
        // RunnableSequence 혹은 파이프 처리
        this.chain = prompt.pipe(this.llm).pipe(this.outputParser);
    }

    /**
     * 주어진 요청 데이터를 기반으로 일정을 생성합니다.
     * @param {Object} inputData - 변수 보간에 사용될 요청 데이터
     * @returns {Promise<Object>} 생성된 응답 데이터 (Parsed JSON)
     */
    async generate(inputData) {
        // format_instructions는 partial 단계에서 처리되지 않았다면 여기서 주입해야 하지만,
        // 일반적으로 js 버전에서는 invoke 때 함께 넘겨줍니다.
        return await this.chain.invoke({
            ...inputData,
            format_instructions: this.outputParser.getFormatInstructions(),
        });
    }
}
