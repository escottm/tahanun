import { response } from 'express';
import dateString from './datestring.js';
import fetchJSON from './fetchJSON.js';
import r2l from './r2l.js';
import { List } from 'immutable'
import { isNamespaceExportDeclaration } from 'typescript';

//  Everything you need to know about whether we say taḥanun on 'date', and at which service
export type HEBCAL_ITEM = {
    date: string,
    hebrew?:string,
    tahanun?:boolean,
    category?:string,
    services?: ('shaharit'|'minha'|'maariv')[]
};

async function holiday_match( designatedDate?:Date ): Promise<HEBCAL_ITEM|undefined> {

    console.log( `holiday_match: checking ${dateString(designatedDate)}`);

     const hols = await fetchHolidays( designatedDate );

     console.log( `holiday_match: fetched ${hols?.size} holidays`)
        
     if ( hols.size < 1 ) {
        console.warn( `holiday_match: zero holidays (should never happen)`)
        return undefined;   //  zero holidays; impossible b/c even Heshvan has Rosh Chodesh
     }

    hols.forEach( i => console.log( `\tDate: ${i?.date}  Name: ${i?.hebrew}`));
    const dd = dateString( designatedDate );
    console.log( `holiday_match: looking for a holiday on ${dd}` )
    return hols.find( i => (i?.date == dd)); 
}

//  if all you want to do is check if 'onDate' is a holiday
//  normally you'll want to use 'holiday_match()' which also gives you the name of the holiday
export async function isHoliday( onDate?: Date ) {
    console.log( `isHoliday: checking ${dateString(onDate)}`);
    const h = await holiday_match( onDate );

    console.log( `isHoliday: holiday_match returned ${JSON.stringify(h)}` )
    return ( h !== undefined );
}

//  if all you want to do is get the name of the holiday if 'onDate' is a holiday
//  normally you'll want to use 'holiday_match()' which gives you more or less the same info
//  Not sure this needs to exist. Have a good night, sleep well, I'll most likely kill you in the morning.
export async function holidayName( onDate?: Date ) {
    console.log( `holidayName: checking ${dateString(onDate)}`);

    const h = await holiday_match( onDate );

    return ( h === undefined ? undefined : h.hebrew );
} 

//  Hebcal returns a list of "events", not all of which are holidays
//  (e.g., candle lighting times)
//  Here we collect the holidays and weed out the rest. להבדיל!
function extract_holidays( events: List<HEBCAL_ITEM>): List<HEBCAL_ITEM> {
    const next = events.first();

    if ( ! next ) return List<HEBCAL_ITEM>();
    const remaining = events.shift();

    if ( next.category == "holiday" )
        return extract_holidays(remaining).concat(next);
    
    return List<HEBCAL_ITEM>().concat(next);

}

//  All the holidays that Hebcal reports in the same month as 'nearDate'
//  Don't know why there's not an API for just the one date...
async function fetchHolidays( nearDate?: Date ) {
    console.log( `fetchHolidays: checking holidays near ${dateString(nearDate)}`);

    const mnth = dateString(nearDate).slice(5,7); // extract the month from yyyy-mm-dd

    //  See https://www.hebcal.com/home/195/jewish-calendar-rest-api 
    const holAPI = `https://www.hebcal.com/hebcal?v=1&cfg=json&year=now&month=${mnth}&maj=on&min=on&nx=on&mf=on&mod=on`;

    const theJSON = await fetchJSON( holAPI );    
    if ( ! theJSON ) {
        console.error( 'fetchHolidays: failed to fetch');
        return List<HEBCAL_ITEM>();
    }
    
    //  The array of items returned by the Hebcal API includes a bunch of stuff we don't need
    //  Here we create a List of only the stuff we do need: the date and the Hebrew name of the holiday
    const events = List(theJSON.items.map( i => <HEBCAL_ITEM>{date: i.date, hebrew: r2l(i.hebrew)}));
    
    return extract_holidays( events )
}   

const isErevExplicit = ( hebrew: string ) => (/^ערב/).test(hebrew); // holiday name literally says 'ערב'

