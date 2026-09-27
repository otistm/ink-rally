/* Ink Rally: The stages, written as pacenotes.
   ['S',80] straight 80 m · ['L',3,90] left grade 3 for 90° (1 = hairpin tight, 6 = nearly flat)
   ['R',1,170,1] the fourth value marks a "caution" note · ['crest'] · ['jump'] · ['surf','tarmac']
   rev: bump it whenever a stage's layout changes, so old best times on the old road are set aside. */
"use strict";
const STAGES=[
  { id:'pinewood', rev:2, name:'Pinewood', place:'Forest gravel', surface:'gravel', trees:'pine', seed:7,
    blurb:'Flowing gravel through the pines. Slide the bends to build a boost.',
    notes:[
      ['S',120],['R',4,60],['L',4,60],['S',80],['jump'],['S',70],['R',3,80],['S',40],['L',5,50],['S',90],
      ['L',3,90],['R',3,90],['S',110],['crest'],['S',60],['R',2,110],['S',60],['L',4,70],['R',5,40],['S',100],
      ['jump'],['S',80],['L',3,70],['R',4,90],['S',70],['L',1,160,1],['S',90],['R',4,60],['L',4,60],['R',4,60],
      ['S',110],['jump'],['S',70],['R',3,80],['S',150]
    ]},
  { id:'chalk', rev:2, name:'Chalk Hills', place:'Downland tarmac', surface:'tarmac', trees:'round', seed:23,
    blurb:'Fast tarmac over rolling crests. Carry your speed and fly the jumps.',
    notes:[
      ['S',160],['crest'],['S',70],['L',5,50],['R',5,50],['S',90],['L',3,90],['S',50],['R',4,70],['S',140],
      ['jump'],['S',80],['R',2,120,1],['S',80],['L',4,60],['R',4,60],['S',60],['crest'],['S',90],['L',3,100],
      ['S',50],['R',5,40],['S',120],['surf','gravel'],['R',3,80],['L',3,80],['S',70],['jump'],['S',70],
      ['surf','tarmac'],['L',2,110],['S',70],['R',4,70],['S',60],['crest'],['S',80],['L',5,50],['S',170]
    ]},
  { id:'frostmere', rev:2, name:'Frostmere', place:'Snow and ice', surface:'snow', trees:'pine', seed:41,
    blurb:'Long, lazy slides on snow by a frozen lake. Easy to drift, hard to master.',
    notes:[
      ['S',110],['L',4,70],['S',60],['R',3,90],['S',50],['R',5,40],['S',90],['L',3,80],['R',3,80],['S',80],
      ['jump'],['S',80],['R',4,60],['S',50],['L',2,120,1],['S',90],['R',4,70],['L',5,40],['S',110],['crest'],
      ['S',60],['L',3,90],['S',60],['jump'],['S',70],['R',3,70],['L',4,90],['S',80],['R',1,165,1],['S',90],
      ['L',4,60],['R',5,40],['S',150]
    ]},
  { id:'moor', rev:1, name:'Blackstone Moor', place:'Moorland gravel', surface:'gravel', trees:'rock', seed:59,
    blurb:'Wide open moor, big crests and bigger jumps. The boulders don’t move.',
    notes:[
      ['S',140],['crest'],['S',60],['R',5,45],['S',70],['jump'],['S',80],['L',3,85],['S',50],['R',4,70],
      ['S',130],['crest'],['S',50],['crest'],['S',70],['L',5,50],['R',5,50],['S',90],['R',2,115,1],['S',80],
      ['jump'],['S',90],['L',4,65],['S',60],['L',3,80],['R',3,80],['S',120],['crest'],['S',60],['R',4,60],
      ['S',70],['jump'],['S',80],['L',1,165,1],['S',90],['R',5,40],['L',5,40],['S',100],['jump'],['S',150]
    ]}
];
