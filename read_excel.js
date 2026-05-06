const ExcelJS = require('./node_modules/exceljs');
async function read() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/a.safarli/Desktop/Risk_reyestri_nümunə (1).xlsx');
  console.log('Worksheets:', wb.worksheets.map(w=>w.name));
  wb.worksheets.forEach(ws => {
    console.log('=== Sheet:', ws.name, 'rows:', ws.rowCount, 'cols:', ws.columnCount, '===');
    ws.eachRow((row, rn) => {
      const vals = [];
      row.eachCell({includeEmpty:true}, (cell, cn) => { vals.push(cell.value); });
      console.log('Row', rn, JSON.stringify(vals));
    });
  });
}
read().catch(e => console.error(e.message));
