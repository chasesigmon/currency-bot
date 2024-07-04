import { CurrencyPairs, ICurrencyPairs } from '../src/CurrencyPairs';

describe('CurrencyPairs', () => {
  let currencyPairs: ICurrencyPairs;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('requestPairData()', () => {
    beforeEach(() => {
      currencyPairs = new CurrencyPairs();
    });

    it('should retrieve interval, percentage, and pairs', () => {
      expect(currencyPairs.getInterval()).toEqual(
        CurrencyPairs.defaultData.interval
      );
      expect(currencyPairs.getPercentage()).toEqual(
        CurrencyPairs.defaultData.percentage
      );
      expect(currencyPairs.getPairs()).toEqual([
        CurrencyPairs.defaultData.pair,
      ]);
    });

    it('should retrieve the data for BTC-USD', () => {
      currencyPairs.requestPairData();
      const pairData = currencyPairs.getPairs();
      expect(pairData[0].name).toEqual(CurrencyPairs.defaultData.pair.name);
      expect(
        pairData[0].values.ask !== CurrencyPairs.defaultData.pair.values.ask
      );
      expect(
        pairData[0].values.bid !== CurrencyPairs.defaultData.pair.values.bid
      );
      expect(currencyPairs.getInterval()).toEqual(
        CurrencyPairs.defaultData.interval
      );
      expect(currencyPairs.getPercentage()).toEqual(
        CurrencyPairs.defaultData.percentage
      );
      expect(pairData.length).toEqual(1);
    });

    it('should update interval', () => {
      const interval = 7;
      currencyPairs.setInterval(interval);
      expect(currencyPairs.getInterval()).toEqual(interval);
    });

    it('should update percentage', () => {
      const percentage = 0.05;
      currencyPairs.setPercentage(percentage);
      expect(currencyPairs.getPercentage()).toEqual(percentage);
    });

    it('should add new pair', () => {
      currencyPairs.addPair('EUR-USD');
      const pairData = currencyPairs.getPairs();
      expect(pairData[1].name).toEqual('EUR-USD');
      expect(pairData.length).toEqual(2);
    });

    it('should format currency when entered without a hyphen', () => {
      currencyPairs.addPair('eurusd');
      const pairData = currencyPairs.getPairs();
      expect(pairData[1].name).toEqual('EUR-USD');
    });

    it('should retrieve the data for BTC-USD and EUR-USD', () => {
      const interval = 7;
      const percentage = 0.05;
      currencyPairs.setInterval(interval);
      currencyPairs.setPercentage(percentage);
      currencyPairs.addPair('EUR-USD');
      currencyPairs.requestPairData();
      const pairData = currencyPairs.getPairs();
      expect(pairData[1].name).toEqual('EUR-USD');
      expect(
        pairData[1].values.ask !== CurrencyPairs.defaultData.pair.values.ask
      );
      expect(
        pairData[1].values.bid !== CurrencyPairs.defaultData.pair.values.bid
      );
      expect(currencyPairs.getInterval()).toEqual(interval);
      expect(currencyPairs.getPercentage()).toEqual(percentage);
      expect(pairData.length).toEqual(2);
    });
  });
});
