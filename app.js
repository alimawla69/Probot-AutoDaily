// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require('puppeteer-extra');
const axios = require("axios");
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const { readFileSync } = require("fs");
const { setInterval } = require('timers/promises');
require("colors")
const CAPTCHA_API_KEY = "API KEY"
if(!CAPTCHA_API_KEY) return console.log(`2captcha API KEY Required!`.red);
const dailyedtokens = []
puppeteer.use(
    RecaptchaPlugin({
        provider: {
            id: '2captcha',
            token: CAPTCHA_API_KEY // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
        },
        visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
    })
)
var tokens = readFileSync('tokens.txt', 'utf-8').trim().replace(/\r/gi, '').split("\n");
if (!tokens[0]) return console.log('there is no tokens in tokens.txt'.red);

const uniqueTokens = [...new Set(tokens)];
async function daily(token) {
    if (!dailyedtokens.includes(token)) {
        dailyedtokens.push(token)
        puppeteer.launch({ headless: false }).then(async browser => {
            const page = (await browser.pages())[0];
            await page.setViewport({
                width: 1280,
                height: 800
            });
            console.log(`Token: ${token} started dailying.`.green);
            const response = await axios.post('https://discord.com/api/v9/oauth2/authorize?client_id=282859044593598464&response_type=code&scope=identify%20guilds%20email', {
                authorize: true,
                permissions: "0"
            }, {
                headers: {
                    "Authorization": token,
                },
            });
            await page.goto(response.data.location);
            try {
                await page.waitForTimeout(5000)
                await page.goto('https://probot.io/daily');
                await page.waitForTimeout(5000)
                const GotITButton = await page.waitForSelector('#main > div:nth-child(3) > section > div > div > div:nth-child(1) > div:nth-child(1) > div > div > div > div.onboarding-container > div > button');
                await GotITButton.click();
                await page.waitForTimeout(5000)
                await page.waitForSelector('#main > div:nth-child(3) > section > div > div > div:nth-child(1) > div.daily-parent > div > div.daily-logo-text');
                const dailyButton = await page.waitForSelector("#main > div:nth-child(3) > section > div > div > div:nth-child(1) > div.daily-parent > div > div.daily-logo-text");
                await dailyButton.click();
                await page.waitForTimeout(5000)
                await page.waitForSelector("iframe");
                await page.solveRecaptchas();
                let claim_daily = 0
                page.on("response", async response => {
                    if (response.url().includes("claim_daily") && response.request().method() == "POST") {
                        const data = await response.json();
                        claim_daily = data.success
                        await browser.close()
                        page.removeAllListeners();
                    }
                });
                await page.waitForTimeout(10000)
                if (claim_daily != 0) {
                    console.log(`Token: ${token} has claimed ${claim_daily}.`.green);
                } else {
                    console.log(`Token: ${token} arleady claimed daily.`.red);
                }
                await page.waitForTimeout(5000);
                const outButton1 = await page.waitForSelector("#sidebar_sidebar__items__5Hd7R > div:nth-child(8) > div:nth-child(3) > div");
                await outButton1.click();
                const outButton2 = await page.waitForSelector("#logout_all");
                await outButton2.click();
                await page.waitForTimeout(5000);
                const outButton3 = await page.waitForSelector("#logout-modal > div:nth-child(3) > button:nth-child(2)");
                await outButton3.click();
                await page.waitForTimeout(5000);
                await browser.close()
                if (tokens.length === dailyedtokens.length) {
                    console.log(`All tokens has been dailyed!`.green);
                    return process.exit(0)
                }
            } catch (error) {
                console.log(error);
            }
        })
    }
}
Promise.all(uniqueTokens.map(async token => {
    await daily(token)
    await setTimeout(async () => {
        await daily(token)
    }, 1000 * 60);
}))
