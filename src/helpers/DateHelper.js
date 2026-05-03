/**
 * DateHelper - Date formatting and manipulation utilities.
 */
const DateHelper = {
  today(format = 'YYYY-MM-DD') { return this.formatDate(new Date(), format); },

  daysFromNow(n) {
    const date = new Date();
    date.setDate(date.getDate() + n);
    return date;
  },

  formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const map = {
      YYYY: d.getFullYear(),
      MM: String(d.getMonth() + 1).padStart(2, '0'),
      DD: String(d.getDate()).padStart(2, '0'),
      HH: String(d.getHours()).padStart(2, '0'),
      mm: String(d.getMinutes()).padStart(2, '0'),
      ss: String(d.getSeconds()).padStart(2, '0'),
    };
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (m) => map[m]);
  },

  timestamp() { return new Date().toISOString(); },
};

module.exports = DateHelper;
