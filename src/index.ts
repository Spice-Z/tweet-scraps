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

  const scrapTexts = targetScrap.map((scrap) => {
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
