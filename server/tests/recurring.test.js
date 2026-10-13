import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schoolDate,recurringExitIssue,validityDates} from '../../shared/recurring.mjs';
import {passSchema} from '../validators/index.js';
const pass={passDate:'2026-10-10',recurring:{enabled:true,endDate:'2026-10-16',exitTime:'13:00'}};
test('recurring passes enforce school-local dates, daily time, and duplicate exits',()=>{
 assert.equal(schoolDate('2026-10-09T18:30:00Z'),'2026-10-10');
 assert.match(recurringExitIssue(pass,new Date('2026-10-09T13:00:00+05:30')),/date range/);
 assert.match(recurringExitIssue(pass,new Date('2026-10-10T12:59:59+05:30')),/time/);
 assert.equal(recurringExitIssue(pass,new Date('2026-10-10T13:00:00+05:30')),null);
 const used={...pass,recurring:{...pass.recurring,lastExitDate:'2026-10-10'}};
 assert.match(recurringExitIssue(used,new Date('2026-10-10T14:00:00+05:30')),/already/);
 assert.equal(recurringExitIssue(used,new Date('2026-10-11T13:00:00+05:30')),null);
 assert.equal(recurringExitIssue(pass,new Date('2026-10-16T23:59:59+05:30')),null);
 assert.match(recurringExitIssue(pass,new Date('2026-10-17T00:00:00+05:30')),/date range/);
 assert.equal(recurringExitIssue({}),null);
 assert.deepEqual(validityDates('2026-12-30','2027-01-02'),['2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
});
test('recurring request validation requires an end date and disallows return and emergency requests',()=>{
 const base={student:'a'.repeat(24),requestType:'SHORT_LEAVE',reason:'Daily appointment',requestedExit:'2026-10-10T13:00:00+05:30',guardian:{type:'Father',name:'Parent'},recurrence:'WEEKLY',validUntil:'2026-10-16'};
 assert.equal(passSchema.safeParse(base).success,true);
 assert.equal(passSchema.safeParse({...base,validUntil:undefined}).success,false);
 assert.equal(passSchema.safeParse({...base,expectedReturn:'2026-10-10T15:00:00+05:30'}).success,false);
 assert.equal(passSchema.safeParse({...base,requestType:'EMERGENCY'}).success,false);
});
