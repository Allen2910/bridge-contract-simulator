import { DdsEngine } from "./dds-api.js";

const SUITS = ["S", "H", "D", "C"];
const RANKS = "AKQJT98765432";
const HONORS = new Set(["A", "K", "Q", "J"]);
const HCP = { A: 4, K: 3, Q: 2, J: 1 };
const ALL_CARDS = SUITS.flatMap(suit => [...RANKS].map(rank => suit + rank));
const DENOMINATION_INDEX = { S: 0, H: 1, D: 2, C: 3, NT: 4 };
const DECLARER_INDEX = { N: 0, S: 2 };
let language = "zh-Hant";

function fail(message, english = message) { throw new Error(language === "en" ? english : message); }
function englishLabel(label) {
  return label
    .replace("南北合計", "Combined N/S")
    .replace("北家", "North")
    .replace("南家", "South");
}
function normalizeRanks(text) { return String(text ?? "").toUpperCase().replaceAll("10", "T").replaceAll(" ", ""); }

function parseRange(text, maximum, label) {
  const normalized = String(text ?? "").replaceAll(" ", "");
  const pieces = normalized.split("-");
  const lower = Number(pieces[0]);
  const upper = pieces.length === 1 ? lower : Number(pieces[1]);
  if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower < 0 || lower > upper || upper > maximum) {
    fail(`${label}必須介於 0 到 ${maximum}，例如 11-21`, `${englishLabel(label)} must be between 0 and ${maximum}, for example 11-21`);
  }
  return [lower, upper];
}

function parseShapes(text) {
  if (!String(text ?? "").trim()) return [];
  const shapes = [];
  for (const raw of String(text).split(",")) {
    const compact = raw.trim().replaceAll(" ", "");
    let numbers;
    if (/^\d{4}$/.test(compact)) numbers = [...compact].map(Number);
    else numbers = compact.split(/[-/]/).map(Number);
    if (numbers.length !== 4 || numbers.some(value => !Number.isInteger(value)) || numbers.reduce((a, b) => a + b, 0) !== 13) {
      fail("牌型必須是合計 13 張的四個數字，例如 5332 或 5-4-2-2", "A shape must contain four numbers totaling 13, such as 5332 or 5-4-2-2");
    }
    shapes.push(numbers.sort((a, b) => b - a).join(""));
  }
  return [...new Set(shapes)];
}

function parseSuitLengths(text) {
  if (!String(text ?? "").trim()) return [null, null, null, null];
  const compact = String(text).trim().replaceAll(" ", "").replaceAll("*", "?");
  const pieces = /^[0-9?]{4}$/.test(compact) ? [...compact] : compact.split(/[-,/]/);
  if (pieces.length !== 4) fail("花色張數請依 S-H-D-C 輸入，例如 5-?-?-?", "Enter suit lengths in S-H-D-C order, for example 5-?-?-?");
  const values = pieces.map(piece => {
    if (["?", "x", "X", "_"].includes(piece)) return null;
    const value = Number(piece);
    if (!Number.isInteger(value) || value < 0 || value > 13) fail("每門花色張數必須介於 0 到 13", "Each suit length must be between 0 and 13");
    return value;
  });
  const total = values.filter(value => value !== null).reduce((a, b) => a + b, 0);
  if (total > 13 || (values.every(value => value !== null) && total !== 13)) fail("花色張數無法組成 13 張牌", "The suit lengths cannot form a 13-card hand");
  return values;
}

