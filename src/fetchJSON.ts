import fetch from 'node-fetch';

type hebcalRETURN = {
    title: string,
    date: string,
    items: {
        date: string,
        hebrew: string,
        category: string
    }[]
}

export default async function fetchJSON( uri: string ):Promise<hebcalRETURN|undefined> {
    const res = await fetch( uri );

    if (res.ok ) {
        const ret = await res.json();
        return ret;       
    }
    console.error( `fetchJSON(): fetch() apparently failed: ${res.status}`);
    return undefined;
}