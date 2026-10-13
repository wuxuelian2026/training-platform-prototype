export function incomeChartModel(monthly) {
  const actual = monthly.flatMap((row, index) => row.future ? [] : [{ ...row, index }]);
  const values = actual.flatMap(row => [row.offlineCents, row.videoCents]).map(value => value / 1000000);
  const max = Math.max(10, Math.ceil(Math.max(0, ...values) / 10) * 10);
  const min = Math.min(0, Math.floor(Math.min(0, ...values) / 10) * 10);
  const y = cents => (max - cents / 1000000) / (max - min) * 100;
  return {
    zero: y(0),
    ticks: Array.from({ length: 5 }, (_, index) => Number((max - (max - min) * index / 4).toFixed(1))),
    series: ['offlineCents', 'videoCents'].map(key => ({
      key,
      points: actual.map(row => ({ index: row.index, x: (row.index + .5) / monthly.length * 100, y: y(row[key]) }))
    }))
  };
}
