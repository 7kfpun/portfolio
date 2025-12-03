// Test symbol extraction logic
function extractSymbol(stock) {
  if (stock.includes(':')) {
    const parts = stock.split(':');
    const first = parts[0];
    const second = parts[1];

    // If first part is an exchange name, return second part
    if (['NASDAQ', 'NYSE', 'NYSEARCA', 'TPE', 'TYO'].includes(first)) {
      return second;
    }

    // If second part is an exchange name (JPX, HKEX), return first part
    if (['JPX', 'HKEX'].includes(second)) {
      return first;
    }

    // Default: return second part
    return second;
  }
  return stock;
}

function getExchangeFromStock(stock) {
  if (stock.includes(':')) {
    const parts = stock.split(':');
    const first = parts[0];
    const second = parts[1];

    const exchangeMap = {
      NASDAQ: 'NASDAQ',
      NYSE: 'NYSE',
      NYSEARCA: 'NYSEARCA',
      TPE: 'TPE',
      TYO: 'TYO',
      JPX: 'JPX',
      HKEX: 'HKEX',
    };

    // Check if first part is an exchange
    if (exchangeMap[first]) {
      return exchangeMap[first];
    }

    // Check if second part is an exchange
    if (exchangeMap[second]) {
      return exchangeMap[second];
    }
  }
  return null;
}

// Test cases
const testCases = [
  'NASDAQ:AAPL',
  'NYSE:TSM',
  '7203:JPX',
  '1629:JPX',
  '0700:HKEX',
  '2800:HKEX',
  'TPE:2330',
  '2330:TWSE',
];

console.log('Symbol Extraction Tests:');
console.log('========================');
testCases.forEach(stock => {
  const symbol = extractSymbol(stock);
  const exchange = getExchangeFromStock(stock);
  console.log(`${stock} -> symbol: ${symbol}, exchange: ${exchange}`);
});