function tomorrow$( today: string ) {
    const todaysDate = (today.match(/\d?\d$/) || [])[0];
    if ( (! todaysDate) || (todaysDate.length != 1 && todaysDate.length != 2) || isNaN(parseInt(todaysDate))) 
        return null;   //  well... that shouldn't happen!
    return today.replace(/\d?\d$/, (parseInt(todaysDate)+1).toString());  // 2017-12-32 is OK!
}

//  erevify assumes that 'hol' has already been reversed (so console messages display properly)
const erevify = (hol: string) => hol + ' ברע';

//  return a Date object representing the day following the Date provided
function dayAfter( today: Date ) {
    const nextDay = new Date( today );
    nextDay.setDate( nextDay.getDate() + 1);
    return nextDay;
}

//  How do we determine if it's erev-something? Some events in Hebcal are labeled "ערב": 
//  if *tomorrow* is one of those days, and today is not, then today isn't "erev" anything
//  If tomorrow is an event that is NOT explicitly labeled "ערב", then today is "erev" that holiday
//  If tomorrow is no event, and today is no event, obviously it's also not "ערב" anything 
async function erev_match( onDate = new Date() ): Promise<HEBCAL_ITEM> {
    const tomorrow = dayAfter( onDate );
    const onDate$ = dateString(onDate);
    const tomorrow$ = dateString(tomorrow);

    console.log( `isErev: I think today is ${onDate$}`);
    console.log( `isErev: I think tomorrow is ${tomorrow$}`);
    const todayHol = await holidayName( onDate );
    console.log( `isErev: ${onDate$} (today) is ${todayHol??'NOT a holiday'}`);

    if ( todayHol && isErevExplicit(todayHol) ) {
        console.log( `erev_match: today's an explicit erev (${todayHol} )`)
        return {date: dateString(), hebrew:todayHol};            //  Hebcal says today is Erev something or another
}
    const tomorrowHol = await holidayName( tomorrow );
    console.log( `isErev: ${tomorrow$} (tomorrow) is ${tomorrowHol??'NOT a holiday'}`);
    
    //  Tomorrow's an event. Today isn't. Sometimes though an "erev" is a Hebcal event.
    //  If tomorrow is NOT an "erev", then today is.
    if ( tomorrowHol ) {
        if ( isErevExplicit(tomorrowHol) ) {
            console.log( `erev_match: ${tomorrow$} is ${tomorrowHol}; ${onDate$} is just chol`);
            return( {date:onDate$} );
        } else {
            console.log( `erev_match: ${onDate$} is an unlisted erev (${tomorrow$} is ${tomorrowHol} )`);
            return( {date:onDate$, hebrew:erevify(tomorrowHol)});
        }
    }
    return ( {date:onDate$});   //  Not an erev
}

//  Final word on reading tahanun
//  Note: I'm re-reversing the Hebrew string. We reversed it earlier to make console messages read correctly
//  But the json we return should be in the original (unlike the terminal, the browser knows to display r-to-l)
//  This is dumb and I should do something more elegant
export async function readTahanun( onDate = new Date() ):Promise<HEBCAL_ITEM> {
    const today = dateString( onDate );
    const tomorrow$ = dayAfter( onDate );
    const tomorrow = dateString( tomorrow$ );
    console.log( `readTahanun: date parameter is ${today}, following day is ${tomorrow}`)

//  Is it a holiday?
    const m = await holiday_match( onDate );
    if ( m?.hebrew != undefined ) {
        console.log( `readTahanun: ${today} is holiday "${m.hebrew}"`);
        return ( {date:today, hebrew:r2l(m.hebrew), tahanun:false, services:['shaharit','minha'] } )
    }

//  Is it erev holiday?
    const em = await erev_match( onDate );
    if ( em.hebrew != undefined )  {    //  erev holiday: no tahanun
        console.log( `readTahanun: ${today} is erev holiday "${em.hebrew}"`);       
        return ( {date:today, hebrew:r2l(em.hebrew), tahanun: false, services:['minha']} );
    }

    console.log( `readTahanun: ${today} is chol`);
    return( {date:today, tahanun:true, services:['shaharit','minha']})
}


//  top-level 
