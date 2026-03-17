// Apify scraper for Superprof + GoStudent tutor data (Netherlands)
const TOKEN = process.env.APIFY_API_TOKEN;
if (!TOKEN) { console.error("Set APIFY_API_TOKEN in .env.local"); process.exit(1); }
const API = "https://api.apify.com/v2";

async function runActor(actorId, input, label) {
  console.log(`\n--- Scraping ${label}...`);
  const res = await fetch(`${API}/acts/${actorId}/run-sync-get-dataset-items?token=${TOKEN}&timeout=180`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`  FAILED:`, err.error?.message || res.statusText);
    return [];
  }
  const items = await res.json();
  console.log(`  Got ${items.length} items`);
  return items;
}

async function runWebScraper(startUrls, pageFunction, label) {
  return runActor("apify~web-scraper", {
    startUrls,
    pageFunction,
    maxPagesPerCrawl: 5,
    proxyConfiguration: { useApifyProxy: true },
  }, label);
}

// ── SUPERPROF (community actor) ──
async function scrapeSuperprof() {
  // Uses the community Superprof scraper actor
  // Search URLs target Dutch cities
  return runActor("azzouzana~superprof-scraper-by-search-url", {
    searchUrls: [
      "https://www.superprof.co.uk/lessons/maths/amsterdam.html",
      "https://www.superprof.co.uk/lessons/english/amsterdam.html",
      "https://www.superprof.co.uk/lessons/physics/amsterdam.html",
      "https://www.superprof.co.uk/lessons/programming/amsterdam.html",
      "https://www.superprof.co.uk/lessons/maths/rotterdam.html",
      "https://www.superprof.co.uk/lessons/english/rotterdam.html",
      "https://www.superprof.co.uk/lessons/maths/utrecht.html",
      "https://www.superprof.co.uk/lessons/maths/the-hague.html",
    ],
    maxItems: 100,
  }, "Superprof (NL cities)");
}

// ── GOSTUDENT ──
const gostudentFn = `async function pageFunction(context) {
  var $ = context.jQuery;
  var data = {
    url: context.request.url,
    title: $("title").text().trim(),
    headings: [],
    prices: [],
    subjects: [],
    tutorInfo: [],
    faqItems: []
  };

  $("h1, h2, h3").each(function(i) {
    if (i < 20) data.headings.push($(this).text().trim().substring(0, 150));
  });

  var bodyText = $("body").text();
  var priceMatches = bodyText.match(/€\\s*[\\d,.]+/g);
  if (priceMatches) data.prices = priceMatches.filter(function(v, i, a) { return a.indexOf(v) === i; });

  $("[class*='tutor'], [class*='teacher'], [class*='review'], [class*='testimonial']").each(function(i) {
    if (i >= 20) return;
    var el = $(this);
    var name = el.find("[class*='name'], h3, h4, strong").first().text().trim();
    var subject = el.find("[class*='subject']").first().text().trim();
    var desc = el.find("p").first().text().trim().substring(0, 200);
    if (name && name.length > 2 && name.length < 80) {
      data.tutorInfo.push({ name: name, subject: subject, description: desc });
    }
  });

  $("a[href*='bijles'], a[href*='vak']").each(function(i) {
    if (i >= 40) return;
    var t = $(this).text().trim();
    var h = $(this).attr("href");
    if (t && t.length > 2 && t.length < 100) data.subjects.push({ text: t, href: h });
  });

  $("[class*='faq'], [class*='accordion'], details").each(function(i) {
    if (i >= 15) return;
    var q = $(this).find("summary, h3, h4, [class*='question']").first().text().trim();
    var a = $(this).find("p, [class*='answer']").first().text().trim().substring(0, 300);
    if (q) data.faqItems.push({ question: q, answer: a });
  });

  data.bodyPreview = bodyText.replace(/\\s+/g, " ").substring(0, 600);
  return data;
}`;

async function main() {
  const [superprofData, gostudentData] = await Promise.all([
    scrapeSuperprof(),
    runWebScraper([
      { url: "https://www.gostudent.org/nl-nl" },
      { url: "https://www.gostudent.org/nl-nl/bijles/wiskunde" },
      { url: "https://www.gostudent.org/nl-nl/bijles/engels" },
      { url: "https://www.gostudent.org/nl-nl/bijles/natuurkunde" },
      { url: "https://www.gostudent.org/nl-nl/bijles/scheikunde" },
    ], gostudentFn, "GoStudent.org"),
  ]);

  // Clean up Superprof data - filter for NL-relevant
  const nlCities = ["amsterdam", "rotterdam", "utrecht", "den haag", "the hague", "eindhoven", "groningen", "tilburg", "almere", "breda", "nijmegen", "leiden", "haarlem", "netherlands", "nederland"];
  const superprofClean = superprofData
    .filter(t => !t["#error"])
    .map(t => ({
      name: t.teacherName,
      city: t.teacherCity,
      price: t.price ? `€${t.price}/hr` : "",
      rating: t.rating_score,
      reviewCount: t.rating_count,
      ratingLabel: t.rating_label,
      title: t.title,
      firstHourFree: !!t.firstHourFree,
      webcam: t.webcam,
      faceToFace: t.faceToFace,
      verified: !!t.verified,
      responseTime: t.responseTimeDesc,
      profileUrl: t.url,
      photo: t.teacherPhoto,
    }));

  // Clean GoStudent data
  const gostudentClean = gostudentData
    .filter(p => !p["#error"])
    .map(p => ({
      url: p.url,
      title: p.title,
      headings: p.headings,
      prices: p.prices,
      subjects: p.subjects?.filter(s => s.text !== "tutorcompare.uk"),
      tutorInfo: p.tutorInfo,
      faqItems: p.faqItems,
    }));

  // Build summary
  const output = {
    scrapedAt: new Date().toISOString(),
    summary: {
      superprofTutors: superprofClean.length,
      gostudentPages: gostudentClean.length,
      gostudentSubjects: [...new Set(gostudentClean.flatMap(p => (p.subjects || []).map(s => s.text)))],
      gostudentPrices: [...new Set(gostudentClean.flatMap(p => p.prices || []))],
    },
    superprof: superprofClean,
    gostudent: gostudentClean,
  };

  const fs = await import("fs");
  const outPath = "scripts/tutor-data.json";
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nData saved to ${outPath}`);
  console.log(`  Superprof tutors: ${superprofClean.length}`);
  console.log(`  GoStudent pages: ${gostudentClean.length}`);
  console.log(`  GoStudent subjects: ${output.summary.gostudentSubjects.join(", ")}`);
  console.log(`  GoStudent prices: ${output.summary.gostudentPrices.join(", ")}`);
}

main().catch(console.error);
