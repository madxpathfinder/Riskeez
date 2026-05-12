const ExcelJS = require('./node_modules/exceljs');
const wb = new ExcelJS.Workbook();
wb.xlsx.readFile(process.argv[2]).then(() => {
  wb.eachSheet((sheet) => {
    console.log('SHEET:' + JSON.stringify(sheet.name) + ' rows:' + sheet.rowCount);
    sheet.eachRow((row, n) => {
      if (n <= 15) {
        const vals = [];
        row.eachCell({includeEmpty:true}, (cell, c) => {
          let v = cell.value;
          if (v && typeof v === 'object' && v.richText) v = v.richText.map(r=>r.text).join('');
          if (v && typeof v === 'object' && v.result !== undefined) v = v.result;
          if (v instanceof Date) v = v.toISOString().split('T')[0];
          vals.push(c+'='+JSON.stringify(String(v===null||v===undefined?'':v)));
        });
        console.log('R'+n+': '+vals.join(' | '));
      }
    });
  });
}).catch(e => console.error('ERR:'+e.message));
