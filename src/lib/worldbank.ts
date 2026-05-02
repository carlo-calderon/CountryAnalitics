export interface CountryHistory {
  id: string;
  name: string;
  region: string;
  history: Record<number, Record<string, number | null>>;
}

export const INDICATORS: Record<string, string> = {
  gini: 'SI.POV.GINI',
  gdpPpp: 'NY.GDP.PCAP.PP.CD',
  poverty: 'SI.POV.DDAY',
  debt: 'GC.DOD.TOTL.GD.ZS',
  health: 'SH.XPD.CHEX.GD.ZS',
  education: 'SE.XPD.TOTL.GD.ZS',
  lifeExpectancy: 'SP.DYN.LE00.IN',
  population: 'SP.POP.TOTL'
};

export const INDICATOR_NAMES: Record<string, string> = {
  gini: 'Índice de Gini',
  gdpPpp: 'PIB per cápita PPA (USD)',
  poverty: '% Pobreza ($2.15/día)',
  debt: '% Deuda Central / PIB',
  health: '% Gasto Salud / PIB',
  education: '% Gasto Educación / PIB',
  lifeExpectancy: 'Esperanza de Vida (Años)',
  population: 'Población Total'
};

export async function fetchWorldBankHistory(): Promise<CountryHistory[]> {
  const START_YEAR = 1960;
  const END_YEAR = 2024;
  
  try {
    // Fetch countries first
    const countriesRes = await fetch(`https://api.worldbank.org/v2/country?format=json&per_page=1000`);
    const countriesData = await countriesRes.json();
    if (!countriesData[1]) return [];

    const countriesMap: Record<string, CountryHistory> = {};
    countriesData[1].forEach((c: any) => {
      if (c.region && c.region.id !== 'NA') {
        countriesMap[c.id] = { id: c.id, name: c.name, region: c.region.value.trim(), history: {} };
      }
    });

    // Fetch all indicators in parallel
    const indicatorKeys = Object.keys(INDICATORS);
    const indicatorPromises = indicatorKeys.map(key => 
      fetch(`https://api.worldbank.org/v2/country/all/indicator/${INDICATORS[key]}?format=json&per_page=20000&date=${START_YEAR}:${END_YEAR}`)
        .then(res => res.json())
    );

    const results = await Promise.all(indicatorPromises);

    results.forEach((data, index) => {
      const key = indicatorKeys[index];
      if (data[1]) {
        data[1].forEach((item: any) => {
          const code = item.countryiso3code || item.country.id;
          if (countriesMap[code]) {
            const year = parseInt(item.date);
            if (!countriesMap[code].history[year]) {
              countriesMap[code].history[year] = {};
              indicatorKeys.forEach(k => countriesMap[code].history[year][k] = null);
            }
            // Safety filter for extreme outliers
            let val = item.value;
            if (key === 'gdpPpp' && val > 300000) val = null;
            countriesMap[code].history[year][key] = val;
          }
        });
      }
    });

    // Carry forward logic for all indicators
    Object.values(countriesMap).forEach(country => {
      const lastValues: Record<string, number | null> = {};
      indicatorKeys.forEach(k => lastValues[k] = null);

      for (let y = START_YEAR; y <= END_YEAR; y++) {
        if (!country.history[y]) {
          country.history[y] = { ...lastValues };
        } else {
          indicatorKeys.forEach(k => {
            if (country.history[y][k] !== null) lastValues[k] = country.history[y][k];
            else country.history[y][k] = lastValues[k];
          });
        }
      }
    });

    return Object.values(countriesMap).filter(c => {
      const years = Object.keys(c.history);
      // Keep countries that have at least some data in the last 20 years
      return years.some(y => parseInt(y) > 2000 && c.history[parseInt(y)].gdpPpp !== null);
    });

  } catch (error) {
    console.error('Error fetching World Bank history:', error);
    return [];
  }
}
