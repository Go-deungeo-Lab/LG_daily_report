import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
console.log("NOTION_TOKEN:", process.env.NOTION_TOKEN ? "set" : "missing");
console.log("DATABASE_ID:", DATABASE_ID);

export async function GET(request) {
  try {
    if (!process.env.NOTION_TOKEN || !DATABASE_ID) {
      return NextResponse.json(
        { error: "NOTION_TOKEN 또는 NOTION_DATABASE_ID 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const weekFilter = searchParams.get("week");

    const queryOpts = {
      database_id: DATABASE_ID,
      page_size: 100};

    if (weekFilter) {
      queryOpts.filter = {
        property: "주차",
        select: { equals: weekFilter },
      };
    }

    const res = await notion.databases.query(queryOpts);

    const items = res.results.map((page) => {
      const p = page.properties;
      const sel = (name) => p[name]?.select?.name || "";
      const txt = (name) => p[name]?.rich_text?.map((t) => t.plain_text).join("") || "";
      return {
        업무항목: p["업무항목"]?.title?.map((t) => t.plain_text).join("") || "",
        "1일차_계획": sel("1일차_계획"),
        "2일차_계획": sel("2일차_계획"),
        "3일차_계획": sel("3일차_계획"),
        "4일차_계획": sel("4일차_계획"),
        "5일차_계획": sel("5일차_계획"),
        "1일차_진행": sel("1일차_진행"),
        "2일차_진행": sel("2일차_진행"),
        "3일차_진행": sel("3일차_진행"),
        "4일차_진행": sel("4일차_진행"),
        "5일차_진행": sel("5일차_진행"),
        진행율_계획: p["진행율_계획"]?.number,
        진행율_진행: p["진행율_진행"]?.number,
        진행인원: (p["진행인원"]?.multi_select || []).map((s) => s.name).join(", "),
        상세내용: txt("상세내용"),
        특이사항: txt("특이사항"),
        일정시작: p["일정시작"]?.date?.start || "",
        일정종료: p["일정종료"]?.date?.start || "",
        주차: p["주차"]?.select?.name || "",
        비고: txt("비고"),
        순서: p["순서"]?.number,      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Notion API Error:", err.code, err.status, err.message, err.body);
    return NextResponse.json({ error: err.message || "알 수 없는 오류", code: err.code }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!process.env.NOTION_TOKEN) {
      return NextResponse.json({ error: "NOTION_TOKEN 없음" }, { status: 500 });
    }

    const { weekLabel, startDate, endDate } = await request.json();
    const parentPageId = "365516fa-9ec0-8082-a0ea-ef6bd8f261a9";
    const dataSourceId = "feaac1fd-151f-4e3b-a0e4-24e10421ab80";
    
    // 1. 새 주차 페이지 생성
    const page = await notion.pages.create({
      parent: { page_id: parentPageId },
      icon: { type: "emoji", emoji: "📅" },
      properties: {
        title: {
          title: [{ text: { content: `26년 ${weekLabel} (${startDate} ~ ${endDate})` } }],
        },
      },
    });

    // 2. 주차 옵션이 없으면 DB에 추가 (select 옵션)
    // Notion API는 select 옵션을 자동 생성하므로 데이터 입력 시 자동 추가됨

    // 3. 페이지에 linked database 블록 추가
    await notion.blocks.children.append({
      block_id: page.id,
      children: [
        {
          type: "link_to_page",
          link_to_page: {
            type: "database_id",
            database_id: "23cf7ff57ae045d09d4e5ee6f3f06230",
          },
        },
      ],
    });

    return NextResponse.json({ 
      success: true, 
      pageId: page.id, 
      url: page.url,
      weekLabel 
    });
  } catch (err) {
    console.error("Create week error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
