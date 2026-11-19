// casino.js — the Solmar Casino at the Palmera Resort.
// Venn's money used to wash through this room; now the tables are
// open to anyone with cash and nerve. Two games, both with real
// stakes against Mara's wallet: the slots, three reels with a pay
// table, and blackjack, one hand at a time against the house dealer.
// Wins and losses persist in the save, and the biggest single win is
// remembered — the number every regular in Solmar wants to beat.

import { PLACES } from './city.js';
import { dist2D, randInt, money } from './util.js';

export const CASINO_DOOR = { x: -128, z: 224, name: 'Solmar Casino' };
export const CASINO_RADIUS = 12;

// The slot machine's reels. Three sevens is the jackpot; three of
// anything else pays, and two cherries on the line gives the bet back.
export const SLOT_SYMBOLS = ['🍒', '🔔', '⭐', '🎨', '💎', '7️⃣', '🎬'];
export const SLOT_PAYTABLE = {
  '7️⃣': 25,
  '💎': 10,
  '🎬': 6, // the film clapper — the backlot's own symbol, added when the film job opened
  '⭐': 5,
  '🎨': 4,
  '🔔': 3,
  '🍒': 2,
};

export function makeCasinoState() {
  return {
    won: 0, // total cash won at the tables
    lost: 0, // total cash lost at the tables
    biggest: 0, // biggest single win, ever
    hands: 0, // blackjack hands played
    spins: 0, // slot spins played
    lastResult: '', // the last game's one-line result, for the panel
  };
}

export function casinoFromSave(saved) {
  const state = makeCasinoState();
  if (!saved || typeof saved !== 'object') return state;
  state.won = Math.max(0, Number(saved.won) || 0);
  state.lost = Math.max(0, Number(saved.lost) || 0);
  state.biggest = Math.max(0, Number(saved.biggest) || 0);
  state.hands = Math.max(0, Number(saved.hands) || 0);
  state.spins = Math.max(0, Number(saved.spins) || 0);
  return state;
}

// The casino door: on foot near the gold sign by the resort, the X
// key opens the tables.
export function casinoNear(x, z) {
  return dist2D(x, z, CASINO_DOOR.x, CASINO_DOOR.z) < CASINO_RADIUS;
}

// Spin the reels. Returns the spin: the three symbols, the win
// (0 when the house keeps the bet), and a line for the panel.
export function playSlots(state, bet) {
  const reels = [
    SLOT_SYMBOLS[randInt(0, SLOT_SYMBOLS.length - 1)],
    SLOT_SYMBOLS[randInt(0, SLOT_SYMBOLS.length - 1)],
    SLOT_SYMBOLS[randInt(0, SLOT_SYMBOLS.length - 1)],
  ];
  state.spins += 1;
  let win = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    win = bet * SLOT_PAYTABLE[reels[0]];
  } else if (reels[0] === reels[1] && reels[0] === '🍒') {
    win = bet; // two cherries on the line gives the bet back
  }
  if (win > 0) {
    state.won += win;
    if (win > state.biggest) state.biggest = win;
    // Three clappers is the backlot jackpot: the paytable pays 6×, and
    // the film lot's own line goes on the ticket — the house knows
    // whose symbol it is.
    const clapper = reels[0] === '🎬' && reels[1] === '🎬' && reels[2] === '🎬';
    state.lastResult = reels.join(' ') + ' — WIN $' + win.toLocaleString() + ' on a $' + bet + ' spin!' + (clapper ? ' BACKLOT JACKPOT — the film lot pays out!' : '');
  } else {
    state.lost += bet;
    state.lastResult = reels.join(' ') + ' — no line. The house keeps $' + bet + '.';
  }
  return { reels, bet, win, result: state.lastResult };
}

// A blackjack hand: two cards each, the player draws to 17 the way
// the house teaches it, the dealer draws to 17, and the better hand
// takes the pot. Blackjack itself (ace + ten) pays 3 to 2.
const BJ_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BJ_SUITS = ['♠', '♥', '♦', '♣'];

function drawCard() {
  return BJ_RANKS[randInt(0, BJ_RANKS.length - 1)] + BJ_SUITS[randInt(0, BJ_SUITS.length - 1)];
}

export function blackjackValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    const rank = card.slice(0, -1);
    if (rank === 'A') { total += 11; aces += 1; }
    else if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') total += 10;
    else total += Number(rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && blackjackValue(hand) === 21;
}

function handText(hand) {
  return hand.join(' ') + ' = ' + blackjackValue(hand);
}

// Play one blackjack hand for the bet. The player draws to 17 and the
// dealer draws to 17; the result names the winner and the payout.
export function playBlackjack(state, bet) {
  const playerHand = [drawCard(), drawCard()];
  const dealerHand = [drawCard(), drawCard()];
  while (blackjackValue(playerHand) < 17) playerHand.push(drawCard());
  while (blackjackValue(dealerHand) < 17) dealerHand.push(drawCard());
  const pv = blackjackValue(playerHand);
  const dv = blackjackValue(dealerHand);
  state.hands += 1;
  let win = 0;
  let line = '';
  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) {
    win = Math.floor(bet * 2.5); // blackjack pays 3 to 2, plus the stake back
    line = 'BLACKJACK! Pays 3 to 2.';
  } else if (pv > 21) {
    line = 'You bust. The dealer takes it.';
  } else if (dv > 21) {
    win = bet * 2;
    line = 'Dealer busts — you take the pot.';
  } else if (pv > dv) {
    win = bet * 2;
    line = 'Your hand holds. You win.';
  } else if (pv < dv) {
    line = 'The dealer has you beat.';
  } else {
    win = bet; // a push: the stake comes back
    line = 'A push — your stake comes back.';
  }
  if (win > 0) {
    state.won += win - bet;
    if (win - bet > state.biggest) state.biggest = win - bet;
  } else {
    state.lost += bet;
  }
  state.lastResult =
    'You: ' + handText(playerHand) + ' · Dealer: ' + handText(dealerHand) +
    ' — ' + line + (win > 0 ? ' +$' + win.toLocaleString() + '.' : '');
  return { playerHand, dealerHand, bet, win, result: state.lastResult };
}

