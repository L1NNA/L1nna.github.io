/**
 * Format Google Calendar JSON output into human readable list
 *
 * Copyright 2017, Milan Lund
 *
 */

window.formatGoogleCalendar = (() => {

    'use strict';

    var config;

    const renderList = (data, settings) => {
        var result = [];

        //Remove cancelled events, sort by date
        result = data.items.filter(item => item && item.hasOwnProperty('status') && item.status !== 'cancelled').sort(comp).reverse();

        var pastCounter = 0,
            upcomingCounter = 0,
            pastResult = [],
            upcomingResult = [],
            upcomingResultTemp = [],
            upcomingElem = document.querySelector(settings.upcomingSelector),
            pastElem = document.querySelector(settings.pastSelector),
            i,
            j;

        if (settings.pastTopN === -1) {
            settings.pastTopN = result.length;
        }

        if (settings.upcomingTopN === -1) {
            settings.upcomingTopN = result.length;
        }

        if (settings.past === false) {
            settings.pastTopN = 0;
        }

        if (settings.upcoming === false) {
            settings.upcomingTopN = 0;
        }

        if (settings.groupByWeek) {
            var groups = {};
            for (i in result) {
                var date = (result[i].start.dateTime || result[i].start.date);
                var week = date2week(date);
                if (week in groups)
                    groups[week].push(result[i]);
                else
                    groups[week] = [result[i]];
            }
            var sorted = [];
            for (var key in groups)
                sorted.push([key, groups[key]]);
            sorted.sort(function c(e1, e2) {
                return e1[0] - e2[0];
            })
            result = [];
            for (var j in sorted) {
                sorted[j][1].reverse();
                result.push(sorted[j][1]);
            }
        }

        for (i in result) {
            var last = result[i][result[i].length - 1]
            if (isPast(last.end.dateTime || last.end.date)) {
                pastResult.push(result[i]);
            } else {
                upcomingResult.push(result[i]);
            }
        }


        function group2div(events) {
            var divs = [];
            for (i in events)
                divs.push(transformationList(
                    events[i],
                    'div',
                    i == 0 ? settings.eventFormat : settings.subEventFormat,
                    i == 0 ? 'e-first' : 'e-rest',
                    i == 0 ? '' : 'circle-compass',
                    i != 0))
            return divs

        }

        for (i in pastResult) {
            var divs = group2div(pastResult[i]);
            for (j in divs)
                pastElem.insertAdjacentHTML('beforeend', divs[j]);
        }

        for (i in upcomingResult) {
            var divs = group2div(upcomingResult[i]);
            for (j in divs)
                upcomingElem.insertAdjacentHTML('beforeend', divs[j]);
        }

        if (upcomingElem.firstChild) {
            upcomingElem.insertAdjacentHTML('beforebegin', settings.upcomingHeading);
        }

        if (pastElem.firstChild) {
            pastElem.insertAdjacentHTML('beforebegin', settings.pastHeading);
        }

        var keyword_format = ['*summary*', ' ', '*date*', '*location*', '*description*', '<br/>']
        for (j in settings.keywords) {
            var kw = settings.keywords[j];
            var holder = $(`#${settings.keywordPrefix}-${kw}-content`);
            for (i in result)
                for (var k in result[i]) {
                    var k_event = result[i][k];
                    if (k_event.summary.toLowerCase().indexOf(kw.toLowerCase()) >= 0 && k_event.start.dateTime) {
                        var div = transformationList(
                            k_event,
                            'div',
                            keyword_format,
                            'e-rest',
                            'circle-compass',
                            true);
                        holder.append($(div));
                    }
                }
        }

        $(".events .description-handle").click(function (event) {
            var target = $(event.target);
            target.next().toggle();
        });

        $(settings.upcomingSelector + ' .description').first().toggle();

    };

    //Gets JSON from Google Calendar and transfroms it into html list items and appends it to past or upcoming events list
    const init = (settings) => {
        config = settings;

        var finalURL = settings.calendarUrl;

        if (settings.recurringEvents) {
            finalURL = finalURL.concat('&singleEvents=true&orderBy=starttime');
        }

        if (settings.timeMin) {
            finalURL = finalURL.concat('&timeMin=' + settings.timeMin);
        };

        if (settings.timeMax) {
            finalURL = finalURL.concat('&timeMax=' + settings.timeMax);
        };

        //Get JSON, parse it, transform into list items and append it to past or upcoming events list
        var request = new XMLHttpRequest();
        request.open('GET', finalURL, true);

        request.onload = () => {
            if (request.status >= 200 && request.status < 400) {
                var data = JSON.parse(request.responseText);
                renderList(data, settings);
            } else {
                console.error(err);
            }
        };

        request.onerror = () => {
            console.error(err);
        };

        request.send();
    };

    //Overwrites defaultSettings values with overrideSettings and adds overrideSettings if non existent in defaultSettings
    const mergeOptions = (defaultSettings, overrideSettings) => {
        var newObject = {},
            i;
        for (i in defaultSettings) {
            newObject[i] = defaultSettings[i];
        }
        for (i in overrideSettings) {
            newObject[i] = overrideSettings[i];
        }
        return newObject;
    };

    const isAllDay = (dateStart, dateEnd) => {
        var dateEndTemp = subtractOneDay(dateEnd);
        var isAll = true;

        for (var i = 0; i < 3; i++) {
            if (dateStart[i] !== dateEndTemp[i]) {
                isAll = false;
            }
        }

        return isAll;
    };

    const isSameDay = (dateStart, dateEnd) => {
        var isSame = true;

        for (var i = 0; i < 3; i++) {
            if (dateStart[i] !== dateEnd[i]) {
                isSame = false;
            }
        }

        return isSame;
    }

    //Get all necessary data (dates, location, summary, description) and creates a list item
    const transformationList = (result, tagName, format, tagClass, icon, isSubEvent) => {
        var dateStart = getDateInfo(result.start.dateTime || result.start.date),
            dateEnd = getDateInfo(result.end.dateTime || result.end.date),
            dayNames = config.dayNames,
            moreDaysEvent = true,
            isAllDayEvent = isAllDay(dateStart, dateEnd);

        if (typeof result.end.date !== 'undefined') {
            dateEnd = subtractOneDay(dateEnd);
        }

        if (isSameDay(dateStart, dateEnd)) {
            moreDaysEvent = false;
        }

        var dateFormatted = getFormattedDate(dateStart, dateEnd, dayNames, moreDaysEvent, isAllDayEvent),
            output = '<' + tagName + ' class=\'' + tagClass + '\'>',
            summary = result.summary || '',
            description = result.description || '',
            location = result.location || '',
            i;

        for (i = 0; i < format.length; i++) {
            format[i] = format[i].toString();

            if (format[i] === '*summary*') {
                var cls = '';
                if (summary.toLowerCase().indexOf('exam') >= 0)
                    cls = 'exam';
                if (summary.toLowerCase().indexOf('due') >= 0)
                    cls = 'due';
                output = output.concat(`<h4 class="summary ${cls}"><i class="tf-${icon}"></i>${summary}</h4>`);
            } else if (format[i] === '*summary* *details*') {
                var cls = '';
                if (summary.toLowerCase().indexOf('exam') >= 0)
                    cls = 'exam';
                if (summary.toLowerCase().indexOf('due') >= 0)
                    cls = 'due';
                if (description.length > 0)
                    description = '[' + description + ']';
                output = output.concat(`<h4 class="summary ${cls}"><i class="tf-${icon}"></i>${summary} <small>${description}</small></h4>`);
            } else if (format[i] === '*date*') {
                output = output.concat(`<h6 class="date">${dateFormatted}</h6>`);
            } else if (format[i] === '*date* *location*') {
                output = output.concat(`<h6 class="date">${dateFormatted} [ <i class="tf-map-pin"></i><a target='_blank' href="http://maps.google.com/?q=${location}">${location}</a> ]</h6>`);
            } else if (format[i] === '*description*') {
                if (!isSubEvent) {
                    output = output.concat(`<h6 class="description-handle">Show/hide details</h6>`)
                    output = output.concat(`<div class="description">${description}</div>`);
                } else
                    output = output.concat(`<div class="description">Details: ${description}</div>`);
            } else if (format[i] === '*location*') {
                if (location.length > 0)
                    output = output.concat(`<h6 class="location small"><i class="tf-map-pin"></i><a target='_blank' href="http://maps.google.com/?q=${location}">${location}</a></h6>`);
            } else {
                // if ((format[i + 1] === '*location*' && location !== '') ||
                //     (format[i + 1] === '*summary*' && summary !== '') ||
                //     (format[i + 1] === '*date*' && dateFormatted !== '') ||
                //     (format[i + 1] === '*description*' && description !== '')) {

                //     output = output.concat(format[i]);
                // }
                output = output.concat(format[i]);
            }
        }

        return output + '</' + tagName + '>';
    };

    //Check if date is later then now
    const isPast = date => {
        var compareDate = new Date(date),
            now = new Date();

        if (now.getTime() > compareDate.getTime()) {
            return true;
        }

        return false;
    };

    //Get temp array with information abou day in followin format: [day number, month number, year, hours, minutes]
    const getDateInfo = date => {
        date = new Date(date);
        return [date.getDate(), date.getMonth(), date.getFullYear(), date.getHours(), date.getMinutes(), 0, 0];
    };

    //Get month name according to index
    const getMonthName = month => {
        var monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
        ];

        return monthNames[month];
    };

    const getDayName = day => {
        var dayNames = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
        ];

        return dayNames[day];
    };

    const calculateDate = (dateInfo, amount) => {
        var date = getDateFormatted(dateInfo);
        date.setTime(date.getTime() + amount);
        return getDateInfo(date);
    };

    const getDayNameFormatted = dateFormatted => getDayName(getDateFormatted(dateFormatted).getDay()) + ' ';

    const getDateFormatted = dateInfo => new Date(dateInfo[2], dateInfo[1], dateInfo[0], dateInfo[3], dateInfo[4] + 0, 0);

    //Compare dates
    const comp = (a, b) => new Date(a.start.dateTime || a.start.date).getTime() - new Date(b.start.dateTime || b.start.date).getTime();

    //Add one day
    const addOneDay = (dateInfo) => calculateDate(dateInfo, 86400000);

    //Subtract one day
    const subtractOneDay = (dateInfo) => calculateDate(dateInfo, -86400000);

    //Subtract one minute
    const subtractOneMinute = (dateInfo) => calculateDate(dateInfo, -60000);


    //Transformations for formatting date into human readable format
    const formatDateSameDay = (dateStart, dateEnd, dayNames, moreDaysEvent, isAllDayEvent) => {
        var formattedTime = '',
            dayNameStart = '';

        if (dayNames) {
            dayNameStart = getDayNameFormatted(dateStart);
        }

        if (config.sameDayTimes && !moreDaysEvent && !isAllDayEvent) {
            formattedTime = ' from ' + getFormattedTime(dateStart) + ' - ' + getFormattedTime(dateEnd);
        }

        //month day, year time-time
        return dayNameStart + getMonthName(dateStart[1]) + ' ' + dateStart[0] + ', ' + dateStart[2] + formattedTime;
    };

    const formatDateOneDay = (dateStart, dayNames) => {
        var dayName = '';

        if (dayNames) {
            dayName = getDayNameFormatted(dateStart);
        }
        //month day, year
        return dayName + getMonthName(dateStart[1]) + ' ' + dateStart[0] + ', ' + dateStart[2];
    };

    const formatDateDifferentDay = (dateStart, dateEnd, dayNames) => {
        var dayNameStart = '',
            dayNameEnd = '';

        if (dayNames) {
            dayNameStart = getDayNameFormatted(dateStart);
            dayNameEnd = getDayNameFormatted(dateEnd);
        }
        //month day-day, year
        return dayNameStart + getMonthName(dateStart[1]) + ' ' + dateStart[0] + '-' + dayNameEnd + dateEnd[0] + ', ' + dateStart[2];
    };

    const formatDateDifferentMonth = (dateStart, dateEnd, dayNames) => {
        var dayNameStart = '',
            dayNameEnd = '';

        if (dayNames) {
            dayNameStart = getDayNameFormatted(dateStart);
            dayNameEnd = getDayNameFormatted(dateEnd);
        }
        //month day - month day, year
        return dayNameStart + getMonthName(dateStart[1]) + ' ' + dateStart[0] + '-' + dayNameEnd + getMonthName(dateEnd[1]) + ' ' + dateEnd[0] + ', ' + dateStart[2];
    };

    const formatDateDifferentYear = (dateStart, dateEnd, dayNames) => {
        var dayNameStart = '',
            dayNameEnd = '';

        if (dayNames) {
            dayNameStart = getDayNameFormatted(dateStart);
            dayNameEnd = getDayNameFormatted(dateEnd);
        }
        //month day, year - month day, year
        return dayNameStart + getMonthName(dateStart[1]) + ' ' + dateStart[0] + ', ' + dateStart[2] + '-' + dayNameEnd + getMonthName(dateEnd[1]) + ' ' + dateEnd[0] + ', ' + dateEnd[2];
    };

    //Check differences between dates and format them
    const getFormattedDate = (dateStart, dateEnd, dayNames, moreDaysEvent, isAllDayEvent) => {
        var formattedDate = '';

        if (dateStart[0] === dateEnd[0]) {
            if (dateStart[1] === dateEnd[1]) {
                if (dateStart[2] === dateEnd[2]) {
                    //month day, year
                    formattedDate = formatDateSameDay(dateStart, dateEnd, dayNames, moreDaysEvent, isAllDayEvent);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd, dayNames);
                }
            } else {
                if (dateStart[2] === dateEnd[2]) {
                    //month day - month day, year
                    formattedDate = formatDateDifferentMonth(dateStart, dateEnd, dayNames);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd, dayNames);
                }
            }
        } else {
            if (dateStart[1] === dateEnd[1]) {
                if (dateStart[2] === dateEnd[2]) {
                    //month day-day, year
                    formattedDate = formatDateDifferentDay(dateStart, dateEnd, dayNames);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd, dayNames);
                }
            } else {
                if (dateStart[2] === dateEnd[2]) {
                    //month day - month day, year
                    formattedDate = formatDateDifferentMonth(dateStart, dateEnd, dayNames);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd, dayNames);
                }
            }
        }

        return formattedDate;
    };

    const getFormattedTime = (date) => {
        var formattedTime = '',
            period = 'AM',
            hour = date[3],
            minute = date[4];

        // Handle afternoon.
        if (hour >= 12) {
            period = 'PM';

            if (hour >= 13) {
                hour -= 12;
            }
        }

        // Handle midnight.
        if (hour === 0) {
            hour = 12;
        }

        // Ensure 2-digit minute value.
        minute = (minute < 10 ? '0' : '') + minute;

        // Format time.
        formattedTime = hour + ':' + minute + period;
        return formattedTime;
    };


    function date2week(dt) {
        dt = new Date(dt);
        var dowOffset = 1;
        dowOffset = typeof (dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero
        var newYear = new Date(dt.getFullYear(), 0, 1);
        var day = newYear.getDay() - dowOffset; //the day of week the year begins on
        day = (day >= 0 ? day : day + 7);
        var daynum = Math.floor((dt.getTime() - newYear.getTime() -
            (dt.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
        var weeknum;
        //if the year starts before the middle of a week
        if (day < 4) {
            weeknum = Math.floor((daynum + day - 1) / 7) + 1;
            if (weeknum > 52) {
                nYear = new Date(dt.getFullYear() + 1, 0, 1);
                nday = nYear.getDay() - dowOffset;
                nday = nday >= 0 ? nday : nday + 7;
                /*if the next year starts before the middle of
                  the week, it is week #1 of that year*/
                weeknum = nday < 4 ? 1 : 53;
            }
        }
        else {
            weeknum = Math.floor((daynum + day - 1) / 7);
        }
        return weeknum;
    }

    return {
        init: function (settingsOverride) {
            var settings = {
                calendarUrl: '',
                past: true,
                upcoming: true,
                sameDayTimes: true,
                dayNames: true,
                pastTopN: -1,
                upcomingTopN: -1,
                recurringEvents: true,
                upcomingSelector: '#events-upcoming',
                pastSelector: '#events-past',
                upcomingHeading: '<h2>Upcoming weeks</h2>',
                pastHeading: '<h2>Past weeks</h2>',
                timeMin: undefined,
                timeMax: undefined,
                groupByWeek: true,
                eventFormat: ['*date*', ': ', '*summary*', ' <br/> ', '*description*', ' in ', '*location*'],
                subEventFormat: ['*summary*', '*date*', ' in ', '*location*'],
            };

            settings = mergeOptions(settings, settingsOverride);

            init(settings);
        }
    };
})();