function parseHoldings(text) {
  if (!String(text ?? "").trim()) return [];
  const seen = new Set();
  return String(text).split(",").map(raw => {
    const match = raw.trim().match(/^([SHDC♠♥♦♣])\s*[:=]\s*(.+)$/i);
    if (!match) fail("特定花色請使用 S=AKQJ10xxx 格式", "Use the format S=AKQJ10xxx for a specific suit holding");
    const suitMap = { "♠": "S", "♥": "H", "♦": "D", "♣": "C" };
    const suit = suitMap[match[1]] ?? match[1].toUpperCase();
    if (seen.has(suit)) fail(`${suit} 花色只能設定一次`, `${suit} can only be specified once`);
    seen.add(suit);
    const pattern = normalizeRanks(match[2]);
    if (!/^[AKQJT98765432X]+$/.test(pattern)) fail("牌張模式只能使用 A K Q J 10/T 9…2 和 x", "A holding pattern may only use A K Q J 10/T 9…2 and x");
    const required = [...pattern].filter(rank => rank !== "X");
    if (new Set(required).size !== required.length) fail("同一門不可重複指定相同牌張", "A rank cannot be repeated within the same suit");
    const smallCount = [...pattern].filter(rank => rank === "X").length;
    const availableSmall = [...RANKS].filter(rank => !HONORS.has(rank) && !required.includes(rank)).length;
    if (smallCount > availableSmall) fail("沒有足夠的小牌可填入 x", "There are not enough spot cards available for the x placeholders");
    return { suit, required: new Set(required), smallCount, length: required.length + smallCount };
  });
}

function parseOpponentSplits(text) {
  if (!String(text ?? "").trim()) return [];
  const splits = [];
  for (const raw of String(text).replaceAll("／", "/").split(",")) {
    const pieces = raw.trim().replaceAll("/", "-").split("-").map(Number);
    if (pieces.length !== 2 || pieces.some(value => !Number.isInteger(value) || value < 0 || value > 13) || pieces[0] + pieces[1] > 13) {
      fail("東西王牌分布請輸入例如 3-1,2-2,4-0", "Enter E/W trump splits such as 3-1,2-2,4-0");
    }
    const split = pieces.sort((a, b) => b - a).join("-");
    if (!splits.includes(split)) splits.push(split);
  }
  return splits;
}

function makeConstraint(raw, label) {
  const [hcpMin, hcpMax] = parseRange(raw.hcp, 37, `${label} HCP`);
  const shapes = parseShapes(raw.shapes);
  const lengths = parseSuitLengths(raw.suitLengths);
  const holdings = parseHoldings(raw.holdings);
  for (const holding of holdings) {
    const index = SUITS.indexOf(holding.suit);
    if (lengths[index] !== null && lengths[index] !== holding.length) fail(`${label}${holding.suit}的張數與特定牌張互相矛盾`, `${englishLabel(label)} ${holding.suit} length conflicts with the specified holding`);
    lengths[index] = holding.length;
  }
  if (lengths.every(value => value !== null) && lengths.reduce((a, b) => a + b, 0) !== 13) fail(`${label}的花色張數無法組成 13 張牌`, `${englishLabel(label)} suit lengths cannot form a 13-card hand`);
  return { hcpMin, hcpMax, shapes, lengths, holdings, singleton: raw.singleton, void: raw.void };
}

function parseHand(text, label) {
  const holdings = normalizeRanks(text).split(".");
  if (holdings.length !== 4) fail(`${label}請依 S.H.D.C 輸入四門牌`, `Enter ${englishLabel(label)}'s four suits in S.H.D.C order`);
  const cards = [];
  holdings.forEach((holding, index) => {
    if (["-", "VOID"].includes(holding)) holding = "";
    for (const rank of holding) {
      if (!RANKS.includes(rank)) fail(`${label}包含無法辨識的牌張 ${rank}`, `${englishLabel(label)} contains an unrecognized rank: ${rank}`);
      cards.push(SUITS[index] + rank);
    }
  });
  if (cards.length !== 13) fail(`${label}必須正好 13 張，目前是 ${cards.length} 張`, `${englishLabel(label)} must have exactly 13 cards; currently ${cards.length}`);
  if (new Set(cards).size !== 13) fail(`${label}有重複牌張`, `${englishLabel(label)} contains duplicate cards`);
  return cards;
}

function handShape(hand) { return SUITS.map(suit => hand.filter(card => card[0] === suit).length); }
function handHcp(hand) { return hand.reduce((total, card) => total + (HCP[card[1]] ?? 0), 0); }

function matchesHolding(hand, holding) {
  const actual = new Set(hand.filter(card => card[0] === holding.suit).map(card => card[1]));
  if (actual.size !== holding.length) return false;
  for (const rank of holding.required) if (!actual.has(rank)) return false;
  const wildcards = [...actual].filter(rank => !holding.required.has(rank));
  return wildcards.length === holding.smallCount && wildcards.every(rank => !HONORS.has(rank));
}

