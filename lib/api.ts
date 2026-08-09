import { NextResponse } from 'next/server';import { currentSession } from './session';import { store } from './store';
export async function actor(){await store.bootstrap();const s=await currentSession(); if(!s)return null; return store.getUser(s.userId)??null}
export function json(data:unknown,status=200){return NextResponse.json(data,{status})}
export function safe(e:unknown){const err=e as {message?:string;status?:number};return json({error:err.message||'Something went wrong.'},err.status||500)}