// Roulette: one wheel, 37 pockets, and a bet on red, black, even,
// odd, or the lucky seven. Red, black, even and odd pay even money;
// the seven pays 35 to 1.
const ROULETTE_RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export function rouletteColor(number) {
  if (number === 0) return 'green';
  return ROULETTE_RED.includes(number) ? 'red' : 'black';
}

// Spin the wheel for the bet and the pick: 'red', 'black', 'even',
// 'odd' or 'seven'. Returns the number, its colour, the win (0 when
// the house keeps the bet), and a line for the panel.
export function playRoulette(state, bet, pick) {
  const number = randInt(0, 36);
  const color = rouletteColor(number);
  state.spins += 1;
  let win = 0;
  let line = '';
  if (pick === 'seven') {
    if (number === 7) { win = bet * 36; line = 'LUCKY SEVEN! Pays 35 to 1.'; }
    else line = 'The ball lands on ' + number + ' — not the seven.';
  } else if (pick === 'red' || pick === 'black') {
    if (color === pick) { win = bet * 2; line = color + ' hits — even money.'; }
    else line = 'The ball lands ' + color + ' ' + number + ' — the house keeps it.';
  } else if (pick === 'even' || pick === 'odd') {
    if (number !== 0 && ((pick === 'even') === (number % 2 === 0))) { win = bet * 2; line = number + ' is ' + pick + ' — even money.'; }
    else line = 'The ball lands on ' + number + ' — not ' + pick + '.';
  }
  if (win > 0) {
    state.won += win - bet;
    if (win - bet > state.biggest) state.biggest = win - bet;
    state.lastResult = 'Roulette ' + number + ' ' + color + ' — ' + line + ' +$' + win.toLocaleString() + '.';
  } else {
    state.lost += bet;
    state.lastResult = 'Roulette ' + number + ' ' + color + ' — ' + line;
  }
  return { number, color, bet, win, result: state.lastResult };
}

// The casino panel rows: two slot stakes and two blackjack stakes, each
// with its price and whether Mara can afford it.
export function casinoMenuItems(state, money) {
  const games = [
    { id: 'slots50', label: 'Slots — $50 a spin · jackpot 25x', cost: 50, kind: 'slots' },
    { id: 'slots200', label: 'Slots — $200 a spin · jackpot 25x', cost: 200, kind: 'slots' },
    { id: 'slots1000', label: 'Slots — $1,000 a spin · the whale machine', cost: 1000, kind: 'slots' },
    { id: 'slots5000', label: 'Slots — $5,000 a spin · the ghost machine, for hunters only', cost: 5000, kind: 'slots' },
    { id: 'bj100', label: 'Blackjack — $100 a hand · blackjack pays 3 to 2', cost: 100, kind: 'blackjack' },
    { id: 'bj500', label: 'Blackjack — $500 a hand · high roller', cost: 500, kind: 'blackjack' },
    { id: 'bj1000', label: 'Blackjack — $1,000 a hand · the whale table', cost: 1000, kind: 'blackjack' },
    { id: 'roulette-red', label: 'Roulette — Red $100 · pays even money', cost: 100, kind: 'roulette-red' },
    { id: 'roulette-black', label: 'Roulette — Black $100 · pays even money', cost: 100, kind: 'roulette-black' },
    { id: 'roulette-seven', label: 'Roulette — Lucky 7 $100 · pays 35 to 1', cost: 100, kind: 'roulette-seven' },
  ];
  return games.map((g) => ({ ...g, owned: false, afford: money >= g.cost }));
}

// One line under the panel title: lifetime at the tables.
export function casinoSummary(state) {
  const net = state.won - state.lost;
  const netText = net >= 0 ? 'up ' + money(net) : 'down ' + money(Math.abs(net));
  return state.hands + state.spins + ' games played · ' + netText + ' lifetime · biggest win ' + money(state.biggest) + '.';
}

// The HUD line: the casino at a glance.
export function casinoStatusLine(state) {
  if (state.hands + state.spins === 0) return '';
  const net = state.won - state.lost;
  return 'CASINO · ' + (net >= 0 ? '+$' + net.toLocaleString() : '−$' + Math.abs(net).toLocaleString()) + ' lifetime';
}

// The bet behind a panel button id, or 0 when the id is not a game.
export function casinoBetFor(id) {
  if (id === 'slots50') return { kind: 'slots', bet: 50 };
  if (id === 'slots200') return { kind: 'slots', bet: 200 };
  if (id === 'slots1000') return { kind: 'slots', bet: 1000 };
  if (id === 'slots5000') return { kind: 'slots', bet: 5000 };
  if (id === 'bj100') return { kind: 'blackjack', bet: 100 };
  if (id === 'bj500') return { kind: 'blackjack', bet: 500 };
  if (id === 'bj1000') return { kind: 'blackjack', bet: 1000 };
  if (id === 'roulette-red') return { kind: 'roulette-red', bet: 100 };
  if (id === 'roulette-black') return { kind: 'roulette-black', bet: 100 };
  if (id === 'roulette-seven') return { kind: 'roulette-seven', bet: 100 };
  return { kind: '', bet: 0 };
}
