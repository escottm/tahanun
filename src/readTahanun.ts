import { response } from 'express';
import dateString from './datestring.js';
import fetchJSON from './fetchJSON.js';
import r2l from './r2l.js';
import { List } from 'immutable'
import { isHoliday, minchaErev, HEBCAL_ITEM, SERVICES } from './holidays.js'

const EMPTY_ITEM:HEBCAL_ITEM = {date:''};   //  minimal HEBCAL_ITEM for non-holiday or error returns, mostly

//  See https://www.hebcal.com/home/195/jewish-calendar-rest-api 
const CONVERT_API = 'https://www.hebcal.com/converter';

//  translate given date into format required by Hebcal API
const dateArgs = ( d: Date ) => `gy=${d.getFullYear()}&gm=${d.getMonth()+1}&gd=${d.getDate()}`; 

async function getHebDate( secDate: Date ): Promise<HEBCAL_ITEM|undefined> {
    const ds = dateString( secDate ); 
    console.log( `getHebDate: checking holidays on ${ds}`);

    const holAPI = `${CONVERT_API}?v=1&cfg=json&${dateArgs(secDate)}`;
    const theJSON = await fetchJSON( holAPI );

    if ( ! theJSON ) {
        console.warn( `getHebDate: call to fetchJSON() failed!`);
        return undefined;
    }

    return <HEBCAL_ITEM>{...theJSON, date:ds};
}

function getHoliday( hebCal: HEBCAL_ITEM ):HEBCAL_ITEM {
    if ( ! hebCal.events ) 
        return( {...hebCal, holiday:false} );   //  no holiday, send back what we got
    
    const events = List<string>(hebCal.events);
    const holiday = events.find( e => isHoliday( e ));
    if ( ! holiday ) return( {...hebCal, holiday:false} );      // no holiday, send back what we got
    const erev = minchaErev( holiday );

    return ({...hebCal, holiday:true, title:holiday, minchaErev:erev});
}

const erevify = (hol: string) => 'Erev '+hol;

//  return a Date object representing the day following the Date provided
function dayAfter( today: Date ) {
    const nextDay = new Date( today );
    nextDay.setDate( nextDay.getDate() + 1);
    return nextDay;
}

//  are we within one of the date ranges during which tahanun is omitted?
function inExclRange( hebdate:HEBCAL_ITEM ):HEBCAL_ITEM {
    if ( !hebdate.hm || !hebdate.hd ) {  //  Shouldn't happen
        console.warn( `inExclRange: missing date and/or month`);
        return ({...hebdate, tahanun: true, title: '<unknown>'});
    }

    if ( hebdate.hm == 'Nisan') 
        return ({...hebdate, tahanun: false, title: 'Nisan'});   //  No tahanun for the entire month of ניסן
    if ( ( hebdate.hm == "Tishrei") && ( parseInt(hebdate.hd) >= 9 ) )
        return ( {...hebdate, tahanun: false, title: 'Yom Kippur Through End of Tishrei'});   //  No tahanun from erev Yom Kippur until Cheshvan
    if ( ( hebdate.hm == 'Sivan') && (parseInt(hebdate.hd) < 12) ) 
        return ( {...hebdate, tahanun: false, title: 'Sivan 1-12'});

    return ( {...hebdate, tahanun:true} );

}

//  Final word on reading tahanun
//  Note: I'm re-reversing the Hebrew string. We reversed it earlier to make console messages read correctly
//  But the json we return should be in the original (unlike the terminal, the browser knows to display r-to-l)
//  This is dumb and I should do something more elegant
export async function readTahanun( onDate = new Date() ):Promise<HEBCAL_ITEM> {
    const today = dateString( onDate );
    const tomorrow = dateString( dayAfter( onDate ) );
    console.log( `readTahanun: date parameter is ${today}, following day is ${tomorrow}`);

//  Is it a holiday?
    const hd = await getHebDate( onDate );
    if ( ! hd ) {
        console.error(`readTahanun: call to getHebDate(${today}) failed. Giving up.`);
        return ({...EMPTY_ITEM, date:today});
    }
    const hd_hol = getHoliday( hd );
    if ( hd_hol.holiday ) {
        console.log( `readTahanun: ${today} is holiday "${hd_hol.title}"`);
        return ( {...hd_hol, tahanun:false, services:['shaharit','minha'] } )
    }

//  Is it erev holiday?
    const h2d = await getHebDate( dayAfter(onDate) );
    if ( ! h2d ) {
        console.error(`readTahanun: call to getHebDate(${tomorrow}) failed. Giving up.`);
        return ( {...hd_hol, tahanun:false, services:['shaharit','minha'] } )
    }
    const h2d_hol = getHoliday( h2d );
    if ( h2d_hol.holiday )  {    //  erev holiday: no tahanun unless minchaErev is true
        console.log( `readTahanun: ${tomorrow} is erev holiday "${h2d.title}"`); 
        const which:SERVICES[] = (h2d.minchaErev)
                    ? ['shaharit','minha']
                    : ['shaharit'];   
        const holName = h2d_hol.title??'<unknown>';
        return ( {...hd, title:`${erevify(holName)}`, tahanun: true, services:which} );
    }

    console.log( `readTahanun: ${today} is chol; checking ranges`);
    
    const rangeInfo = inExclRange(hd);    // check against date ranges where tahanun is omitted
    if ( ! rangeInfo.tahanun )  //  we're in the exclusion range
        return( {...rangeInfo, services:['shaharit', 'minha']} );

    //  last thing: is it Erev Shabbat? Because it ain't anything else.
    if ( onDate.getDay() == 6 )     //  erev Shabbat (and not anything else)
        return( {...hd, title: 'Erev Shabbat', tahanun: false, services:['minha']});

    return( {...hd, tahanun: true, services:['shaharit', 'minha']});   //  recite tahanun today
}


//  top-level 
