// taxi.js — the taxi company: Mara's side business after the story.
// Driving the cab earns fares; the company tracks reputation and rank.
// Higher ranks pay better, unlock VIP fares (timed, big money), and
// let Mara chain fares: drop one passenger and the dispatcher sends
// the next pickup straight away, so a good driver never drives empty.

import { PLACES } from './city.js';

export const TAXI_RANKS = [
  { name: 'Rookie', repNeeded: 0, payBonus: 0 },
  { name: 'Pro', repNeeded: 8, payBonus: 0.25 },
  { name: 'Ace', repNeeded: 20, payBonus: 0.5 },
  { name: 'Legend', repNeeded: 40, payBonus: 1.0 },
];

export const VIP_FARE_MIN_REP = 8; // Pro rank unlocks VIP fares
export const CHAIN_FARE_BONUS = 0.5; // chained fares pay 50% extra

export function makeTaxiCompany() {
  return {
    rep: 0,
    rank: 0,
    fares: 0,
    vipFares: 0,
    chain: 0, // current chain length (0 = not chaining)
    bestChain: 0,
    earned: 0,
  };
}

export function taxiFromSave(saved) {
  const company = makeTaxiCompany();
  if (saved && typeof saved === 'object') {
    company.rep = Math.max(0, Number(saved.rep) || 0);
    company.rank = Math.max(0, Math.min(TAXI_RANKS.length - 1, Number(saved.rank) || 0));
    company.fares = Math.max(0, Number(saved.fares) || 0);
    company.vipFares = Math.max(0, Number(saved.vipFares) || 0);
    company.bestChain = Math.max(0, Number(saved.bestChain) || 0);
    company.earned = Math.max(0, Number(saved.earned) || 0);
  }
  return company;
}

export function taxiRank(company) {
  return TAXI_RANKS[company.rank];
}

// Pay for a fare: base pay, rank bonus, VIP multiplier, chain bonus.
export function taxiFarePay(company, base, vip) {
  const rank = taxiRank(company);
  let pay = base * (1 + rank.payBonus);
  if (vip) pay *= 1.8;
  if (company.chain > 0) pay *= 1 + CHAIN_FARE_BONUS;
  return Math.round(pay);
}

// A fare is done: bank the reputation, count the chain, and check for
// a rank-up. Returns { rankUp, rankName } when the rank changed.
export function onTaxiFareDone(company, vip, pay) {
  company.fares += 1;
  if (vip) company.vipFares += 1;
  company.rep += vip ? 2 : 1;
  company.earned += pay;
  company.chain += 1;
  if (company.chain > company.bestChain) company.bestChain = company.chain;
  let rankUp = false;
  let rankName = null;
  while (company.rank + 1 < TAXI_RANKS.length && company.rep >= TAXI_RANKS[company.rank + 1].repNeeded) {
    company.rank += 1;
    rankUp = true;
    rankName = TAXI_RANKS[company.rank].name;
  }
  return { rankUp, rankName };
}

// The chain breaks when the player walks away from the cab or takes a
// mission job — the dispatcher moves on to the next driver.
export function breakTaxiChain(company) {
  company.chain = 0;
}

// VIP fares are offered by the dispatcher: a timed trip for a guest
// who pays nearly double. Only from Pro rank up, and only about one
// fare in three, so they stay special.
export function rollVipFare(company, rng) {
  if (company.rep < VIP_FARE_MIN_REP) return false;
  return rng() < 0.34;
}

// Pick a destination for a company fare. VIP guests always want the
// resort or the airport — the two places that pay the most.
export function companyFareDestination(rng, vip) {
  const keys = vip
    ? ['resort', 'airport', 'terminal']
    : ['resort', 'airport', 'terminal', 'plaza', 'marina', 'cafe', 'mall', 'harbor', 'docks'];
  const key = keys[Math.floor(rng() * keys.length)];
  return { key, place: PLACES[key] };
}

export function taxiStatusLine(company) {
  const rank = taxiRank(company);
  const next = TAXI_RANKS[company.rank + 1];
  const nextText = next ? ` · ${next.repNeeded - company.rep} rep to ${next.name}` : ' · max rank';
  const chainText = company.chain > 0 ? ` · chain x${company.chain}` : '';
  return `Taxi Co. — ${rank.name} · ${company.rep} rep${nextText}${chainText} · earned $${company.earned.toLocaleString()}`;
}

// What this fare will pay, before the meter stops: the base pay with
// the rank, VIP and chain bonuses applied, so the driver can see the
// money coming. Used by the HUD when a fare is live.
export function taxiFarePreview(company, base, vip) {
  return taxiFarePay(company, base, vip);
}

// The chain bonus in plain words: what the next chained fare is worth
// over a fresh one, so the player understands why the dispatcher keeps
// sending pickups.
export function taxiChainText(company) {
  if (company.chain <= 0) return 'No chain — finish a fare to start one.';
  const bonus = Math.round(CHAIN_FARE_BONUS * 100);
  return `Chain x${company.chain}: the next fare pays +${bonus}% on top of the rank bonus.`;
}
