import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ScheduleResponseSchema } from "./scheduleModel.js";

/**
 * AI 여행 일정 생성 클래스 (Claude 모델을 사용하는 버전)
 */
export class ScheduleGPT {
    constructor() {
        // [ADD] Anthropic Claude 모델 초기화
        this.llm = new ChatAnthropic({
            modelName: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
            anthropicApiKey: process.env.CLAUDE_API_KEY,
            temperature: 0.3,
        });

        // Zod 스키마를 이용한 Output Parser 생성
        this.outputParser = StructuredOutputParser.fromZodSchema(ScheduleResponseSchema);

        // 시스템 프롬프트 작성
        const systemPrompt = `너는 사용자의 여행 조건을 분석하여 최적화된 동선의 일정을 만들어주는 '상세 여행 스케줄러 AI'다.
반드시 JSON 형태로만 응답하며, 모든 필드는 제공된 스키마 규칙을 엄격히 따른다.

[여행 조건]
1. 위치(strWhere): 해당 지역의 실제 유명 장소와 맛집을 기반으로 일정을 구성한다.
2. 기간(dtDate1 ~ dtDate2): 시작일의 오전부터 종료일의 오후까지 전체 기간을 빠짐없이 채운다.
3. 동행자(strWithWho) & 인원(nTotalPeople): 동행자의 성격에 적합한 장소를 추천한다.
4. 이동수단(strTransport): 설정된 이동수단으로 1시간 내외의 이동 가능한 현실적인 동선을 고려한다.
5. 테마(strTripStyle): {strTripStyle}에 맞는 장소를 포함한다.

[장소 선정 기준]
1. 하루 최대 5개 장소 (숙소 포함)
2. 동선이 겹치지 않도록 지리적으로 가까운 순서로 배치
3. 하루의 마지막 장소는 반드시 숙소(호텔/펜션/게스트하우스 등)
4. 장소 간 이동시간은 30분 내외로 구성
5. 여행 스타일(strTripStyle)에 맞는 장소 위주로 선정

[출력 형식 및 중복 방지 규칙]
1. 'dtSchedule'은 반드시 'YYYY-MM-DD HH:MM:SS' 형식이어야 한다.
2. 'place_name'은 카카오 지도로 검색시 존재하는 명칭으로 작성하라.
3. 'place_address'는 카카오 지도로 검색시 존재하는 지번 주소로 작성하라.
4. **전체 기간 중복 금지**: 동일한 장소(place_name)는 **전체 여행 기간(Day1~마지막 날) 동안 딱 한 번만** 등장해야 한다. (단, 연박하는 숙소는 예외적으로 허용)
5. 'category_group_code' 매핑: 
   - 식당(FD6), 카페(CE7), 숙박(AD5)은 반드시 해당 코드를 입력하라.
   - 시장, 해수욕장, 테마파크, 산 등 일반 관광지는 카카오맵 분류 불일치로 인한 검색 실패 방지를 위해 **반드시 빈 문자열("")**로 비워둔다.
6. 'strMemo'는 해당 장소의 활동이나 메뉴를 15자 내외로 핵심만 요약하라.
7. 모든 출력은 한국어로 작성하며, 일정 중 마지막 날을 제외하고 숙박시설(AD5)을 반드시 1개 포함한다.
`;
        // [좋은 동선 vs 나쁜 동선 예시]
        // - Good: (1일차) 공항 도착 -> 공항 근처 식당 -> 인근 해안도로 카페 -> 근처 숙소 체크인
        // - Bad: (1일차) 공항(북쪽) 도착 -> 서귀포 식당(남쪽, 1시간 이동) -> 다시 애월 카페(서북쪽, 1시간 이동) -> 성산 숙소(동쪽, 1.5시간 이동)`;

        // [MOD] Claude에 적합하도록 프롬프트 구성 (시스템 메시지와 휴먼 메시지 분리)
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", `${systemPrompt}\n\n{format_instructions}`],
            [
                "human",
                "위치: {strWhere}, 기간: {dtDate1}~{dtDate2}, 동행: {strWithWho}, 교통: {strTransport}, 테마: {strTripStyle}, 총예산: {nTotalBudget}원(교통:{nTransportRatio}, 숙박:{nLodgingRatio}, 식비:{nFoodRatio})",
            ],
        ]);

        // LangChain 파이프라인 구성: prompt -> llm -> outputParser
        this.chain = prompt.pipe(this.llm).pipe(this.outputParser);
    }

    /**
     * 주어진 요청 데이터를 기반으로 일정을 생성합니다.
     * @param {Object} inputData - 변수 보간에 사용될 요청 데이터
     * @returns {Promise<Object>} 생성된 응답 데이터 (Parsed JSON)
     */
    async generate(inputData) {
        return await this.chain.invoke({
            ...inputData,
            format_instructions: this.outputParser.getFormatInstructions(),
        });
    }
}
