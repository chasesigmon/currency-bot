import * as https from 'https';
import promptSync from 'prompt-sync';
import { Pool, Client } from 'pg';

export interface PairValues {
  ask: string;
  bid: string;
  currency?: string;
}
export interface PairData {
  name: string;
  values: PairValues;
}

export interface ICurrencyPairs {
  getInterval(): number;
  getPercentage(): number;
  getPairs(): PairData[];
  setInterval(interval: number): void;
  setPercentage(percentage: number): void;
  addPair(pairName: string): void;
  resetPairs(): void;
  askForUserData(): void;
  requestPairData(): void;
  requestPairs(): void;
  run(): void;
}

export class CurrencyPairs implements ICurrencyPairs {
  private baseUrl: string = 'https://api.uphold.com/v0/ticker/';
  private interval: number = 5;
  private percentage: number = 0.01;
  private pairData: PairData[] = [CurrencyPairs.defaultData.pair];
  private db: Pool;

  static defaultData = {
    interval: 5,
    percentage: 0.01,
    pair: {
      name: 'BTC-USD',
      values: { ask: '0.0', bid: '0.0', currency: '' },
    },
  };

  constructor() {
    // reset console color
    console.log('\u001b[0m');

    try {
      if (process.env.IS_DOCKER) {
        this.db = new Pool({
          user: `${process.env.POSTGRES_USER}`,
          host: 'db',
          database: `${process.env.POSTGRES_DB}`,
          password: `${process.env.POSTGRES_PASSWORD}`,
          port: 5432,
        });
        this.db.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = 'currency_pairs';`,
          (err, res) => {
            if (!err && res.rows.length === 0) {
              this.db.query(
                `CREATE TABLE currency_pairs(id SERIAL PRIMARY KEY, alert VARCHAR(100), interval INT, percentage NUMERIC, created_at DATE NOT NULL DEFAULT CURRENT_DATE);`,
                (err, res) => {
                  console.log('==== CREATE ===');
                  console.log(err, res);
                }
              );
            }
          }
        );

        /* Uncomment the code below to see if any data exists in the database */

        // this.db.query(`SELECT * FROM currency_pairs;`, (err, res) => {
        //   if (!err) {
        //     if (res.rows.length > 0) {
        //       console.log(`Found ${res.rowCount} rows of data.`);
        //     } else {
        //       console.log('No data has been inserted yet.');
        //     }
        //   } else {
        //     console.log(
        //       'There was an error selecting data from the database =>',
        //       err
        //     );
        //   }
        // });
      }
    } catch (err) {
      console.log(
        'There was an error while trying to find or create the database =>',
        err
      );
    }
  }

  getInterval = (): number => {
    return this.interval;
  };

  getPercentage = (): number => {
    return this.percentage;
  };

  getPairs = (): PairData[] => {
    return this.pairData;
  };

  setInterval = (interval: number): void => {
    this.interval = interval;
  };

  setPercentage = (percentage: number): void => {
    this.percentage = percentage;
  };

  addPair = (pairName: string) => {
    if (pairName.indexOf('-') === -1) {
      pairName = `${pairName.substr(0, 3)}-${pairName.substr(3, 5)}`;
    }
    this.pairData.push({
      name: pairName.toUpperCase(),
      values: {
        ask: CurrencyPairs.defaultData.pair.values.ask,
        bid: CurrencyPairs.defaultData.pair.values.bid,
      },
    });
  };

  resetPairs = () => {
    this.pairData = [];
  };

  askForUserData = (): void => {
    // cyan
    console.log('\u001b[1;36m');

    this.resetPairs();

    const prompt = promptSync();
    try {
      const interval = prompt('What should the fetch interval be in seconds? ');
      this.interval = parseInt(interval);
      if (isNaN(this.interval)) {
        console.log(
          `Invalid interval entered, defaulting to ${CurrencyPairs.defaultData.interval}.\n`
        );
        this.interval = CurrencyPairs.defaultData.interval;
      }
    } catch (err) {
      console.log(
        `Invalid interval entered, defaulting to ${CurrencyPairs.defaultData.interval}.\n`
      );
      this.interval = CurrencyPairs.defaultData.interval;
    }

    try {
      const percentage = prompt('What should the oscillation percentage be? ');
      this.percentage = parseFloat(percentage);
      if (isNaN(this.percentage)) {
        console.log(
          `Invalid percentage entered, defaulting to ${CurrencyPairs.defaultData.percentage}.\n`
        );
        this.percentage = CurrencyPairs.defaultData.percentage;
      }
    } catch (err) {
      console.log(
        `Invalid percentage entered, defaulting to ${CurrencyPairs.defaultData.percentage}.\n`
      );
      this.percentage = CurrencyPairs.defaultData.percentage;
    }

    console.log(
      'Enter each currency pair to request data for (ex: BTC-USD). When finished entering pairs press enter, or type "done" or "exit".'
    );
    let pairName = '';
    while (pairName !== 'done' && pairName !== 'exit') {
      try {
        pairName = prompt('Currency pair: ');
        if (
          !pairName ||
          pairName.toLowerCase() === 'done' ||
          pairName.toLowerCase() === 'exit'
        ) {
          break;
        }
        this.addPair(pairName);
      } catch (err) {
        console.log(
          `Error trying to parse pair name: ${pairName}. Not added to list of pairs.`
        );
      }
    }

    if (!this.pairData.length) {
      console.log('No pairs were entered. Defaulting to BTC-USD.');
      this.pairData = [CurrencyPairs.defaultData.pair];
    }

    // yellow
    console.log('\u001b[1;33m');

    console.log(`\nInterval: ${this.interval}`);
    console.log(`Percentage: ${this.percentage}`);
    console.log(
      `Pairs: ${this.pairData.reduce((pairs, pair, idx) => {
        return idx === 0
          ? pairs.concat(pair.name)
          : pairs.concat(` ${pair.name}`);
      }, [])}`
    );
  };

  requestPairData = (): void => {
    // reset console color
    console.log('\u001b[0m');

    let changed = false;
    this.pairData.forEach((pair) => {
      https
        .get(`${this.baseUrl}${pair.name}`, (resp) => {
          let data = '';

          resp.on('data', (chunk) => {
            data += chunk;
          });

          // compare old values to new values
          resp.on('end', () => {
            const parsed: PairValues = JSON.parse(data);
            if (pair.values.ask !== '0.0' && pair.values.bid !== '0.0') {
              const oldAsk = parseFloat(pair.values.ask);
              const newAsk = parseFloat(parsed.ask);

              var diff = (100 * (oldAsk - newAsk)) / ((oldAsk + newAsk) / 2);

              if (this.percentage - Math.abs(diff) < 0) {
                changed = true;
                if (diff > 0) {
                  const msg = `${pair.name} price has gone up`;
                  console.log('\u001b[1;32m');
                  console.log(msg);

                  if (process.env.IS_DOCKER) {
                    this.db.query(
                      `INSERT INTO currency_pairs (alert, interval, percentage) VALUES ('${msg}', ${this.interval}, ${this.percentage});`
                    );
                  }
                } else {
                  const msg = `${pair.name} price has gone down`;
                  console.log('\u001b[1;31m');
                  console.log(msg);

                  if (process.env.IS_DOCKER) {
                    this.db.query(
                      `INSERT INTO currency_pairs (alert, interval, percentage) VALUES ('${msg}', ${this.interval}, ${this.percentage});`
                    );
                  }
                }
              }
            }
            // update the pair's values for next interval's comparison
            pair.values = { ...parsed };
          });
        })
        .on('error', (err) => {
          console.log('Error: ' + err.message);
        });
    });
    if (!changed) console.log('No change in pair data.');

    // reset console color
    console.log('\u001b[0m');
  };

  requestPairs = (): void => {
    this.requestPairData();
    setInterval(() => {
      this.requestPairData();
    }, this.interval * 1000);
  };

  run = (): void => {
    this.askForUserData();
    this.requestPairs();
  };
}

process.on('exit', (): void => {
  // reset console color
  console.log('\u001b[0m');
});
