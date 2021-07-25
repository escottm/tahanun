import fetch from 'node-fetch';
import { HEBCAL_ITEM } from './holidays.js'

type hebcalRETURN = {
    title: string,
    date: string,
    events: string[];
    items: {
        date: string,
        hebrew: string,
        category: string
    }[]
}

export default async function fetchJSON( uri: string ):Promise<HEBCAL_ITEM|undefined> {
    const res = await fetch( uri );

    if (res.ok )
        return await res.json();

    console.error( `fetchJSON(): fetch() apparently failed: ${res.status}`);
    return undefined;
}