function matchesHand(hand, constraint) {
  const points = handHcp(hand);
  if (points < constraint.hcpMin || points > constraint.hcpMax) return false;
  const shape = handShape(hand);
  const canonical = [...shape].sort((a, b) => b - a).join("");
  if (constraint.shapes.length && !constraint.shapes.includes(canonical)) return false;
  if (constraint.lengths.some((expected, index) => expected !== null && expected !== shape[index])) return false;
  if (constraint.holdings.some(holding => !matchesHolding(hand, holding))) return false;
  if (constraint.singleton && !shape.includes(1)) return false;
  if (constraint.void && !shape.includes(0)) return false;
  return true;
}

function partnershipSettings(request) {
  const noTrump = request.contract.denomination === "NT";
  const minimumFit = noTrump ? 0 : Number(request.minimumFit);
  const maximumFit = noTrump ? 13 : Number(request.maximumFit);
  const opponentHcpMax = Number(request.opponentHcpMax);
  const opponentSplits = noTrump ? [] : parseOpponentSplits(request.opponentTrumpSplits);
  if (!Number.isInteger(minimumFit) || !Number.isInteger(maximumFit) || minimumFit < 0 || minimumFit > maximumFit || maximumFit > 13) {
    fail("南北王牌配合須介於 0 到 13，且最少不可大於最多", "The N/S trump fit must be between 0 and 13, and the minimum cannot exceed the maximum");
  }
  if (!Number.isInteger(opponentHcpMax) || opponentHcpMax < 0 || opponentHcpMax > 37) {
    fail("東家與西家各自 HCP 上限必須介於 0 到 37", "The HCP cap for each opponent must be between 0 and 37");
  }
  return { minimumFit, maximumFit, opponentHcpMax, opponentSplits };
}

