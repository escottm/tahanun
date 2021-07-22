
export default function dateString( forDate?: Date ):string {
    const theDate = forDate ?? new Date();

    const dd = theDate.getUTCDate().toString().padStart(2, '0');
    const yyyy = theDate.getUTCFullYear().toString();
    const $mm = theDate.getUTCMonth() + 1;
    const mm = $mm.toString().padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

