let puppeteer = require("puppeteer");
let request = require("request");
let cheerio = require("cheerio");
let cFile = process.argv[2];
let fs = require("fs");
let pUrl = process.argv[3];
let topic = process.argv[4];
let nques = process.argv[5];

(async function () {
    try {
        let data = await fs.promises.readFile(cFile);
        let { gid, gpwd, topiclink } = JSON.parse(data);
        // console.log(url+" "+pwd+" "+user);
        let browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized", "--disable-notifications"]
        });
        let tabs = await browser.pages();
        let tab = tabs[0];
        await tab.goto(pUrl,{waitUntil:"load",timeout:0});
        await tab.waitForSelector("#luser", { visible: true });
        await tab.type("#luser", gid,{delay:100});
        await tab.type("#password", gpwd,{delay:100});
        await Promise.all([
            tab.click(".btn.btn-green.signin-button"), tab.waitForNavigation({
                waitUntil: "load", timeout: 0
            })
        ]);        
        console.log("login successful");
        await tab.goto(topiclink + "/" + topic + "/", { waitUntil: "load", timeout: 0 })
        await tab.waitForSelector("#loaderMask", { hidden: true });
        console.log("After Loader");
        // await tab.waitForSelector("#loader",{hidden:true});
        await tab.waitForSelector("#problemFeed", { visible: true });
        console.log("After problem feed");
        // await tab.waitForNavigation({ waitUntil: "load", timeout: 0 });
        let idx = 0, c = 40;
        await tab.waitForSelector(".col-sm-6.col-xs-12.item .panel.problem-block", { visibility: true });
        do {
            let elements = await tab.$$(".col-sm-6.col-xs-12.item .panel.problem-block");
            let i = idx;
            let pArr = [];
            for (i = idx; i < nques && i < idx + 10; i++) {
                if (idx + 10 == c) {
                    console.log("Inside if now scrolling");
                    await tab.evaluate(() => {
                        window.scrollBy(0, document.body.scrollHeight);
                    })
                    await tab.waitForSelector(".col-sm-6.col-xs-12.item .panel.problem-block", { visible: true });
                    console.log("Inside if now navigation done");
                    c += 40;
                }
                let q = elements[i];
                let anchor = await elements[i].$("a");
                let href = await tab.evaluate(function (elem) {
                    return elem.getAttribute("href");
                }, anchor)
                // console.log(href);
                let newTab = await browser.newPage();
                let quescopyPromise = handleQuestion(newTab, href, i)
                pArr.push(quescopyPromise);
            }
            await Promise.all(pArr);
            idx = i;
        } while (idx < nques)
        console.log("**********************All questions are included in newly created file './questions.html'************************");
        let page = await browser.newPage();
        await page.goto('file:\\C:\\Users\\Tushar\\Desktop\\Placement program\\Puppeteer project\\questions.html');
        await pdfgen();
    }
    catch (e) {
        console.log("Error is :" + e);
    }
})()


async function handleQuestion(tab, href, i) {
    await tab.goto(href, { waitUntil: "load", timeout: 0 })
    await request(href, rhelp);
    console.log("Done ques" + i);
    await tab.close();
}

async function rhelp(err, res, html) {
    if (err == null && res.statusCode == 200) {
        await parseHtml(html);
    }
    else if (res.statusCode == 404) {
        console.log("Page not found");
    }
    else {
        console.log(err);
        console.log(res.statusCode);
    }
}


async function parseHtml(html) {
    let co = cheerio.load(html);
    let quesdata = co(".problemQuestion");
    await fs.promises.appendFile("questions.html", quesdata.html());
}

async function pdfgen() {
    let browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ["--start-maximized", "--disable-notifications"]
    });
    let page = await browser.newPage();
    await page.goto('file:\\C:\\Users\\Tushar\\Desktop\\Placement program\\Puppeteer project\\questions.html');
    await page.pdf({
        path: './file.pdf',
        format: 'A4', margin: {
            top: "20px",
            left: "20px",
            right: "20px",
            bottom: "20px"
        }, printBackground: true
    });
    console.log("Pdf has also generated for questions successfully as 'file.pdf");
}