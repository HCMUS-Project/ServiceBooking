export function convertTimeStringsToDateObjects(timeString: string, date = new Date()): Date {
    let dd = String(date.getDate()).padStart(2, '0');
    let mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = date.getFullYear();

    let dateStr = yyyy + '-' + mm + '-' + dd;

    let convertDate = new Date(dateStr + ' ' + timeString + ' ' + 'UTC');

    return convertDate;
}
