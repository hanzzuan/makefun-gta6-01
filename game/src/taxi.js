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
export const CLUB_VIP_FARE_REP = 5; // Club Neon at rep 5 unlocks VIP fares too

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

// Pay for a fare: base pay, rank bonus, VIP multiplier, chain bonus,
// and the east-side bonus when the destination is the stadium, the
// campus or the mall — the long cross-city runs pay 25% extra. Dee the
// driver on the crew adds another 25%: a pro behind the wheel is worth
// the tip.
export function taxiFarePay(company, base, vip, destKey, driver) {
  const rank = taxiRank(company);
  let pay = base * (1 + rank.payBonus);
  if (vip) pay *= 1.8;
  if (company.chain > 0) pay *= 1 + CHAIN_FARE_BONUS;
  if (destKey && TAXI_EAST_DESTINATIONS.includes(destKey)) pay *= 1 + TAXI_EAST_BONUS;
  if (destKey && TAXI_BOUNTY_DESTINATIONS.includes(destKey)) pay *= 1 + TAXI_BOUNTY_BONUS;
  if (destKey && TAXI_MURAL_DESTINATIONS.includes(destKey)) pay *= 1 + TAXI_MURAL_BONUS;
  if (destKey && TAXI_FILM_DESTINATIONS.includes(destKey)) pay *= 1 + TAXI_FILM_BONUS;
  if (driver) pay *= 1.25;
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
// fare in three, so they stay special. A club with a name helps too:
// Club Neon at reputation 5 puts Mara on the VIP list on its own.
export function rollVipFare(company, rng, clubRep) {
  if (company.rep < VIP_FARE_MIN_REP && (clubRep || 0) < CLUB_VIP_FARE_REP) return false;
  return rng() < 0.34;
}

// East Solmar pays extra: every trip to the stadium, the campus or the
// mall is a long cross-city run, so the meter runs 25% hotter there.
export const TAXI_EAST_DESTINATIONS = ['stadium', 'campus', 'mall'];
export const TAXI_EAST_BONUS = 0.25;
// Fares to the fugitives' hideouts pay danger money: the back alley,
// the harbor and the freight yard are not safe streets after dark.
export const TAXI_BOUNTY_DESTINATIONS = ['backalley', 'harbor', 'freight'];
export const TAXI_BOUNTY_BONUS = 0.15;
// Fares to Mural Row pay for the view: tourists ride out to watch the
// walls go up, and they tip for the colour.
export const TAXI_MURAL_DESTINATIONS = ['mural-row'];
export const TAXI_MURAL_BONUS = 0.2;
// Fares to the film lot pay premiere money: the backlot is the far
// side of the beach, and the film crew tips for the ride.
export const TAXI_FILM_DESTINATIONS = ['film-lot', 'runway', 'stadium'];
// The film destinations are the shoot locations: the backlot, the
// runway strip and the stadium bowl — a fare to any of them pays the
// film bonus, because the crew always tips the driver who gets them
// to the set on time.
export const TAXI_FILM_BONUS = 0.3;

// Pick a destination for a company fare. VIP guests always want the
// resort or the airport — the two places that pay the most — and since
// the club opened, the neon door too. The regular list covers the
// whole city, east side included; 'docks' used to sit here, but there
// is no such place in Solmar — the dockside is water, and no taxi
// drives there.
export function companyFareDestination(rng, vip) {
  const keys = vip
    ? ['resort', 'airport', 'terminal', 'nightclub', 'film-lot']
    : ['resort', 'airport', 'terminal', 'plaza', 'marina', 'cafe', 'mall', 'harbor', 'stadium', 'campus', 'nightclub', 'mural-row', 'film-lot'];
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

// A fare that ends at the garage pays a 10% tip: the rider is usually
// a job client, and job clients tip the driver who brings them home.
export const TAXI_JOB_BONUS = 0.1;
export function taxiJobBonusPay(pay) {
  return Math.round(pay * TAXI_JOB_BONUS);
}

// A night fare pays 15% more: the meter runs hot after dark, and the
// passengers who ride at 2 a.m. tip like it.
export const TAXI_NIGHT_BONUS = 0.15;
export function taxiNightBonusPay(pay) {
  return Math.round(pay * TAXI_NIGHT_BONUS);
}