function matchesPartnership(north, east, south, west, request, settings) {
  if (handHcp(east) > settings.opponentHcpMax || handHcp(west) > settings.opponentHcpMax) return false;
  if (request.contract.denomination === "NT") return true;
  const trump = request.contract.denomination;
  const fit = [...north, ...south].filter(card => card[0] === trump).length;
  if (fit < settings.minimumFit || fit > settings.maximumFit) return false;
  if (settings.opponentSplits.length) {
    const split = [east, west]
      .map(hand => hand.filter(card => card[0] === trump).length)
      .sort((a, b) => b - a)
      .join("-");
    if (!settings.opponentSplits.includes(split)) return false;
  }
  return true;
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function handToPbn(hand) {
  const cardSet = new Set(hand);
  return SUITS.map(suit => [...RANKS].filter(rank => cardSet.has(suit + rank)).join("")).join(".");
}

function dealToPbn(north, east, south, west) {
  return `N:${[north, east, south, west].map(handToPbn).join(" ")}`;
}

function exampleDeal(deal, tricks) {
  const seats = [["N", deal.north], ["E", deal.east], ["S", deal.south], ["W", deal.west]];
  return {
    tricks,
    hands: seats.map(([seat, hand]) => ({
      seat,
      hcp: handHcp(hand),
      shape: handShape(hand),
      suits: Object.fromEntries(SUITS.map(suit => [
        suit,
        [...RANKS].filter(rank => hand.includes(suit + rank)).join("") || "—"
      ]))
    }))
  };
}

function validateRequest(request) {
  const contract = request.contract;
  if (!Number.isInteger(contract.level) || contract.level < 1 || contract.level > 7) fail("合約線位必須介於 1 到 7", "The contract level must be between 1 and 7");
  if (!(contract.denomination in DENOMINATION_INDEX)) fail("合約花色錯誤", "Invalid contract strain");
  if (!(contract.declarer in DECLARER_INDEX)) fail("莊家必須是 N 或 S", "The declarer must be N or S");
  if (!Number.isInteger(request.samples) || request.samples < 1 || request.samples > 100000) fail("有效模擬副數必須介於 1 到 100,000", "The number of valid deals must be between 1 and 100,000");
}

function generateFixed(request, random, settings) {
  const north = parseHand(request.fixedNorth, "北家");
  const south = parseHand(request.fixedSouth, "南家");
  const overlap = north.filter(card => south.includes(card));
  if (overlap.length) fail(`南北兩家有重複牌張：${overlap.join(", ")}`, `North and South contain duplicate cards: ${overlap.join(", ")}`);
  const remaining = ALL_CARDS.filter(card => !north.includes(card) && !south.includes(card));
  if (remaining.reduce((total, card) => total + (HCP[card[1]] ?? 0), 0) > settings.opponentHcpMax * 2) {
    fail(`東西剩餘總點力無法讓兩家都不超過 ${settings.opponentHcpMax} HCP`, `The remaining HCP cannot be distributed with both opponents at or below ${settings.opponentHcpMax} HCP`);
  }
  const deals = [];
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = Math.max(request.samples * 1000, 1000000);
  while (deals.length < request.samples && attempts < maxAttempts) {
    const shuffled = shuffle([...remaining], random);
    const east = shuffled.slice(0, 13);
    const west = shuffled.slice(13);
    attempts++;
    if (!matchesPartnership(north, east, south, west, request, settings)) continue;
    const pbn = dealToPbn(north, east, south, west);
    if (seen.has(pbn)) continue;
    seen.add(pbn); deals.push({ pbn, north, east, south, west });
    if (deals.length % 100 === 0 || deals.length === request.samples) postMessage({ type: "progress", stage: "generation", done: deals.length, total: request.samples, attempts });
  }
  return { deals, attempts };
}

function makeCandidate(northConstraint, southConstraint, random) {
  const conditioned = SUITS.map((_, index) => index).filter(index => northConstraint.lengths[index] !== null && southConstraint.lengths[index] !== null);
  if (!conditioned.length) {
    const deck = shuffle([...ALL_CARDS], random);
    return [deck.slice(0, 13), deck.slice(13, 26), deck.slice(26, 39), deck.slice(39)];
  }
  const north = [], south = [], eastWest = [], open = [];
  for (let index = 0; index < SUITS.length; index++) {
    const cards = [...RANKS].map(rank => SUITS[index] + rank);
    if (!conditioned.includes(index)) { open.push(...cards); continue; }
    const northCount = northConstraint.lengths[index];
    const southCount = southConstraint.lengths[index];
    if (northCount + southCount > 13) fail(`南北${SUITS[index]}張數合計不可超過 13`, `The combined N/S ${SUITS[index]} length cannot exceed 13`);
    shuffle(cards, random);
    north.push(...cards.slice(0, northCount));
    south.push(...cards.slice(northCount, northCount + southCount));
    eastWest.push(...cards.slice(northCount + southCount));
  }
  shuffle(open, random);
  const northNeeded = 13 - north.length;
  const southNeeded = 13 - south.length;
  if (northNeeded < 0 || southNeeded < 0 || northNeeded + southNeeded > open.length) fail("指定的花色張數無法組成兩手 13 張牌", "The specified suit lengths cannot form two 13-card hands");
  north.push(...open.slice(0, northNeeded));
  south.push(...open.slice(northNeeded, northNeeded + southNeeded));
  eastWest.push(...open.slice(northNeeded + southNeeded));
  shuffle(eastWest, random);
  return [north, eastWest.slice(0, 13), south, eastWest.slice(13)];
}

function generateConditions(request, random, settings) {
  const northConstraint = makeConstraint(request.north, "北家");
  const southConstraint = makeConstraint(request.south, "南家");
  const [combinedMin, combinedMax] = parseRange(request.combinedHcp, 40, "南北合計 HCP");
  if (combinedMax < northConstraint.hcpMin + southConstraint.hcpMin || combinedMin > northConstraint.hcpMax + southConstraint.hcpMax) fail("南北合計 HCP 與兩家各自範圍互相矛盾", "The combined N/S HCP range conflicts with the individual hand ranges");

  const deals = [];
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = Math.max(1000000, request.samples * 1000);
  while (deals.length < request.samples && attempts < maxAttempts) {
    const [north, east, south, west] = makeCandidate(northConstraint, southConstraint, random);
    attempts++;
    if (attempts % 10000 === 0) postMessage({ type: "progress", stage: "generation", done: deals.length, total: request.samples, attempts });
    if (!matchesHand(north, northConstraint) || !matchesHand(south, southConstraint)) continue;
    const totalHcp = handHcp(north) + handHcp(south);
    if (totalHcp < combinedMin || totalHcp > combinedMax) continue;
    if (!matchesPartnership(north, east, south, west, request, settings)) continue;
    const pbn = dealToPbn(north, east, south, west);
    if (seen.has(pbn)) continue;
    seen.add(pbn); deals.push({ pbn, north, east, south, west });
    if (deals.length % 50 === 0 || deals.length === request.samples) postMessage({ type: "progress", stage: "generation", done: deals.length, total: request.samples, attempts });
  }
  if (!deals.length) fail(`嘗試 ${attempts.toLocaleString()} 副後找不到任何符合條件的牌局`, `No matching deal was found after ${attempts.toLocaleString("en-US")} candidates`);
  return { deals, attempts };
}

function wilson(successes, total) {
  if (!total) return [0, 0];
  const z = 1.959963984540054;
  const proportion = successes / total;
  const denominator = 1 + z * z / total;
  const center = (proportion + z * z / (2 * total)) / denominator;
  const radius = z * Math.sqrt(proportion * (1 - proportion) / total + z * z / (4 * total * total)) / denominator;
  return [Math.max(0, center - radius), Math.min(1, center + radius)];
}

async function run(request) {
  language = request.language === "en" ? "en" : "zh-Hant";
  validateRequest(request);
  const seed = request.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const random = mulberry32(seed);
  const started = performance.now();
  postMessage({ type: "progress", stage: "loading", done: 0, total: 1 });
  const engine = await DdsEngine.create();
  const settings = partnershipSettings(request);
  const generated = request.mode === "fixed" ? generateFixed(request, random, settings) : generateConditions(request, random, settings);
  const trickCounts = Array(14).fill(0);
  const makingExamples = [];
  const failingExamples = [];
  const requiredTricks = request.contract.level + 6;
  const strain = DENOMINATION_INDEX[request.contract.denomination];
  const declarer = DECLARER_INDEX[request.contract.declarer];
  const opponentTrumpSplits = {};
  for (let index = 0; index < generated.deals.length; index++) {
    const deal = generated.deals[index];
    const { pbn } = deal;
    const tricks = engine.solveContract(pbn, strain, declarer);
    trickCounts[tricks]++;
    if (request.contract.denomination !== "NT") {
      const trump = request.contract.denomination;
      const split = [deal.east, deal.west]
        .map(hand => hand.filter(card => card[0] === trump).length)
        .sort((a, b) => b - a)
        .join("-");
      opponentTrumpSplits[split] = (opponentTrumpSplits[split] ?? 0) + 1;
    }
    const examples = tricks >= requiredTricks ? makingExamples : failingExamples;
    if (examples.length < 3) examples.push(exampleDeal(deal, tricks));
    if ((index + 1) % 10 === 0 || index + 1 === generated.deals.length) postMessage({ type: "progress", stage: "solve", done: index + 1, total: generated.deals.length });
  }
  const completed = generated.deals.length;
  const makingCount = trickCounts.reduce((sum, count, tricks) => sum + (tricks >= requiredTricks ? count : 0), 0);
  const weighted = trickCounts.reduce((sum, count, tricks) => sum + count * tricks, 0);
  const interval = wilson(makingCount, completed);
  postMessage({
    type: "complete",
    result: {
      contract: request.contract,
      requestedSamples: request.samples,
      completedSamples: completed,
      attempts: generated.attempts,
      seed,
      trickCounts,
      makingCount,
      failingCount: completed - makingCount,
      makingRate: makingCount / completed,
      averageTricks: weighted / completed,
      confidenceInterval: interval,
      makingExamples,
      failingExamples,
      opponentTrumpSplits,
      elapsedSeconds: (performance.now() - started) / 1000,
      generationExhausted: completed < request.samples
    }
  });
}

self.addEventListener("message", event => {
  if (event.data?.type !== "start") return;
  run(event.data.request).catch(error => postMessage({ type: "error", message: error?.message || String(error) }));
});
