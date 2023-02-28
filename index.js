const webdriver = require('selenium-webdriver');
const until = webdriver.until;
const By = webdriver.By;
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const json = require("./characters.json");
const _ = require('lodash')

async function startScript() {
    const driver = new webdriver.Builder()
        .withCapabilities(webdriver.Capabilities.chrome())
        .build();

    try {
        await driver.manage().deleteAllCookies();
        await driver.get("https://www.eurovision.de/news/ESC-Vorentscheid-Unser-Lied-fuer-Liverpool-Jetzt-online-abstimmen,voting1430.html");
        await sleep(3000);
        const letsGo = '//div[contains(text(),"Los geht")]'
        await driver.wait(until.elementLocated(By.xpath(letsGo)), 5000)
        const lgButton = await driver.findElement(By.xpath(letsGo))
        await driver.executeScript(
            "arguments[0].scrollIntoView();", lgButton);
        await lgButton.click();
        const videoPaneClass = '//div[@class="c-dYNYyV"]';
        await driver.wait(until.elementLocated(By.xpath(videoPaneClass), 5000));
        const videoPane = await driver.findElement(By.xpath(videoPaneClass))
        await sleep(5000);
        await videoPane.click();
        const playClass = '//button[@class="c-daiTIR"]';
        await driver.wait(until.elementLocated(By.xpath(playClass)), 5000)
        const playButton = await driver.findElement(By.xpath(playClass))
        await playButton.click();
        await sleep(3000);
        await playButton.click();
        const continueButtonClass = "//button[@class='c-hCWQRl']"
        await driver.wait(until.elementLocated(By.xpath(continueButtonClass)), 3000)
        const continueButton = await driver.findElement(By.xpath(continueButtonClass))
        await driver.wait(until.elementIsEnabled(continueButton), 300000)
        await continueButton.click()
        const lotlVoteClass = "//button[@aria-label='Lord of the Lost']"
        await driver.wait(until.elementLocated(By.xpath(lotlVoteClass)), 3000)
        const lotlVote = await driver.findElement(By.xpath(lotlVoteClass));
        await lotlVote.click()
        await sleep(3000)
        const voteButtonClass = '//button[@class="c-hCWQRl"]'
        await driver.wait(until.elementLocated(By.xpath(voteButtonClass)), 3000)
        const voteButton = await driver.findElement(By.xpath(voteButtonClass));
        await voteButton.click();
        const captchaPane = '//div[@class="c-giyTSW"]'
        await driver.wait(until.elementLocated(By.xpath(captchaPane)), 3000);
        let success = false;
        while (!success) {
            const chars = [
                "//*[local-name()='svg']//*[local-name()='path'][1]",
                "//*[local-name()='svg']//*[local-name()='path'][2]",
                "//*[local-name()='svg']//*[local-name()='path'][3]",
                "//*[local-name()='svg']//*[local-name()='path'][4]",
                "//*[local-name()='svg']//*[local-name()='path'][5]"
            ];
            const charsToResolve = [];
            for (let i = 0; i < chars.length; i++) {
                const c = chars[i];
                await driver.wait(until.elementLocated(By.xpath(c)), 3000);
                const cSVG = await driver.findElement(By.xpath(c));
                if ((await cSVG.getAttribute("d")).length < 30) continue;
                charsToResolve.push(await cSVG.getAttribute("d"));
            }
            const charsToResolveSorted = charsToResolve.sort((c1, c2) => Number(c1.replace(/M/g, "").split(" ")[0]) - Number(c2.replace(/M/g, "").split(" ")[0]));
            const charMap = buildCharMap();
            const resolvedChars = []
            for (let i = 0; i < charsToResolveSorted.length; i++) {
                const c = charsToResolveSorted[i];
                resolvedChars.push(assumeCharacter(charMap, c));
            }
            console.log("RESOLVED CHARS:", resolvedChars)
            if (!resolvedChars.includes("?")) {
                console.log("NO ? - WE DID IT! (maybe)")
            }
            const captchaInputClass = "//label[@class='c-ByUay']/input"
            await driver.wait(until.elementLocated(By.xpath(captchaInputClass)), 3000)
            const captchaInput = await driver.findElement(By.xpath(captchaInputClass));
            captchaInput.sendKeys(resolvedChars.join(""))
            const sendButtonClass = "//div[@class='c-dfKjWb']"
            await driver.wait(until.elementLocated(By.xpath(sendButtonClass)));
            const sendButton = driver.findElement(By.xpath(sendButtonClass));
            sendButton.click();
            await sleep(5000);
            const successText = '//div[contains(text(),"Vielen Dank")]'
            try {
                if (await driver.findElement(By.xpath(successText))) {
                    success = true;
                }
            } catch (e) {
                console.error("Well, nope - wasn't right")
            }
        }
        await sleep(2000)
    } finally {
        await driver.quit();
    }

}

