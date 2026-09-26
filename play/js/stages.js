/* Ink Rally: The stages, written as pacenotes.
   ['S',80] straight 80 m · ['L',3,90] left grade 3 for 90° (1 = hairpin tight, 6 = nearly flat)
   ['R',1,170,1] the fourth value marks a "caution" note · ['crest'] · ['jump'] · ['surf','tarmac'] */
"use strict";
const STAGES=[
  { id:'pinewood', name:'Pinewood', place:'Forest gravel', surface:'gravel', trees:'pine', seed:7,
    blurb:'Fast gravel through the pines. A good place to learn to slide.',
    notes:[
      ['S',120],['R',5,40],['S',60],['L',4,60],['S',90],['crest'],['S',40],['R',3,80],['S',50],['L',3,70],
      ['S',140],['L',5,30],['S',60],['R',2,100,1],['S',70],['L',4,50],['S',40],['R',4,50],['S',110],['jump'],['S',50],
      ['L',1,165],['S',80],['R',5,45],['S',60],['R',3,70],['S',40],['L',3,70],['S',120],['crest'],['S',70],['L',2,90],
      ['S',60],['R',4,60],['S',150]
    ]},
  { id:'chalk', name:'Chalk Hills', place:'Downland tarmac', surface:'tarmac', trees:'round', seed:23,
    blurb:'Grippy tarmac over rolling crests. Brake late and carry speed.',
    notes:[
      ['S',160],['crest'],['S',60],['L',4,70],['S',80],['R',4,70],['S',60],['L',3,90],['S',50],['R',3,90],
      ['S',180],['jump'],['S',60],['R',1,175,1],['S',90],['L',5,40],['S',70],['L',2,100],['S',60],['R',5,50],
      ['S',140],['crest'],['S',40],['R',2,95],['S',40],['L',2,95],['S',120],['surf','gravel'],['L',4,60],['S',70],
      ['R',3,80],['S',60],['crest'],['S',90],['L',1,170,1],['S',60],['surf','tarmac'],['R',6,40],['S',180]
    ]},
  { id:'frostmere', name:'Frostmere', place:'Snow and ice', surface:'snow', trees:'pine', seed:41,
    blurb:'Slippery snow by a frozen lake. Turn in early and let it slide.',
    notes:[
      ['S',110],['L',4,60],['S',70],['R',3,80],['S',60],['R',5,40],['S',100],['L',2,110,1],['S',70],['crest'],
      ['S',50],['R',3,70],['S',50],['L',4,50],['S',130],['R',1,170,1],['S',90],['L',5,50],['S',50],['L',3,80],
      ['S',60],['jump'],['S',70],['R',2,100],['S',60],['L',4,70],['S',140],['R',4,60],['S',50],['L',1,160,1],['S',160]
    ]}
];
