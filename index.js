import { parse } from "node-html-parser";
import puppeteer from "puppeteer";

var result = [];

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrollToBottom(page) {
  let retryScrollCount = 3;

  while (retryScrollCount > 0) {
    try {
      let scrollPosition = await page.$eval(
        ".ReactVirtualized__List",
        (wrapper) => wrapper.scrollTop
      );

      await page.evaluate(() =>
        document
          .querySelector(".ReactVirtualized__List")
          .scrollBy({ top: 200, behavior: "smooth" })
      );
      await waitFor(200);

      await page.waitForFunction(
        `document.querySelector('.ReactVirtualized__List').scrollTop > ${scrollPosition}`,
        { timeout: 1_000 }
      );

      retryScrollCount = 3;
    } catch {
      retryScrollCount--;
    }
  }
}

function observeMutation() {
  async function onMutationHandler(mutationsList) {
    for (let mutation of mutationsList) {
      if (mutation.addedNodes.length) {
        for (let node of mutation.addedNodes) {
          let personName = node.textContent;
          transferData(personName);
        }
      }
    }
  }

  const observer = new MutationObserver(onMutationHandler);
  const virtualListNode = document.querySelector(".ReactVirtualized__List");
  observer.observe(virtualListNode, { childList: true, subtree: true });
}

function transferData(personName) {
  // save scraped data into file or database

  console.log(personName);
  result.push(personName);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    devtools: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--lang=en-US,en;q=0.9",
    ],
  });
  const page = await browser.newPage();

  await page.goto("https://btc-alpha.com/en/coin", {
    waitUntil: "networkidle0",
  });
  page.setViewport({
    width: 1920,
    height: 1080,
  });

  await waitFor(200);
  let r1 = await page.content();
  parse(r1)
    .querySelector(`.ReactVirtualized__Grid__innerScrollContainer`)
    .childNodes.forEach((el) => result.push(el.textContent));

  await page.exposeFunction("transferData", transferData);
  await page.evaluate(observeMutation);
  await scrollToBottom(page);
  console.log(result.length);
  console.log(result);
  await browser.close();
}

run();
