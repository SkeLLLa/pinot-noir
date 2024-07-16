export class SqlFormat {
  private static ID_GLOBAL_REGEXP = /"/g;
  private static QUAL_GLOBAL_REGEXP = /\./g;
  // eslint-disable-next-line no-control-regex
  private static CHARS_GLOBAL_REGEXP = /[\0\b\t\n\r\x1a"'\\]/g;
  private static CHARS_ESCAPE_MAP: { [key: string]: string } = {
    '\0': '\\0',
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\r': '\\r',
    '\x1a': '\\Z',
    '"': '""',
    "'": "''",
    '\\': '\\\\',
  };

  static escapeId(val: string | string[], forbidQualified?: boolean): string {
    if (Array.isArray(val)) {
      return val.map((v) => SqlFormat.escapeId(v, forbidQualified)).join(', ');
    } else if (forbidQualified) {
      return `"${String(val).replace(SqlFormat.ID_GLOBAL_REGEXP, '""')}"`;
    } else {
      return `"${String(val).replace(SqlFormat.ID_GLOBAL_REGEXP, '""').replace(SqlFormat.QUAL_GLOBAL_REGEXP, '"."')}"`;
    }
  }

  static escape(
    val: unknown,
    stringifyObjects?: boolean,
    timeZone?: string,
  ): string {
    if (val === undefined || val === null) {
      return 'NULL';
    }

    switch (typeof val) {
      case 'boolean':
        return val ? 'TRUE' : 'FALSE'; // Changed to uppercase
      case 'number':
        return val + '';
      case 'object':
        if (Object.prototype.toString.call(val) === '[object Date]') {
          return SqlFormat.dateToString(val as Date, timeZone || 'local');
        } else if (Array.isArray(val)) {
          return SqlFormat.arrayToList(val, timeZone);
        } else if (Buffer.isBuffer(val)) {
          return SqlFormat.bufferToString(val);
        } else if (
          typeof (val as { toSqlFormat: () => string }).toSqlFormat ===
          'function'
        ) {
          return String((val as { toSqlFormat: () => string }).toSqlFormat());
        } else if (stringifyObjects) {
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          return SqlFormat.escapeString(val.toString());
        } else {
          return SqlFormat.objectToValues(
            val as { [key: string]: unknown },
            timeZone,
          );
        }
      default:
        return SqlFormat.escapeString(val as string);
    }
  }

  static arrayToList(array: unknown[], timeZone?: string): string {
    return array
      .map((val) => {
        if (Array.isArray(val)) {
          return `(${SqlFormat.arrayToList(val, timeZone)})`;
        } else {
          return SqlFormat.escape(val, true, timeZone);
        }
      })
      .join(', ');
  }

  static format(
    sql: string,
    values: unknown[] | null | undefined,
    stringifyObjects?: boolean,
    timeZone?: string,
  ): string {
    if (values == null) {
      return sql;
    }

    if (!Array.isArray(values)) {
      values = [values];
    }

    let chunkIndex = 0;
    const placeholdersRegex = /\?+/g;
    let result = '';
    let valuesIndex = 0;
    let match: RegExpExecArray | null;

    while (
      valuesIndex < values.length &&
      (match = placeholdersRegex.exec(sql))
    ) {
      const len = match[0].length;

      if (len > 2) {
        continue;
      }

      const value =
        len === 2
          ? SqlFormat.escapeId(values[valuesIndex] as string)
          : SqlFormat.escape(values[valuesIndex], stringifyObjects, timeZone);

      result += sql.slice(chunkIndex, match.index) + value;
      chunkIndex = placeholdersRegex.lastIndex;
      valuesIndex++;
    }

    if (chunkIndex === 0) {
      return sql;
    }

    if (chunkIndex < sql.length) {
      return result + sql.slice(chunkIndex);
    }

    return result;
  }

  static dateToString(date: Date, timeZone: string): string {
    const dt = new Date(date);

    if (isNaN(dt.getTime())) {
      return 'NULL';
    }

    let year: number;
    let month: number;
    let day: number;
    let hour: number;
    let minute: number;
    let second: number;
    let millisecond: number;

    if (timeZone === 'local') {
      year = dt.getFullYear();
      month = dt.getMonth() + 1;
      day = dt.getDate();
      hour = dt.getHours();
      minute = dt.getMinutes();
      second = dt.getSeconds();
      millisecond = dt.getMilliseconds();
    } else {
      const tz = SqlFormat.convertTimezone(timeZone);

      if (tz !== false && tz !== 0) {
        dt.setTime(dt.getTime() + tz * 60000);
      }

      year = dt.getUTCFullYear();
      month = dt.getUTCMonth() + 1;
      day = dt.getUTCDate();
      hour = dt.getUTCHours();
      minute = dt.getUTCMinutes();
      second = dt.getUTCSeconds();
      millisecond = dt.getUTCMilliseconds();
    }

    // YYYY-MM-DD HH:mm:ss.mmm
    const str =
      `${SqlFormat.zeroPad(year, 4)}-${SqlFormat.zeroPad(month, 2)}-${SqlFormat.zeroPad(day, 2)} ` +
      `${SqlFormat.zeroPad(hour, 2)}:${SqlFormat.zeroPad(minute, 2)}:${SqlFormat.zeroPad(second, 2)}.` +
      `${SqlFormat.zeroPad(millisecond, 3)}`;

    return SqlFormat.escapeString(str);
  }

  static bufferToString(buffer: Buffer): string {
    return 'X' + SqlFormat.escapeString(buffer.toString('hex'));
  }

  static objectToValues(
    object: { [key: string]: unknown },
    timeZone?: string,
  ): string {
    return Object.keys(object)
      .map((key) => {
        const val = object[key];

        if (typeof val === 'function') {
          return '';
        }

        return `${SqlFormat.escapeId(key)} = ${SqlFormat.escape(val, true, timeZone)}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  static raw(sql: string): { toSqlFormat: () => string } {
    if (typeof sql !== 'string') {
      throw new TypeError('argument sql must be a string');
    }

    return {
      toSqlFormat: () => sql,
    };
  }

  private static escapeString(val: string): string {
    let chunkIndex = (SqlFormat.CHARS_GLOBAL_REGEXP.lastIndex = 0);
    let escapedVal = '';
    let match: RegExpExecArray | null;

    while ((match = SqlFormat.CHARS_GLOBAL_REGEXP.exec(val))) {
      escapedVal +=
        val.slice(chunkIndex, match.index) +
        SqlFormat.CHARS_ESCAPE_MAP[match[0]];
      chunkIndex = SqlFormat.CHARS_GLOBAL_REGEXP.lastIndex;
    }

    if (chunkIndex === 0) {
      return `'${val}'`;
    }

    if (chunkIndex < val.length) {
      return `'${escapedVal}${val.slice(chunkIndex)}'`;
    }

    return `'${escapedVal}'`;
  }

  static zeroPad(number: number, length: number): string {
    return number.toString().padStart(length, '0');
  }

  private static convertTimezone(tz: string): number | false {
    if (tz === 'Z') {
      return 0;
    }

    const match = tz.match(/([+\-\s])(\d{2}):?(\d{2})?/);
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2]!, 10);
      const minutes = match[3] ? parseInt(match[3], 10) : 0;
      return sign * (hours + minutes / 60) * 60;
    }

    return false;
  }
}
