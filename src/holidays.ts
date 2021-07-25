import {List} from 'immutable';

type HLISTITEM = {name: string, erev: boolean};
const HOLIDAYS = List<HLISTITEM> ([
    {name: 'Rosh Hashana', erev: false},
    {name: 'Tzom Gedaliah', erev: false},
    {name: 'Yom Kippur', erev: false},
    {name: 'Sukkot', erev: false},
    {name: 'Shmini Atzeret', erev: false},
    {name: 'Simchat', erev: false},
    {name: 'Rosh Chodesh', erev: false},
    {name: 'Chanukah', erev: false},
    {name: 'Asara B\'Tevet', erev: false},
    {name: 'Tu Bishvat', erev: false},
    {name: 'Purim Katan', erev: true},
    {name: 'Purim', erev: false},
    {name: 'Pesach', erev: false},
    {name: 'Yom HaShoah', erev: true},
    {name: 'Yom HaZikaron', erev: true},
    {name: 'Yom HaAtzma\'ut', erev: false},
    {name: 'Lag BaOmer', erev: true},
    {name: 'Yom Yerushalayim', erev: true},
    {name: 'Shavuot', erev: false},
    {name: 'Tish\'a B\'Av', erev: false},
    {name: 'Tu B\'Av', erev: true}
]);

export type SERVICES = 'shaharit'|'minha'|'maariv';
//  Everything you need to know about whether we say taḥanun on 'date', and at which service
export type HEBCAL_ITEM = {
    date: string,
    title?: string,
    hebrew?:string,
    hd?: string,
    hm?: string
    tahanun?:boolean,
    holiday?:boolean,
    category?:string,
    events?:string[],
    minchaErev?:boolean,
    services?: SERVICES[]
};

const holiday_compare = ( holiday: string, candidate: string ) => (new RegExp(`^${holiday}`, 'i')).test(candidate);

//  call with "isHoliday('Rosh Chodesh Av')", for example. 2nd arg for recursion use only.
export function isHoliday( title: string, holidays = HOLIDAYS ):boolean {
    if (holidays.size<1) return false;
    const holItem = holidays.first() || <HLISTITEM>{name:'none',erev:true}; //  Should always be a first() though
    return (holiday_compare(holItem.name, title) || isHoliday( title, holidays.shift()));
}

//  call with "minchaErev('Rosh Chodesh Av')", for example. 2nd arg for recursion use only.
export function minchaErev( title: string, holidays = HOLIDAYS ):boolean {
    if ( holidays.size < 1 ) return false;
    const holItem = holidays.first() || <HLISTITEM>{name:'none',erev:true};   // If there's no first() something's broken

    if ( holiday_compare(holItem.name, title) )
        return holItem.erev;
    
    return minchaErev( title, holidays.shift() );
}
