import Twitter from "twitter-api-v2";
import axios from "axios";
import dayjs from "dayjs";

type Scrap = {
  id: string;
  title: string;
  image: any;
  descriptions: [any];
  user: [Object];
  pin: number;
  views: number;
  linked: number;
  commitId: string;
  created: number;
  updated: number;
  accessed: number;
  snapshotCreated: number;
  pageRank: number;
};

type ScrapDetail = {
  id: string; // ページのid
  title: string; // ページのタイトル
  image: string; // ページのサムネイル画像
  descriptions: string[]; // ページのサムネイル本文。おそらく最大5行
  pin: 0 | 1; // ピン留めされていたら1, されていなかったら0
  views: number; // ページの閲覧回数
  linked: number;  // おそらく被リンク数
  commitId?: string; // 最新の編集コミットid
  created: number; // ページの作成日時
  updated: number; // ページの最終更新日時
  accessed: number; // Date last visitedに使われる最終アクセス日時
  lastAccessed: number | null; // APIを叩いたuserの最終アクセス日時。おそらくこの値を元にテロメアの未読/既読の判別をしている
  snapshotCreated: number | null; // Page historyの最終生成日時
  snapshotCount: number; // 生成されたPage historyの数
  pageRank: number; // page rank
  persistent: boolean; // 不明。削除されたページだとfalse？
  lines: { // 本文。一行ずつ入っている
    id: string; // 行のid
    text: string; // 行のテキスト
    userId: string; // 一番最後に行を編集した人のid
    created: number; // 行の作成日時
    updated: number; // 行の最終更新日時
  }[];
  links: string[]; // ページ内のリンク
  icons: string[]; // ページアイコン
  files: string[]; // ページ内に含まれる、scrapbox.ioにアップロードしたファイルへのリンク
  relatedPages: {
    links1hop: {
      id: string; // ページのid
      title: string; // ページのタイトル
      titleLc: string;
      image: string; // ページのサムネイル画像
      descriptions: string[]; // ページのサムネイル本文。おそらく最大5行
      linksLc: string[];
      linked: number; // おそらく被リンク数
      updated: number; // ページの最終更新日時
      accessed: number; // おそらくページの閲覧日時
    }[];
    links2hop: {
      id: string; // ページのid
      title: string; // ページのタイトル
      titleLc: string;
      image: string; // ページのサムネイル画像
      descriptions: string[]; // ページのサムネイル本文。おそらく最大5行
      linksLc: string[]; // このページのリンク先のうち、links1hopにあるもの
      linked: number; // おそらく被リンク数
      updated: number; // ページの最終更新日時
      accessed: number; // おそらくページの閲覧日時
    }[];
    hasBackLinksOrIcons: boolean; // このページを参照しているページorアイコンがあればtrue
  };
  user: { // ページの編集者。最後に編集した人が入る？
    id: string;
    name: string;
    displayName: string;
    photo: string;
  };
  collaborators: { // このページの編集者から"user"を除いたもの
    id: string;
    name: string;
    displayName: string;
    photo: string;
  }[];
}

const appKey = process.env.TWITTER_APP_KEY;
const appSecret = process.env.TWITTER_APP_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;
const scrapBoxPageName = process.env.SCRAPBOX_PAGE_NAME;

const main = async () => {
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.log("Tokens are not enough");
    console.log({ appKey });
    console.log({ appSecret });
    console.log({ accessToken });
    console.log({ accessSecret });
    return;
  }
  const response = await axios.get(
    `https://scrapbox.io/api/pages/${scrapBoxPageName}?sort=created&limit=20`
  );
  const scraps: [Scrap] = response.data.pages;
  const now = dayjs();
  const targetScrap = scraps.filter((page) => {
    const createdUnix = dayjs.unix(page.created);
    const diff = now.diff(createdUnix, "hour");
    return diff <= 23;
  });

  if (targetScrap.length <= 0) {
    console.log("no scraps");
    return;
  }


  let tweetScraps:Array<Scrap> = []
  await Promise.all(targetScrap.map(async (scrap) => {
    const url = encodeURI(`https://scrapbox.io/api/pages//${scrapBoxPageName}/${(scrap.title)}`)
    const { data }: { data: ScrapDetail } = await axios.get(url)
    if (data.links.includes('Tweet')) {
      tweetScraps.push(scrap)
    }
  }))


  if (tweetScraps.length <= 0) {
    console.log("no tweet scrap");
    return;
  }

  const scrapTexts = tweetScraps.map((scrap) => {
    const url = `https://scrapbox.io/${scrapBoxPageName}/${scrap.title}`;
    return `${scrap.title}
${encodeURI(url)}

`;
  });

  const text = `今日作成したScrap: ${targetScrap.length}件

  ${scrapTexts.join("")}`;

  console.log(text);

  const client = new Twitter({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  const result = await client.v1.tweet(text);
  console.log({ result });
};

main();
