import test from 'ava';
import { LoyaltyTransaction } from '../src/api.js';
import { getQuarterlySummary } from '../src/utils.js';

const transactions: LoyaltyTransaction[] = [
  // 2024-Q1 (Jan–Mar): 2 BASE, Welcome Bonus x2, Dining Bonus x1
  { type: 'BASE',  postedDate: '2024-01-15', rewardAmount: { value: 100, currencyType: 'POINTS' }, descriptions: 'Purchase' },
  { type: 'BASE',  postedDate: '2024-02-10', rewardAmount: { value: 80,  currencyType: 'POINTS' }, descriptions: 'Purchase' },
  { type: 'BONUS', postedDate: '2024-03-01', rewardAmount: { value: 50,  currencyType: 'POINTS' }, descriptions: 'Welcome Bonus' },
  { type: 'BONUS', postedDate: '2024-03-20', rewardAmount: { value: 20,  currencyType: 'POINTS' }, descriptions: 'Welcome Bonus' },
  { type: 'BONUS', postedDate: '2024-02-28', rewardAmount: { value: 30,  currencyType: 'POINTS' }, descriptions: 'Dining Bonus' },
  // 2024-Q3 (Jul–Sep): 1 BASE, Travel Bonus x2, Dining Bonus x1
  { type: 'BASE',  postedDate: '2024-07-04', rewardAmount: { value: 200, currencyType: 'POINTS' }, descriptions: 'Purchase' },
  { type: 'BONUS', postedDate: '2024-07-20', rewardAmount: { value: 75,  currencyType: 'POINTS' }, descriptions: 'Travel Bonus' },
  { type: 'BONUS', postedDate: '2024-09-01', rewardAmount: { value: 50,  currencyType: 'POINTS' }, descriptions: 'Travel Bonus' },
  { type: 'BONUS', postedDate: '2024-08-15', rewardAmount: { value: 45,  currencyType: 'POINTS' }, descriptions: 'Dining Bonus' },
  // 2024-Q4 (Oct–Dec): 1 BASE, Holiday Bonus x2
  { type: 'BASE',  postedDate: '2024-11-11', rewardAmount: { value: 300, currencyType: 'POINTS' }, descriptions: 'Purchase' },
  { type: 'BONUS', postedDate: '2024-11-29', rewardAmount: { value: 150, currencyType: 'POINTS' }, descriptions: 'Holiday Bonus' },
  { type: 'BONUS', postedDate: '2024-12-25', rewardAmount: { value: 100, currencyType: 'POINTS' }, descriptions: 'Holiday Bonus' },
  // 2025-Q1 (Jan–Mar): 1 BASE, Welcome Bonus x1, Referral Bonus x2
  { type: 'BASE',  postedDate: '2025-02-14', rewardAmount: { value: 120, currencyType: 'POINTS' }, descriptions: 'Purchase' },
  { type: 'BONUS', postedDate: '2025-02-14', rewardAmount: { value: 60,  currencyType: 'POINTS' }, descriptions: 'Welcome Bonus' },
  { type: 'BONUS', postedDate: '2025-01-10', rewardAmount: { value: 40,  currencyType: 'POINTS' }, descriptions: 'Referral Bonus' },
  { type: 'BONUS', postedDate: '2025-03-05', rewardAmount: { value: 40,  currencyType: 'POINTS' }, descriptions: 'Referral Bonus' },
  // 2025-Q2 (Apr–Jun): 1 BASE, Travel Bonus x2, Dining Bonus x1
  { type: 'BASE',  postedDate: '2025-04-01', rewardAmount: { value: 80,  currencyType: 'POINTS' }, descriptions: 'Purchase' },
  { type: 'BONUS', postedDate: '2025-04-20', rewardAmount: { value: 40,  currencyType: 'POINTS' }, descriptions: 'Travel Bonus' },
  { type: 'BONUS', postedDate: '2025-06-30', rewardAmount: { value: 60,  currencyType: 'POINTS' }, descriptions: 'Travel Bonus' },
  { type: 'BONUS', postedDate: '2025-05-15', rewardAmount: { value: 35,  currencyType: 'POINTS' }, descriptions: 'Dining Bonus' },
];

test('getQuarterlySummary returns one entry per quarter sorted reverse chronologically', t => {
  const result = getQuarterlySummary(transactions);
  t.deepEqual(result.map(r => r.quarter), ['2025-Q2', '2025-Q1', '2024-Q4', '2024-Q3', '2024-Q1']);
});

test('getQuarterlySummary totals are correct per quarter', t => {
  const result = getQuarterlySummary(transactions);

  const q = Object.fromEntries(result.map(r => [r.quarter, r]));

  // 2024-Q1: base=180, Welcome Bonus=70 (50+20), Dining Bonus=30
  t.is(q['2024-Q1'].totalPoints, 280);
  t.is(q['2024-Q1'].basePoints, 180);
  t.deepEqual(q['2024-Q1'].bonusPoints, {
    'Welcome Bonus': { pointsEarned: 70 },
    'Dining Bonus': { pointsEarned: 30 },
  });

  // 2024-Q3: base=200, Travel Bonus=125 (75+50), Dining Bonus=45
  t.is(q['2024-Q3'].totalPoints, 370);
  t.is(q['2024-Q3'].basePoints, 200);
  t.deepEqual(q['2024-Q3'].bonusPoints, {
    'Travel Bonus': { pointsEarned: 125 },
    'Dining Bonus': { pointsEarned: 45 },
  });

  // 2024-Q4: base=300, Holiday Bonus=250 (150+100)
  t.is(q['2024-Q4'].totalPoints, 550);
  t.is(q['2024-Q4'].basePoints, 300);
  t.deepEqual(q['2024-Q4'].bonusPoints, { 'Holiday Bonus': { pointsEarned: 250 } });

  // 2025-Q1: base=120, Welcome Bonus=60, Referral Bonus=80 (40+40)
  t.is(q['2025-Q1'].totalPoints, 260);
  t.is(q['2025-Q1'].basePoints, 120);
  t.deepEqual(q['2025-Q1'].bonusPoints, {
    'Welcome Bonus': { pointsEarned: 60 },
    'Referral Bonus': { pointsEarned: 80 },
  });

  // 2025-Q2: base=80, Travel Bonus=100 (40+60), Dining Bonus=35
  t.is(q['2025-Q2'].totalPoints, 215);
  t.is(q['2025-Q2'].basePoints, 80);
  t.deepEqual(q['2025-Q2'].bonusPoints, {
    'Travel Bonus': { pointsEarned: 100 },
    'Dining Bonus': { pointsEarned: 35 },
  });
});