/**
 * Helper function to sleep the process.
 * @param {number} ms Sleep time in ms
 * @returns Promise that sleeps
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates the total distance of the SVG and the length of the path description
 * @param {Array<string>} input SVG paths whose distance and length should be calculated 
 * @returns Object that contains distance and characters length
 */
function totalDistance(input) {
    const res = []
    const chars = []
    for (let i = 0; i < input.length; i++) {
        const o = input[i];
        chars.push(o.length);
        const oPrep = o.replace(/M|Z/g, " ").replace(/Q|L/g, " ").trim().split(" ").filter(oe => !!oe).map(oe => Number(oe) * 100);
        let dist = 0;
        for (let j = 0; j < oPrep.length; j += 2) {
            // Calculates the distance between 2 points
            const xDiff = (oPrep[j + 2] ?? oPrep[0]) - oPrep[j]
            const yDiff = (oPrep[j + 3] ?? oPrep[1]) - oPrep[j + 1]
            dist += Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
        }
        res.push(dist)
    }
    return { distance: res, characters: chars };
}

/**
 * Builds the character map from the character source
 * @returns Map that contains the approximate distance of all characters and their average path length
 */
function buildCharMap() {
    const lengthMap = {};
    const keys = Object.keys(json);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        const { distance, characters } = totalDistance(json[k]);
        lengthMap[k] = { distance: distance.reduce((sum, l) => sum + l, 0) / distance.length, length: { min: _.min(characters), max: _.max(characters) } };
    }
    return lengthMap;
}

/**
 * Assumes the character that was passed. If no match is found ? is returned, if multiple matches are found a random match is returned
 * @param {{[key: string]: {distance: number, length: {min: number, max: number}}}} charMap Map of characters with their distance and length
 * @param {string} character Character that should be assumed 
 * @returns ? or the assumed character
 */
function assumeCharacter(charMap, character) {
    let cDist = 0;
    const cPrep = character.replace(/M|Z/g, " ").replace(/Q|L/g, " ").trim().split(" ").filter(oe => !!oe).map(oe => Number(oe) * 100);
    for (let i = 0; i < cPrep.length; i += 2) {
        const xDiff = (cPrep[i + 2] ?? cPrep[0]) - cPrep[i]
        const yDiff = (cPrep[i + 3] ?? cPrep[1]) - cPrep[i + 1]
        cDist += Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
    }
    const candidates = [];
    const keys = Object.keys(charMap);
    for (let i = 0; i < keys.length; i++) {
        const c = charMap[keys[i]];
        if (c.distance * 0.98 < cDist && cDist < c.distance * 1.02) {
            candidates.push(keys[i]);
        }
    }
    if (candidates.length === 0) {
        console.error("No candidate found for:", character)
        return "?"
    }
    if (candidates.length === 1) return candidates[0]
    console.log("Going into round 2 with", candidates);
    const cLen = character.length;
    const candidatesLength = []
    for (let i = 0; i < candidates.length; i++) {
        const c = charMap[candidates[i]];
        if (c.length.min <= cLen && cLen <= c.length.max) {
            candidatesLength.push(candidates[i]);
        }
    }
    if (candidatesLength.length === 0) {
        console.error("No candidate found for:", character)
        return "?"
    }
    if (candidatesLength.length === 1) return candidatesLength[0];
    console.error("Found multiple possible matches:", candidatesLength, "taking random one")
    return _.sample(candidatesLength);
}

// Duplicate this line for multiple runs in parallel
startScript();