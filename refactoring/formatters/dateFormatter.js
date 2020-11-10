/*

Идея в том, чтобы все преобразователи, типа дат, убрать из основного кода в папку "formatters",
и если профессор из Ирана играет с профессором из Китая, то у одного дата будет в формате "۱۳۹۹/۸/۵", 
а у другого - "2020年10月17日"

https://medium.com/swlh/use-tolocaledatestring-to-format-javascript-dates-2959108ea020

Опции:
'en-GB' - Россия, Англия
'zh-CN' - Китайский
'de-DE' - Германия
'fa-IR' - Фарси, Иран
'ar-EG' - Арабский
'en-US' - США
'ko-KR' - Корея

*/

function dateFormatter(dateString) {

    const options = {
        // weekday: 'long',
        year: 'numeric',         // '2-digit'
        month: 'long',           // 'short'
        day: 'numeric',
        // timeZoneName: 'short'
    };

    const date = new Date(dateString).toLocaleDateString('en-GB', options);

    return date;
}


export { dateFormatter };






