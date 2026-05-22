// =============================================================
//  /api/recruit ─ 採用ページのセクション内容（Netlify Blobs）
//  メインビジュアル／採用メッセージ／社員インタビュー／数字／福利厚生
//  GET    /api/recruit            全セクション内容を取得
//  PUT    /api/recruit            送信されたセクションのみ更新（マージ）
//  DELETE /api/recruit?reset=1     初期内容に戻す
// =============================================================

import { getStore } from "@netlify/blobs";

const DEFAULT = {
  mvTitle: "好奇心を、仕事にする。",
  mvSubtitle:
    "株式会社インフォネットは、Webとデジタルの力で企業の挑戦を支えています。新しい価値づくりに、一緒に取り組む仲間を募集しています。",
  message:
    "私たちが大切にしているのは、「なぜやるのか」を考え抜くことです。\n\n技術やスキルは、目的を実現するための手段にすぎません。お客様の課題に本気で向き合い、最適な答えを一緒に探していく。そんな姿勢を持った仲間と働きたいと考えています。\n\n経験よりも、学び続ける意欲を重視します。あなたの挑戦を、会社全体で後押しします。",
  interviews: [
    {
      id: "iv-1",
      name: "佐藤 美咲",
      role: "Webディレクター（2021年入社）",
      comment:
        "未経験で入社しましたが、先輩の手厚いサポートで一歩ずつ成長できました。お客様に「ありがとう」と言っていただける瞬間が、一番のやりがいです。",
      image: "recruit",
    },
    {
      id: "iv-2",
      name: "田中 颯太",
      role: "フロントエンドエンジニア（2019年入社）",
      comment:
        "新しい技術にどんどん挑戦できる環境です。リモートワークも活用しながら、自分のペースで質の高い仕事ができています。",
      image: "recruit",
    },
    {
      id: "iv-3",
      name: "鈴木 陽菜",
      role: "営業（2022年 新卒入社）",
      comment:
        "若手にも裁量を持って任せてもらえるので、毎日学びがあります。チームみんなで支え合う温かい雰囲気が気に入っています。",
      image: "recruit",
    },
  ],
  stats: [
    { label: "社員数", value: "48名" },
    { label: "平均年齢", value: "32歳" },
    { label: "男女比", value: "6 : 4" },
    { label: "リモート活用率", value: "85%" },
  ],
  benefits: [
    { title: "リモートワーク可", desc: "職種に応じて在宅勤務を選択できます。" },
    { title: "スキルアップ支援", desc: "研修・資格取得をサポートする制度があります。" },
    { title: "フレックスタイム制", desc: "柔軟な勤務時間で、働きやすい環境です。" },
    { title: "書籍購入補助", desc: "学びのための書籍購入を会社が補助します。" },
  ],
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function store() {
  return getStore({ name: "infonet-demo", consistency: "strong" });
}

async function load(s) {
  const raw = await s.get("recruit");
  if (raw == null) {
    await s.set("recruit", JSON.stringify(DEFAULT));
    return { ...DEFAULT };
  }
  try {
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export default async (req) => {
  const s = store();
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      return json(await load(s));
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const cur = await load(s);
      // 送信されたキーのみ上書き（セクション別の独立保存に対応）
      const next = { ...cur, ...body };
      await s.set("recruit", JSON.stringify(next));
      return json(next);
    }

    if (req.method === "DELETE") {
      if (url.searchParams.get("reset") === "1") {
        await s.set("recruit", JSON.stringify(DEFAULT));
        return json({ ok: true, reset: true });
      }
      return json({ error: "reset=1 が必要です" }, 400);
    }

    return json({ error: "対応していないメソッドです" }, 405);
  } catch (err) {
    return json({ error: "サーバーエラー", details: String(err) }, 500);
  }
};
