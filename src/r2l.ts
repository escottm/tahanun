export default function r2l( str: string ):string {
    if ( str === undefined || str.length == 1 ) return str;

    return ( str.slice(-1) + r2l( str.slice(0,str.length-1)));
}