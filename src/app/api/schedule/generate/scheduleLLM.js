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

[입력 정보 활용 규칙]
1. 위치(strWhere): 해당 지역의 실제 유명 장소와 맛집을 기반으로 일정을 구성해라.
2. 기간(dtDate1 ~ dtDate2): 시작일의 오전부터 종료일의 오후까지 전체 기간을 빠짐없이 채워라.
3. 동행자(strWithWho) & 인원(nTotalPeople): 동행자의 성격(가족, 연인, 혼자 등)에 적합한 장소를 추천해라.
4. 이동수단(strTransport): 설정된 이동수단으로 이동 가능한 현실적인 동선을 고려해라.
5. 테마 및 예산: 사용자가 입력한 예산(nTotalBudget, nTransportRatio, nLodgingRatio, nFoodRatio)을 반영하여 장소의 등급과 활동을 결정해라.

[출력 형식 규칙]
1. day_schedules 리스트 내에 날짜별로 'Day1', 'Day2' 순서대로 객체를 생성해라.
2. 'dtSchedule'은 반드시 해당 일자의 시간 정보를 포함한 'YYYY-MM-DD HH:MM:SS' 형식이어야 한다.
3. 'place_name'은 카카오 지도 API 검색 시 타 지역의 동명 장소가 나타나지 않도록 반드시 '입력받은 위치(strWhere) + 공식 명칭' 형태로 작성해라. (매우 중요)
   - 위치가 제주도인 경우 예시: '애월 카페' (X) -> '제주 몽상드애월' (O)
   - 위치가 제주도인 경우 예시: '공항 근처 고기국수' (X) -> '제주 자매국수' (O)
   - 위치가 부산인 경우 예시: '가야밀면' (X) -> '부산 가야밀면' (O)
4. 'category_group_code'에는 장소의 성격에 맞는 카카오지도 API 카테고리 그룹 코드를 작성해라.
   - 매핑 코드: MT1(대형마트), CS2(편의점), PS3(어린이집/유치원), SC4(학교), AC5(학원), PK6(주차장), OL7(주유소/충전소), SW8(지하철역), BK9(은행), CT1(문화시설), AG2(중개업소), PO3(공공기관), AT4(관광명소), AD5(숙박), FD6(음식점), CE7(카페), HP8(병원), PM9(약국)
   - 주의: 해당되는 코드가 없다면 값을 비워도 좋다.
5. 'strMemo'는 해당 장소에서 수행할 구체적인 활동이나 추천 메뉴 등을 15자 내외로 핵심만 요약해라.
6. 모든 출력은 반드시 한국어로 작성해라.
7. 숙박 옵션이 필수이므로, 일정의 시작(명일 점심/저녁 사이 체크인)이나 끝(마지막 일정 후 숙소 복귀)에 숙박시설(호텔, 펜션 등)을 반드시 1개 이상 포함하고 카테고리에 'AD5'를 넣어라.
8. [중요] 절대 같은 날에 동일한 장소(place_name)를 중복해서 방문하도록 일정을 짜지 마라. 모든 활동은 서로 다른 장소여야 한다.
9. [중요 카테고리 규정] 'category_group_code'는 카카오맵 API 검색의 핵심 필터다. 
   - 식당(FD6), 카페(CE7), 숙박(AD5)의 경우에만 반드시 해당 코드를 입력하라. 
   - 그러나 시장, 해수욕장, 케이블카, 테마파크, 산, 공원 등 다양한 일반 관광지의 경우(AT4, CT1 등) 카카오맵 내부 분류와 불일치하면 검색이 실패(0건)하므로, 이런 애매한 관광지들은 절대 코드를 넣지 말고 빈 문자열("")로 비워두어라.
10. [최적 동선 필수 규정] 이동 동선이 중구난방으로 튀지 않도록, 반드시 각 일자(day) 단위로 '지리적으로 가까운 장소(인접한 동네나 구역)'끼리 묶어서 스케줄을 구성하라. (예: 오전에는 해운대 주변, 오후에는 광안리 주변 등) 현실적이고 매끄러운 이동이 가능해야만 한다.
11. [기종점 규정] 여행의 가장 첫 번째 목적지(1일자 첫 일정)와 가장 마지막 목적지(마지막 날 마지막 일정)는 가급적 해당 지역의 메인 교통 허브(예: 부산역, 제주국제공항, 강릉역, 속초고속버스터미널 등)로 설정하여, 타 지역에서 오고 가는 여행자가 이동하기 편하도록 구성하라. (단순 지하철역 배제)`;

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
